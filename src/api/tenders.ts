import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { api } from './client'
import { getNextPageParam, type PageMeta } from './pagination'
import type { Bid, JobPosting } from '../context'

interface BackendMilestone { _id: string; name: string; amount: number; status: string }
interface BackendProject {
  _id: string
  title: string
  description: string
  category: string
  locationName: string
  totalAmount: number
  status: string
  deadline: string | null
  createdAt: string
  milestones: BackendMilestone[]
  ownerId: { _id: string; fullName: string } | string
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

async function fetchBidCount(projectId: string): Promise<number> {
  const { data } = await api.get<{ meta: { total: number } }>('/bids', { params: { projectId, limit: 1 } })
  return data.meta.total
}

function mapJob(doc: BackendProject, bidCount: number): JobPosting {
  return {
    id: doc._id,
    title: doc.title,
    category: doc.category || 'General',
    location: doc.locationName || '',
    budget: doc.totalAmount,
    deadline: formatDeadline(doc.deadline),
    bids: bidCount,
    milestones: doc.milestones?.length || 1,
    posted: formatPosted(doc.createdAt),
    description: doc.description || '',
    status: mapTenderStatus(doc.status),
    ownerId: typeof doc.ownerId === 'object' ? doc.ownerId._id : doc.ownerId,
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
 * backend's default page size. */
export function useJobsInfiniteQuery(limit = 10) {
  return useInfiniteQuery({
    queryKey: ['jobs', 'infinite'],
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<{ items: JobPosting[]; meta: PageMeta }> => {
      const { data } = await api.get<{ data: BackendProject[]; meta: PageMeta }>('/projects', { params: { projectType: 'tender', page: pageParam, limit } })
      const counts = await Promise.all(data.data.map((p) => fetchBidCount(p._id)))
      return { items: data.data.map((p, i) => mapJob(p, counts[i])), meta: data.meta }
    },
    initialPageParam: 1,
    getNextPageParam,
    staleTime: 10_000,
  })
}

export interface CreateJobInput {
  title: string
  category: string
  location: string
  budget: number
  deadline: string
  milestoneCount: number
  description: string
}

export function useCreateJobMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (j: CreateJobInput): Promise<JobPosting> => {
      const perMilestone = Math.round(j.budget / Math.max(1, j.milestoneCount))
      const milestones = Array.from({ length: Math.max(1, j.milestoneCount) }, (_, i) => ({
        name: `Milestone ${i + 1}`,
        amount: i === j.milestoneCount - 1 ? j.budget - perMilestone * (j.milestoneCount - 1) : perMilestone,
        orderIndex: i,
      }))
      const { data } = await api.post<{ data: BackendProject }>('/projects', {
        projectType: 'tender',
        title: j.title,
        description: j.description,
        category: j.category,
        locationName: j.location,
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

export interface CreateBidInput {
  jobId: string
  price: number
  timeline: string
  materials: string
  notes: string
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
      })
      return mapBid(data.data, '')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bids'] })
      qc.invalidateQueries({ queryKey: ['jobs'] })
    },
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
