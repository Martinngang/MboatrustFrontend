import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { fetchRatingSummary } from './reputation'
import type { Milestone, MilestoneApprover, MilestoneEvidence, Project } from '../context'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=220&fit=crop&auto=format'

// ── Backend document shapes (only the fields we read/write) ────────────────
interface BackendApprover {
  userId: { _id: string; fullName: string } | string
  status: 'pending' | 'approved' | 'rejected'
}
interface BackendEvidence {
  _id: string
  type: string
  fileUrl: string
  notes: string
  geotag: { lat: number | null; lng: number | null } | null
  capturedAt: string | null
  createdAt: string
  fileHash: string
  locationMatch: boolean | null
  timestampRecent: boolean | null
  duplicateFlag: boolean
}
interface BackendMilestone {
  _id: string
  name: string
  amount: number
  status: string
  evidence: BackendEvidence[]
  requiresCosigner: boolean
  requiresVideo: boolean
  approvers: BackendApprover[]
}
interface BackendProject {
  _id: string
  title: string
  description: string
  category: string
  locationName: string
  location: { lat: number | null; lng: number | null }
  imageUrl: string
  totalAmount: number
  status: string
  ownerId: { _id: string; fullName: string } | string
  milestones: BackendMilestone[]
  requiresMultiSig: boolean
  coSignerId: { _id: string; fullName: string } | string | null
}
interface FundingSummary {
  raised: number
  released: number
  escrowBalance: number
}

/** Backend's real state machine (draft/open/funded/in_progress/completed/
 * disputed/cancelled) collapses to the smaller vocabulary the existing UI
 * already branches on ('active'/'completed'/'disputed'/'cancelled') — this
 * keeps every pre-existing `project.status === 'active'` check working
 * unchanged rather than editing each call site. */
function mapProjectStatus(status: string): string {
  if (status === 'funded' || status === 'in_progress') return 'active'
  return status
}

function mapApprover(a: BackendApprover): MilestoneApprover {
  return {
    userId: typeof a.userId === 'object' ? a.userId._id : a.userId,
    userName: typeof a.userId === 'object' ? a.userId.fullName : 'Approver',
    status: a.status,
  }
}

function mapEvidence(e: BackendEvidence): MilestoneEvidence {
  return {
    id: e._id,
    type: e.type,
    fileUrl: e.fileUrl,
    notes: e.notes || null,
    geotag: e.geotag && e.geotag.lat != null && e.geotag.lng != null ? { lat: e.geotag.lat, lng: e.geotag.lng } : null,
    capturedAt: e.capturedAt ?? e.createdAt,
    locationMatch: e.locationMatch,
    timestampRecent: e.timestampRecent,
    duplicateFlag: e.duplicateFlag,
  }
}

function mapMilestone(m: BackendMilestone): Milestone {
  return {
    id: m._id,
    title: m.name,
    amount: m.amount,
    status: m.status,
    proof: (m.evidence?.length ?? 0) > 0,
    evidence: (m.evidence || []).map(mapEvidence),
    requiresCosigner: m.requiresCosigner,
    requiresVideo: m.requiresVideo,
    approvers: (m.approvers || []).map(mapApprover),
  }
}

function mapProject(doc: BackendProject, funding: FundingSummary | undefined, recipientRating: number): Project {
  return {
    id: doc._id,
    title: doc.title,
    category: doc.category || 'General',
    location: doc.locationName || '',
    totalAmount: doc.totalAmount,
    raised: funding?.raised ?? 0,
    status: mapProjectStatus(doc.status),
    recipient: typeof doc.ownerId === 'object' ? doc.ownerId.fullName : 'Unknown',
    recipientId: typeof doc.ownerId === 'object' ? doc.ownerId._id : doc.ownerId,
    recipientRating,
    milestones: (doc.milestones || []).map(mapMilestone),
    image: doc.imageUrl || DEFAULT_IMAGE,
    description: doc.description || '',
    // Backend has no deadline field yet — 0 once complete, a flat placeholder
    // otherwise, rather than fabricating a fake countdown.
    daysLeft: doc.status === 'completed' ? 0 : 30,
    requiresMultiSig: doc.requiresMultiSig,
    coSignerId: doc.coSignerId ? (typeof doc.coSignerId === 'object' ? doc.coSignerId._id : doc.coSignerId) : undefined,
    coSignerName: doc.coSignerId && typeof doc.coSignerId === 'object' ? doc.coSignerId.fullName : undefined,
  }
}

async function fetchFundingSummary(id: string): Promise<FundingSummary> {
  const { data } = await api.get<{ data: FundingSummary }>(`/projects/${id}/funding-summary`)
  return data.data
}

// A brand new owner with zero ratings yet shouldn't display as "0 stars" —
// a neutral 4.5 is a reasonable prior until they earn real ratings.
const NEW_OWNER_RATING = 4.5

export function useProjectsQuery() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      const { data } = await api.get<{ data: BackendProject[] }>('/projects', { params: { projectType: 'funding' } })
      const [fundings, ratings] = await Promise.all([
        Promise.all(data.data.map((p) => fetchFundingSummary(p._id))),
        Promise.all(data.data.map((p) => (typeof p.ownerId === 'object' ? fetchRatingSummary(p.ownerId._id) : Promise.resolve({ average: null, count: 0 })))),
      ])
      return data.data.map((p, i) => mapProject(p, fundings[i], ratings[i].average ?? NEW_OWNER_RATING))
    },
    staleTime: 10_000,
  })
}

/** Single-project fetch by id, any projectType (funding or tender) — used
 * where a screen already knows exactly which project it needs (e.g. a
 * contract's underlying tender project) rather than filtering the funding-
 * only list useProjectsQuery returns. Funding/rating aren't fetched since
 * callers needing milestone/approver detail don't render those fields. */
export function useProjectQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async (): Promise<Project> => {
      const { data } = await api.get<{ data: BackendProject }>(`/projects/${id}`)
      return mapProject(data.data, undefined, 0)
    },
    enabled: Boolean(id),
    staleTime: 10_000,
  })
}

function isHttpUrl(s: string | undefined): s is string {
  return Boolean(s && /^https?:\/\//.test(s))
}

export function useCreateProjectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: Omit<Project, 'id'>): Promise<Project> => {
      const { data } = await api.post<{ data: BackendProject }>('/projects', {
        projectType: 'funding',
        title: p.title,
        description: p.description,
        category: p.category,
        locationName: p.location,
        totalAmount: p.totalAmount,
        ...(isHttpUrl(p.image) ? { imageUrl: p.image } : {}),
        milestones: p.milestones.map((m, i) => ({ name: m.title, amount: m.amount, orderIndex: i, requiresCosigner: m.requiresCosigner, requiresVideo: m.requiresVideo })),
      })
      return mapProject(data.data, { raised: 0, released: 0, escrowBalance: 0 }, NEW_OWNER_RATING)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export interface FundProjectInput {
  id: string
  amount: number
  paymentProvider: 'mtn_momo' | 'orange_money'
  payerPhoneNumber: string
}

export function useFundProjectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount, paymentProvider, payerPhoneNumber }: FundProjectInput) => {
      const { data } = await api.post(
        `/projects/${id}/fund`,
        { amount, paymentProvider, payerPhoneNumber },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } }
      )
      return data.data as { paymentUrl?: string; status: string }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

/** Adds an existing, already-registered user as the project's one co-signer
 * (Project.coSignerId is a single field, not a list — see the model). Only
 * the project owner may call this; the backend rejects a non-existent user
 * id or the owner naming themselves. */
export function useAddCoSignerMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, coSignerId }: { projectId: string; coSignerId: string }) => {
      const { data } = await api.post<{ data: BackendProject }>(`/projects/${projectId}/co-signer`, { coSignerId })
      return mapProject(data.data, undefined, 0)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export interface SubmitEvidenceInput {
  projectId: string
  milestoneId: string
  file?: File
  fileUrl?: string
  geotag?: { lat: number; lng: number } | null
  notes?: string
}

export function useSubmitEvidenceMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, milestoneId, file, fileUrl, geotag, notes }: SubmitEvidenceInput) => {
      const form = new FormData()
      form.append('type', 'photo')
      if (file) form.append('file', file)
      if (fileUrl) form.append('fileUrl', fileUrl)
      if (geotag) {
        form.append('geotagLat', String(geotag.lat))
        form.append('geotagLng', String(geotag.lng))
      }
      if (notes) form.append('notes', notes)
      const { data } = await api.post(`/projects/${projectId}/milestones/${milestoneId}/evidence`, form)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDecideApprovalMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, milestoneId, status }: { projectId: string; milestoneId: string; status: 'approved' | 'rejected' }) => {
      const { data } = await api.post<{ data: { project: BackendProject; releasedEscrow: unknown } }>(
        `/projects/${projectId}/milestones/${milestoneId}/approval`,
        { status },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } }
      )
      // Only the milestone/approver state is needed by callers — funding
      // totals/rating aren't relevant to an approval decision's result.
      return { project: mapProject(data.data.project, undefined, 0), releasedEscrow: data.data.releasedEscrow }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

/** Only legal while the project has never received funds or awarded a bid
 * (backend enforces this — 409s otherwise). There is no generic "set any
 * status" endpoint; completion/dispute states are only ever a side effect of
 * the real milestone-approval/dispute flows, never a direct flip. */
export function useCancelProjectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: BackendProject }>(`/projects/${id}/cancel`, {})
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDisputeMilestoneMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, milestoneId, reason }: { projectId: string; milestoneId?: string; reason: string }) => {
      const path = milestoneId ? `/projects/${projectId}/milestones/${milestoneId}/dispute` : `/projects/${projectId}/dispute`
      const { data } = await api.post(path, { reason })
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
