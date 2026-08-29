import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { api } from './client'
import { getNextPageParam, type PageMeta } from './pagination'
import type { Bid, BidNegotiationRound, BidScheduleMilestone, JobPosting } from '../context'

interface BackendMilestone { _id: string; name: string; amount: number; status: string }
interface BackendProject {
  _id: string
  title: string
  description: string
  category: string
  locationName: string
  location?: { lat: number | null; lng: number | null }
  totalAmount: number
  status: string
  deadline: string | null
  createdAt: string
  milestones: BackendMilestone[]
  ownerId: { _id: string; fullName: string } | string
  materialsManagedBy?: 'contractor' | 'quincaillerie'
  preferredQuincaillerieId?: string | null
}
interface BackendMilestoneProposal { title: string; description: string; amount: number }
interface BackendNegotiationRound {
  proposedBy: 'funder' | 'contractor'
  price: number
  timelineDays: number
  milestones: BackendMilestoneProposal[]
  message: string
  createdAt: string
}
interface BackendBid {
  _id: string
  projectId: string
  contractorId: { _id: string; fullName: string } | string
  price: number
  timelineDays: number
  materialsPlan: string
  notes: string
  status: string
  createdAt: string
  milestones?: BackendMilestoneProposal[]
  rounds?: BackendNegotiationRound[]
  lastProposedBy?: 'funder' | 'contractor'
}

function mapTenderStatus(status: string): string {
  // Existing UI checks job.status === 'open' / 'awarded' / 'closed' (see
  // MobileLayout's STATUS_MAP and WorkspaceJobsScreen's board columns).
  if (status === 'in_progress' || status === 'funded') return 'awarded'
  if (status === 'completed' || status === 'cancelled') return 'closed'
  return status // draft/open/disputed pass through
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return 'TBD'
  return new Date(deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatPosted(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
  if (days <= 0) return 'Just now'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

// Swallows failures instead of letting them propagate — this runs inside a
// Promise.all in useJobsQuery below, and an unrelated transient failure on
// any single project's count (e.g. a request that raced ahead of the
// dev-bypass identity resolving on first load) used to reject the whole
// batch, permanently emptying `jobs` for the rest of the session since
// nothing ever re-triggers that fetch afterward. A wrong count temporarily
// showing 0 is a much smaller problem than the entire job list disappearing.
async function fetchBidCount(projectId: string): Promise<number> {
  try {
    const { data } = await api.get<{ meta: { total: number } }>('/bids', { params: { projectId, limit: 1 } })
    return data.meta.total
  } catch {
    return 0
  }
}

function mapJob(doc: BackendProject, bidCount: number): JobPosting {
  return {
    id: doc._id,
    title: doc.title,
    category: doc.category || 'General',
    location: doc.locationName || '',
    coordinates: doc.location?.lat != null && doc.location?.lng != null ? { lat: doc.location.lat, lng: doc.location.lng } : null,
    budget: doc.totalAmount,
    deadline: formatDeadline(doc.deadline),
    bids: bidCount,
    milestones: doc.milestones?.length || 1,
    posted: formatPosted(doc.createdAt),
    description: doc.description || '',
    status: mapTenderStatus(doc.status),
    ownerId: typeof doc.ownerId === 'object' ? doc.ownerId._id : doc.ownerId,
    materialsManagedBy: doc.materialsManagedBy ?? 'contractor',
    preferredQuincaillerieId: doc.preferredQuincaillerieId ?? null,
  }
}

export function useJobsQuery() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async (): Promise<JobPosting[]> => {
      const { data } = await api.get<{ data: BackendProject[] }>('/projects', { params: { projectType: 'tender' } })
      const counts = await Promise.all(data.data.map((p) => fetchBidCount(p._id)))
      return data.data.map((p, i) => mapJob(p, counts[i]))
    },
    staleTime: 10_000,
  })
}

/** Paginated feed for BrowseJobsScreen specifically — useJobsQuery above
 * stays as-is (used broadly for dashboards/workspace boards that
 * legitimately want the full small dataset); only the high-traffic browse
 * screen needs real "load more" instead of silently capping at the
 * backend's default page size. Defaults to open-only: a contractor
 * browsing for work to bid on should never see an already-awarded or
 * closed tender mixed into the results — those aren't "eligible tenders"
 * any more, even though they're still projectType 'tender'. */
export function useJobsInfiniteQuery(limit = 10, status: string | undefined = 'open') {
  return useInfiniteQuery({
    queryKey: ['jobs', 'infinite', status],
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<{ items: JobPosting[]; meta: PageMeta }> => {
      const { data } = await api.get<{ data: BackendProject[]; meta: PageMeta }>('/projects', { params: { projectType: 'tender', status, page: pageParam, limit } })
      const counts = await Promise.all(data.data.map((p) => fetchBidCount(p._id)))
      return { items: data.data.map((p, i) => mapJob(p, counts[i])), meta: data.meta }
    },
    initialPageParam: 1,
    getNextPageParam,
    staleTime: 10_000,
  })
}

/** A funder's own posted tenders — scoped by ownerId, same convention as
 * api/projects.ts's useMyProjectsQuery for the funding side. Without this,
 * the only tender queries available were platform-wide (useJobsQuery/
 * useJobsInfiniteQuery, no ownerId param at all) — a funder posting a
 * tender had no scoped list that would ever show it back to them. */
export function useMyTendersQuery(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['jobs', 'mine', ownerId],
    queryFn: async (): Promise<JobPosting[]> => {
      const { data } = await api.get<{ data: BackendProject[] }>('/projects', { params: { projectType: 'tender', ownerId } })
      const counts = await Promise.all(data.data.map((p) => fetchBidCount(p._id)))
      return data.data.map((p, i) => mapJob(p, counts[i]))
    },
    enabled: Boolean(ownerId),
    staleTime: 10_000,
  })
}

export interface CreateJobInput {
  title: string
  category: string
  location: string
  coordinates?: { lat: number; lng: number } | null
  budget: number
  deadline: string
  milestoneCount: number
  description: string
  /** A funder-defined payment schedule (weekly or otherwise) — each entry
   * becomes one real Project milestone with its own label, amount, and
   * work description. Falls back to an even auto-split across
   * milestoneCount when omitted, the original PostJobScreen behavior. */
  milestoneSchedule?: { title: string; amount: number; description: string }[]
}

// Every new tender starts contractor-managed (Project.materialsManagedBy's
// schema default) — a materials supplier is assigned afterwards via
// useAssignQuincaillerieMutation (api/projects.ts), once the funder has had
// a chance to actually browse/compare real stores, not forced into the pick
// at creation time.
export function useCreateJobMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (j: CreateJobInput): Promise<JobPosting> => {
      let milestones
      if (j.milestoneSchedule?.length) {
        milestones = j.milestoneSchedule.map((m, i) => ({ name: m.title, amount: m.amount, description: m.description, orderIndex: i }))
      } else {
        const perMilestone = Math.round(j.budget / Math.max(1, j.milestoneCount))
        milestones = Array.from({ length: Math.max(1, j.milestoneCount) }, (_, i) => ({
          name: `Milestone ${i + 1}`,
          amount: i === j.milestoneCount - 1 ? j.budget - perMilestone * (j.milestoneCount - 1) : perMilestone,
          orderIndex: i,
        }))
      }
      const { data } = await api.post<{ data: BackendProject }>('/projects', {
        projectType: 'tender',
        title: j.title,
        description: j.description,
        category: j.category,
        locationName: j.location,
        ...(j.coordinates ? { location: j.coordinates } : {}),
        totalAmount: j.budget,
        ...(j.deadline ? { deadline: j.deadline } : {}),
        milestones,
      })
      return mapJob(data.data, 0)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })
}

/** Only legal while the tender hasn't awarded a bid yet ('open'/'draft' —
 * shown to the UI as job.status 'open'). The backend auto-rejects any bids
 * still pending on it. There is no way to "close" an already-awarded
 * tender from here — that's a real contract, handled by the contract
 * lifecycle (complete/terminate), not a status flip. */
export function useCancelJobMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: BackendProject }>(`/projects/${id}/cancel`, {})
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['bids'] })
    },
  })
}

// ── Bids ─────────────────────────────────────────────────────────────────
function parseTimelineDays(timeline: string): number {
  const n = parseInt(timeline, 10)
  if (!Number.isFinite(n) || n <= 0) return 30
  return /week/i.test(timeline) ? n * 7 : n
}
function formatTimelineDays(days: number): string {
  if (days % 7 === 0) return `${days / 7} week${days === 7 ? '' : 's'}`
  return `${days} days`
}

function mapRound(r: BackendNegotiationRound): BidNegotiationRound {
  return { proposedBy: r.proposedBy, price: r.price, timelineDays: r.timelineDays, milestones: r.milestones ?? [], message: r.message ?? '', createdAt: r.createdAt }
}

function mapBid(doc: BackendBid, jobTitle: string): Bid {
  return {
    id: doc._id,
    jobId: doc.projectId,
    jobTitle,
    contractorName: typeof doc.contractorId === 'object' ? doc.contractorId.fullName : 'Contractor',
    contractorId: typeof doc.contractorId === 'object' ? doc.contractorId._id : doc.contractorId,
    price: doc.price,
    timeline: formatTimelineDays(doc.timelineDays),
    materials: doc.materialsPlan,
    notes: doc.notes,
    status: doc.status === 'submitted' ? 'pending' : doc.status,
    submitted: new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    milestones: (doc.milestones ?? []).map((m) => ({ title: m.title, description: m.description ?? '', amount: m.amount })),
    rounds: (doc.rounds ?? []).map(mapRound),
    lastProposedBy: doc.lastProposedBy ?? 'contractor',
  }
}

/** Bids the current user placed (as contractor) or received (as tender owner, via projectId). */
export function useBidsQuery(filter: { projectId?: string; contractorId?: string } = {}) {
  return useQuery({
    queryKey: ['bids', filter],
    queryFn: async (): Promise<Bid[]> => {
      const { data } = await api.get<{ data: BackendBid[] }>('/bids', { params: filter })
      const jobIds = [...new Set(data.data.map((b) => b.projectId))]
      const jobTitles = new Map<string, string>()
      await Promise.all(
        jobIds.map(async (id) => {
          try {
            const { data: proj } = await api.get<{ data: BackendProject }>(`/projects/${id}`)
            jobTitles.set(id, proj.data.title)
          } catch {
            jobTitles.set(id, '')
          }
        })
      )
      return data.data.map((b) => mapBid(b, jobTitles.get(b.projectId) ?? ''))
    },
    staleTime: 10_000,
  })
}

/** A single bid by id, real-time-ish for the negotiation screen (both
 * parties poll this while a live back-and-forth is happening) — party
 * access is enforced server-side (bidController.getOne: owner or bidder
 * only, admin bypass). */
export function useBidQuery(bidId: string | undefined) {
  return useQuery({
    queryKey: ['bids', 'one', bidId],
    queryFn: async (): Promise<Bid> => {
      const { data } = await api.get<{ data: BackendBid }>(`/bids/${bidId}`)
      let jobTitle = ''
      try {
        const { data: proj } = await api.get<{ data: BackendProject }>(`/projects/${data.data.projectId}`)
        jobTitle = proj.data.title
      } catch { /* left blank — a missing project shouldn't fail the whole bid view */ }
      return mapBid(data.data, jobTitle)
    },
    enabled: Boolean(bidId),
    staleTime: 5_000,
    refetchInterval: 8_000,
  })
}

export interface CreateBidInput {
  jobId: string
  price: number
  timeline: string
  materials: string
  notes: string
  /** An optional opening payment schedule — becomes rounds[0]'s milestones.
   * Empty/omitted means a lump-sum quote, same as before this existed. */
  milestones?: BidScheduleMilestone[]
}

export function useCreateBidMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (b: CreateBidInput): Promise<Bid> => {
      const { data } = await api.post<{ data: BackendBid }>('/bids', {
        projectId: b.jobId,
        price: b.price,
        timelineDays: parseTimelineDays(b.timeline),
        materialsPlan: b.materials,
        notes: b.notes,
        milestones: b.milestones ?? [],
      })
      return mapBid(data.data, '')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bids'] })
      qc.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

/** Either real party to the negotiation (the tender owner or the bidder)
 * appends a new round — see bidController.counter. Unlimited rounds, not
 * strictly alternating: whoever wants to move the number does. */
export function useCounterBidMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ bidId, price, timelineDays, milestones, message }: {
      bidId: string; price: number; timelineDays: number; milestones?: BidScheduleMilestone[]; message?: string
    }): Promise<Bid> => {
      const { data } = await api.post<{ data: BackendBid }>(`/bids/${bidId}/counter`, {
        price, timelineDays, milestones: milestones ?? [], message: message ?? '',
      })
      return mapBid(data.data, '')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bids'] }),
  })
}

export function useUpdateBidStatusMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ bidId, status }: { bidId: string; status: 'accepted' | 'rejected' | 'withdrawn' }) => {
      const { data } = await api.patch(
        `/bids/${bidId}/status`,
        { status },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } }
      )
      return data.data as { bid: BackendBid; contract: { _id: string; generatedDocumentText: string } | null }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bids'] })
      qc.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}
