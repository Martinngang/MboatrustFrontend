import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { IconName } from '../components/icons'

export type ActivityType =
  | 'milestone_approved' | 'milestone_disputed' | 'milestone_submitted'
  | 'project_funded' | 'project_created' | 'project_status_changed'
  | 'bid_placed' | 'listing_created' | 'offer_made'

export interface ActivityEvent {
  id: string
  type: ActivityType
  icon: IconName
  title: string
  detail?: string
  path?: string
  time: string
}

interface BackendActivityEvent {
  type: ActivityType
  path?: string
  createdAt: string
  projectTitle?: string
  milestoneName?: string
  amount?: number
  currency?: string
  reason?: string
}

// Same "XAF 1,400,000" style as context.tsx's fmt() — duplicated locally
// rather than imported, matching every other api/*.ts file's own small
// formatting helpers (see formatDeadline/formatPosted in api/tenders.ts)
// instead of a runtime cross-import from context.tsx.
function fmt(n: number, currency = 'XAF') {
  return `${currency} ${n.toLocaleString('fr-FR')}`
}

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return '1 week ago'
  return `${weeks} weeks ago`
}

const TITLES: Record<ActivityType, string> = {
  project_created: 'Project created', // overridden below for tenders
  project_funded: 'Funds secured',
  milestone_submitted: 'Proof submitted',
  milestone_approved: 'Milestone approved',
  milestone_disputed: 'Dispute raised',
  project_status_changed: 'Project updated',
  bid_placed: 'Bid placed',
  listing_created: 'Land listing created',
  offer_made: 'Offer made',
}

function mapEvent(e: BackendActivityEvent, index: number): ActivityEvent {
  const isTenderProject = e.type === 'project_created' && e.path?.startsWith('/contractor/')
  const icon: IconName =
    e.type === 'project_created' ? (isTenderProject ? 'clipboard' : 'folder')
    : e.type === 'project_funded' ? 'lock'
    : e.type === 'milestone_submitted' ? 'camera'
    : e.type === 'milestone_approved' ? 'checkCircle'
    : e.type === 'milestone_disputed' ? 'flag'
    : e.type === 'bid_placed' ? 'clipboard'
    : e.type === 'listing_created' ? 'home'
    : 'bell'

  let detail: string | undefined
  if (e.type === 'project_funded') detail = e.projectTitle ? `${fmt(e.amount ?? 0, e.currency)} moved into escrow for ${e.projectTitle}` : fmt(e.amount ?? 0, e.currency)
  else if (e.type === 'milestone_approved') detail = e.projectTitle && e.milestoneName ? `${e.milestoneName} — ${e.projectTitle} · ${fmt(e.amount ?? 0, e.currency)} released` : undefined
  else if (e.type === 'milestone_submitted') detail = e.projectTitle && e.milestoneName ? `${e.milestoneName} — ${e.projectTitle}` : undefined
  else if (e.type === 'milestone_disputed') detail = e.projectTitle ? `${e.reason} — ${e.projectTitle}` : e.reason
  else if (e.type === 'bid_placed') detail = e.projectTitle ? `${fmt(e.amount ?? 0, e.currency)} for ${e.projectTitle}` : fmt(e.amount ?? 0, e.currency)
  else detail = e.projectTitle

  return {
    id: `${e.type}-${e.createdAt}-${index}`,
    type: e.type,
    icon,
    title: e.type === 'project_created' && isTenderProject ? 'Tender posted' : TITLES[e.type],
    detail,
    path: e.path,
    time: formatRelativeTime(e.createdAt),
  }
}

/** Real, per-user activity feed — every event is derived server-side from
 * this account's own Project/Bid/LandListing/Escrow/Dispute documents
 * (see activityService.js on the backend), never a shared or seeded list.
 * Replaces the old client-only ActivityLogProvider, whose hardcoded
 * SEED_EVENTS meant every user — including one who'd just signed up — saw
 * the exact same fake feed. */
export function useActivityQuery(enabled = true) {
  return useQuery({
    queryKey: ['activity'],
    queryFn: async (): Promise<ActivityEvent[]> => {
      const { data } = await api.get<{ data: BackendActivityEvent[] }>('/activity/mine')
      return data.data.map(mapEvent)
    },
    enabled,
    staleTime: 10_000,
  })
}
