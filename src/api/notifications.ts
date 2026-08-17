import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { AppNotification, NotifCategory } from '../context'
import type { StatusTone } from '../components/tokens'
import type { IconName } from '../components/icons'

// Avoids importing `fmt` from context.tsx here — context.tsx itself imports
// this module's hooks, and a real (non-type-only) import back would create
// a circular dependency between the two.
function fmt(n: number) {
  return 'XAF ' + n.toLocaleString('fr-FR')
}

interface BackendNotification {
  _id: string
  type: string
  payload: Record<string, unknown>
  read: boolean
  createdAt: string
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

type Described = {
  icon: IconName
  category: NotifCategory
  title: string
  body: string
  stat?: { label: string; tone: StatusTone }
  path?: string
}

const STATUS_LABEL: Record<string, string> = {
  released: 'Released', approved: 'Approved', disputed: 'Disputed', under_review: 'Under review',
  accepted: 'Accepted', rejected: 'Rejected', withdrawn: 'Withdrawn',
}
const STATUS_TONE: Record<string, StatusTone> = {
  released: 'success', approved: 'success', accepted: 'success',
  disputed: 'error', rejected: 'error',
  under_review: 'warning', withdrawn: 'neutral',
}

/** Every `notificationService.notify(...)` call site in the backend, mapped
 * to how it should render on the Notifications page — the backend only
 * stores {type, payload} by design (see notificationService.js), so this is
 * the one place that turns that into something a person reads, filters by,
 * and can act on (`path` is where the card's "View" action goes). */
function describe(n: BackendNotification): Described {
  const p = n.payload
  const statusLabel = (s: unknown) => STATUS_LABEL[String(s)] ?? String(s)
  const statusTone = (s: unknown): StatusTone => STATUS_TONE[String(s)] ?? 'neutral'

  switch (n.type) {
    case 'project_funded':
      return {
        icon: 'lock', category: 'funding', title: 'Funds secured',
        body: 'Your contribution moved into escrow for this project.',
        stat: { label: fmt(Number(p.amount) || 0), tone: 'success' },
        path: p.projectId ? `/funder/project/${p.projectId}` : undefined,
      }
    case 'milestone_evidence_submitted':
      return {
        icon: 'camera', category: 'milestones', title: 'Proof submitted',
        body: 'Milestone evidence was submitted and is ready for your review.',
        path: p.projectId ? `/funder/review/${p.projectId}` : undefined,
      }
    case 'milestone_decision':
      return {
        icon: p.status === 'released' ? 'checkCircle' : p.status === 'disputed' ? 'flag' : 'refresh',
        category: 'milestones', title: 'Milestone update',
        body: `Milestone status changed to "${statusLabel(p.status).toLowerCase()}".`,
        stat: { label: statusLabel(p.status), tone: statusTone(p.status) },
        path: p.projectId ? `/funder/project/${p.projectId}` : undefined,
      }
    case 'bid_received':
      return {
        icon: 'clipboard', category: 'marketplace', title: 'New bid received',
        body: 'A contractor placed a bid on your tender.',
        path: p.projectId ? `/funder/tender/${p.projectId}/bids` : undefined,
      }
    case 'bid_status_changed':
      return {
        icon: p.status === 'accepted' ? 'celebrate' : 'clipboard', category: 'marketplace', title: 'Bid update',
        body: `Your bid was ${statusLabel(p.status).toLowerCase()}.`,
        stat: { label: statusLabel(p.status), tone: statusTone(p.status) },
        path: '/contractor/bids',
      }
    case 'land_purchase_started':
      return {
        icon: 'home', category: 'marketplace', title: 'Purchase started',
        body: 'A buyer started a purchase on your land listing.',
        path: p.listingId ? `/land/listing/${p.listingId}` : undefined,
      }
    case 'verification_assigned':
      return {
        icon: 'compass', category: 'verification', title: 'New verification assignment',
        body: 'You have been assigned a new on-site verification task.',
        path: p.taskId ? `/verifier/task/${p.taskId}` : undefined,
      }
    case 'new_message':
      return {
        icon: 'message', category: 'messages', title: 'New message',
        body: 'You have a new message.',
        path: p.conversationId ? `/messages/${p.conversationId}` : undefined,
      }
    case 'dispute_raised':
      return {
        icon: 'flag', category: 'milestones', title: 'Dispute raised',
        body: 'A dispute was raised on one of your projects.',
        stat: { label: 'Disputed', tone: 'error' },
        path: p.projectId ? `/funder/project/${p.projectId}` : undefined,
      }
    case 'dispute_resolved':
      return {
        icon: 'checkCircle', category: 'milestones', title: 'Dispute resolved',
        body: `Your dispute was marked "${statusLabel(p.status).toLowerCase()}".`,
        stat: { label: statusLabel(p.status), tone: statusTone(p.status) },
        path: p.projectId ? `/funder/project/${p.projectId}` : undefined,
      }
    default:
      return { icon: 'bell', category: 'messages', title: n.type.replace(/_/g, ' '), body: '' }
  }
}

function mapNotification(n: BackendNotification): AppNotification {
  const { icon, category, title, body, stat, path } = describe(n)
  return { id: n._id, icon, category, title, body, stat, path, time: timeAgo(n.createdAt), unread: !n.read }
}

export function useNotificationsQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<{ items: AppNotification[]; unreadCount: number }> => {
      const { data } = await api.get<{ data: BackendNotification[]; meta: { unreadCount: number } }>('/notifications')
      return { items: data.data.map(mapNotification), unreadCount: data.meta.unreadCount }
    },
    enabled,
    staleTime: 10_000,
    refetchInterval: 30_000,
  })
}

export function useMarkNotificationReadMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/notifications/${id}/read`)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllNotificationsReadMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch('/notifications/read-all')
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
