import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { AppNotification } from '../context'

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

/** Every `notificationService.notify(...)` call site in the backend, mapped
 * to a display icon/title/body — the backend only stores {type, payload},
 * by design (see notificationService.js), so this is the one place that
 * turns that into something a person reads. */
function describe(n: BackendNotification): { icon: string; title: string; body: string } {
  switch (n.type) {
    case 'project_funded':
      return { icon: '🔒', title: 'Funds secured', body: `${fmt(Number(n.payload.amount) || 0)} moved into escrow.` }
    case 'milestone_evidence_submitted':
      return { icon: '📸', title: 'Proof submitted', body: 'Milestone evidence was submitted and is ready for your review.' }
    case 'milestone_decision':
      return { icon: n.payload.status === 'released' ? '✅' : n.payload.status === 'disputed' ? '🚩' : '🔄', title: 'Milestone update', body: `Milestone status changed to "${n.payload.status}".` }
    case 'bid_received':
      return { icon: '📋', title: 'New bid received', body: 'A contractor placed a bid on your tender.' }
    case 'bid_status_changed':
      return { icon: n.payload.status === 'accepted' ? '🎉' : '📋', title: 'Bid update', body: `Your bid was ${n.payload.status}.` }
    case 'land_purchase_started':
      return { icon: '🏡', title: 'Purchase started', body: 'A buyer started a purchase on your land listing.' }
    case 'verification_assigned':
      return { icon: '🧭', title: 'New verification assignment', body: 'You have been assigned a new on-site verification task.' }
    case 'new_message':
      return { icon: '💬', title: 'New message', body: 'You have a new message.' }
    default:
      return { icon: '🔔', title: n.type.replace(/_/g, ' '), body: '' }
  }
}

function mapNotification(n: BackendNotification): AppNotification {
  const { icon, title, body } = describe(n)
  return { id: n._id, icon, title, body, time: timeAgo(n.createdAt), unread: !n.read }
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
