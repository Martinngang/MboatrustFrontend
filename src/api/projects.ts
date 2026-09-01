import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { api } from './client'
import { getNextPageParam, type PageMeta } from './pagination'
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
  placeName: string | null
  capturedAt: string | null
  createdAt: string
  fileHash: string
  locationMatch: boolean | null
  timestampRecent: boolean | null
  duplicateFlag: boolean
}
interface BackendChangeRequest {
  reason: string
  requestedAt: string
}
interface BackendMilestone {
  _id: string
  name: string
  description?: string
  amount: number
  status: string
  evidence: BackendEvidence[]
  requiresCosigner: boolean
  requiresVideo: boolean
  approvers: BackendApprover[]
  changeRequests?: BackendChangeRequest[]
}
interface BackendProject {
  _id: string
  title: string
  description: string
  projectType: string
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
  materialsManagedBy?: 'contractor' | 'supplier'
  preferredSupplierId?: string | null
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
    placeName: e.placeName || null,
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
    description: m.description ?? '',
    amount: m.amount,
    status: m.status,
    proof: (m.evidence?.length ?? 0) > 0,
    evidence: (m.evidence || []).map(mapEvidence),
    changeRequests: (m.changeRequests ?? []).map((c) => ({ reason: c.reason, requestedAt: c.requestedAt })),
    requiresCosigner: m.requiresCosigner,
    requiresVideo: m.requiresVideo,
    approvers: (m.approvers || []).map(mapApprover),
  }
}

function mapProject(doc: BackendProject, funding: FundingSummary | undefined): Project {
  return {
    id: doc._id,
    title: doc.title,
    // Every consumer of the mapped Project shape (ProjectDetailScreen,
    // FundProjectScreen's post-funding routing) needs to tell a tender
    // apart from a (retired) funding request, which is exactly what let
    // "Back to project" after funding a tender's escrow route into
    // ProjectDetailScreen incorrectly, before this was tracked.
    projectType: doc.projectType,
    category: doc.category || 'General',
    location: doc.locationName || '',
    // Same "dropped during mapping" issue as projectType above — the real
    // coordinates were always present on the backend document but never
    // reached the frontend at all, so a project's location was only ever a
    // display string with nothing to put a map marker on.
    coordinates: doc.location?.lat != null && doc.location?.lng != null ? { lat: doc.location.lat, lng: doc.location.lng } : null,
    totalAmount: doc.totalAmount,
    raised: funding?.raised ?? 0,
    status: mapProjectStatus(doc.status),
    ownerId: typeof doc.ownerId === 'object' ? doc.ownerId._id : doc.ownerId,
    ownerName: typeof doc.ownerId === 'object' ? doc.ownerId.fullName : undefined,
    milestones: (doc.milestones || []).map(mapMilestone),
    image: doc.imageUrl || DEFAULT_IMAGE,
    description: doc.description || '',
    // Backend has no deadline field yet — 0 once complete, a flat placeholder
    // otherwise, rather than fabricating a fake countdown.
    daysLeft: doc.status === 'completed' ? 0 : 30,
    requiresMultiSig: doc.requiresMultiSig,
    coSignerId: doc.coSignerId ? (typeof doc.coSignerId === 'object' ? doc.coSignerId._id : doc.coSignerId) : undefined,
    coSignerName: doc.coSignerId && typeof doc.coSignerId === 'object' ? doc.coSignerId.fullName : undefined,
    materialsManagedBy: doc.materialsManagedBy ?? 'contractor',
    preferredSupplierId: doc.preferredSupplierId ?? null,
  }
}

async function fetchFundingSummary(id: string): Promise<FundingSummary> {
  const { data } = await api.get<{ data: FundingSummary }>(`/projects/${id}/funding-summary`)
  return data.data
}

export function useProjectsQuery() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      const { data } = await api.get<{ data: BackendProject[] }>('/projects', { params: { projectType: 'funding' } })
      const fundings = await Promise.all(data.data.map((p) => fetchFundingSummary(p._id)))
      return data.data.map((p, i) => mapProject(p, fundings[i]))
    },
    staleTime: 10_000,
  })
}

/** Paginated feed for BrowseProjectsScreen specifically — useProjectsQuery
 * above stays as-is (used broadly for dashboards/admin lookups that
 * legitimately want the full small dataset); only the high-traffic browse
 * screen needs real "load more" instead of silently capping at the
 * backend's default page size. */
export function useProjectsInfiniteQuery(limit = 12) {
  return useInfiniteQuery({
    queryKey: ['projects', 'infinite'],
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<{ items: Project[]; meta: PageMeta }> => {
      const { data } = await api.get<{ data: BackendProject[]; meta: PageMeta }>('/projects', { params: { projectType: 'funding', page: pageParam, limit } })
      const fundings = await Promise.all(data.data.map((p) => fetchFundingSummary(p._id)))
      return { items: data.data.map((p, i) => mapProject(p, fundings[i])), meta: data.meta }
    },
    initialPageParam: 1,
    getNextPageParam,
    staleTime: 10_000,
  })
}

/** Real "my projects" — the owner-scoped counterpart to useProjectsQuery,
 * which deliberately returns every funding project on the whole platform
 * (needed for Browse/Discover/Landing/global search) and was being reused,
 * unscoped, by screens explicitly titled "My Projects" — the bug a
 * brand-new owner reported (seeing every other user's projects the moment
 * they signed up). The backend already supports ?ownerId= on GET /projects;
 * this was simply never being passed. Disabled until a real ownerId is
 * known so a screen can't render a false-empty "no projects" state during
 * the brief window before devUserId resolves. */
export function useMyProjectsQuery(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'mine', ownerId],
    queryFn: async (): Promise<Project[]> => {
      const { data } = await api.get<{ data: BackendProject[] }>('/projects', { params: { projectType: 'funding', ownerId } })
      const fundings = await Promise.all(data.data.map((p) => fetchFundingSummary(p._id)))
      return data.data.map((p, i) => mapProject(p, fundings[i]))
    },
    enabled: !!ownerId,
    staleTime: 10_000,
  })
}

/** A funder never owns the project they fund — their relationship to a
 * project is having actually paid into its escrow — so "my projects" for a
 * funder can only be resolved server-side by the `funderId` filter on GET
 * /projects (which looks at who funded, not who owns). Without this,
 * FunderHome had no correct way to ask for its own dashboard data and fell
 * back to the full public catalog — every funder's "my total funded" and
 * "my active projects" were actually everyone's. */
export function useMyFundedProjectsQuery(funderId: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'funded-by-me', funderId],
    queryFn: async (): Promise<Project[]> => {
      const { data } = await api.get<{ data: BackendProject[] }>('/projects', { params: { projectType: 'funding', funderId } })
      const fundings = await Promise.all(data.data.map((p) => fetchFundingSummary(p._id)))
      return data.data.map((p, i) => mapProject(p, fundings[i]))
    },
    enabled: !!funderId,
    staleTime: 10_000,
  })
}

// ── Admin project list ──────────────────────────────────────────────────
export interface AdminProjectRow {
  id: string
  title: string
  projectType: string
  status: string
  ownerName: string
  totalAmount: number
  milestonesCount: number
  createdAt: string
}

interface BackendAdminProject {
  _id: string
  title: string
  projectType: string
  status: string
  totalAmount: number
  ownerId: { fullName: string } | string
  milestones: unknown[]
  createdAt: string
}

/** Admin's own list — every project regardless of type/owner, with a
 * server-side `search` filter (see projectController.getAll). Deliberately
 * skips the per-project funding-summary/rating fetches useProjectsQuery
 * makes (N+1 network calls each) since a management table only needs
 * totalAmount/status/owner, not live raised-so-far figures. */
export function useAdminProjectsQuery(filter: { status?: string; search?: string; projectType?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['adminProjects', filter],
    queryFn: async (): Promise<{ projects: AdminProjectRow[]; total: number }> => {
      const { data } = await api.get<{ data: BackendAdminProject[]; meta: { total: number } }>('/projects', {
        params: { ...filter, limit: filter.limit ?? 200 },
      })
      return {
        projects: data.data.map((p) => ({
          id: p._id,
          title: p.title,
          projectType: p.projectType,
          status: p.status,
          ownerName: typeof p.ownerId === 'object' ? p.ownerId.fullName : 'Unknown',
          totalAmount: p.totalAmount,
          milestonesCount: p.milestones?.length ?? 0,
          createdAt: p.createdAt,
        })),
        total: data.meta.total,
      }
    },
    staleTime: 10_000,
  })
}

export interface AdminUpdateProjectInput {
  title?: string
  description?: string
  locationName?: string
}

/** Admin edit — reuses PATCH /projects/:id, same route an owner edits their
 * own project through (see projectController.update's admin bypass). Only
 * safe to call while the project is still draft/open — the backend rejects
 * edits once real money has moved, for admin same as anyone. */
export function useAdminUpdateProjectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, input }: { projectId: string; input: AdminUpdateProjectInput }) => {
      const { data } = await api.patch<{ data: BackendAdminProject }>(`/projects/${projectId}`, input)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminProjects'] }),
  })
}

/** Admin delete — reuses DELETE /projects/:id; the backend only allows this
 * while the project is still draft, same rule that applies to the owner. */
export function useAdminRemoveProjectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (projectId: string) => {
      await api.delete(`/projects/${projectId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminProjects'] }),
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
      return mapProject(data.data, undefined)
    },
    enabled: Boolean(id),
    staleTime: 10_000,
  })
}

/** Real raised/released/escrowBalance for one project by id — separate from
 * useProjectQuery above (which skips it, see its own comment) since most of
 * that hook's callers don't need it; screens that actually have to compute
 * a remaining-unfunded amount (FundProjectScreen, ContractSummaryScreen's
 * "fund escrow" prompt) pull this alongside it instead. Same
 * GET /projects/:id/funding-summary useProjectsQuery already calls per row
 * for the funding-only list — this just exposes it for a single id. */
export function useProjectFundingSummaryQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['projectFundingSummary', id],
    queryFn: () => fetchFundingSummary(id!),
    enabled: Boolean(id),
    staleTime: 10_000,
  })
}

export interface FundProjectInput {
  id: string
  amount: number
  paymentProvider: 'mtn_momo' | 'orange_money' | 'stripe' | 'flutterwave'
  payerPhoneNumber?: string
  currency?: string
}

export interface FundProjectResult {
  _id: string
  status: string
  paymentUrl?: string
  clientSecret?: string
}

export function useFundProjectMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount, paymentProvider, payerPhoneNumber, currency }: FundProjectInput): Promise<FundProjectResult> => {
      const { data } = await api.post(
        `/projects/${id}/fund`,
        // `currency` was previously dropped here entirely — a diaspora
        // funder choosing "Fund in EUR/USD" always got charged against the
        // project's own currency (XAF) regardless, silently ignoring their
        // selection, since the backend defaults to project.currency when
        // none is sent.
        { amount, paymentProvider, payerPhoneNumber, currency },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } }
      )
      return data.data as FundProjectResult
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
      return mapProject(data.data, undefined)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

/** Assigns (or, with supplierId: null, clears) the project's preferred
 * materials supplier — its own endpoint, legal at any project status (see
 * projectController.assignSupplier), reached from a "browse and compare
 * real stores" screen rather than a picker on the creation form. */
export function useAssignSupplierMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, supplierId }: { projectId: string; supplierId: string | null }) => {
      const { data } = await api.post<{ data: BackendProject }>(`/projects/${projectId}/assign-supplier`, { supplierId })
      return mapProject(data.data, undefined)
    },
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export interface SubmitEvidenceInput {
  projectId: string
  milestoneId: string
  file?: File
  fileUrl?: string
  geotag?: { lat: number; lng: number } | null
  /** Already resolved client-side (see useReverseGeocodeQuery in
   * MilestoneSubmitScreen) — sent along so the backend persists the same
   * name the submitter saw during capture instead of re-geocoding, and
   * every later viewer reads a real place name instead of raw coordinates. */
  placeName?: string | null
  notes?: string
}

export function useSubmitEvidenceMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, milestoneId, file, fileUrl, geotag, placeName, notes }: SubmitEvidenceInput) => {
      const form = new FormData()
      form.append('type', 'photo')
      if (file) form.append('file', file)
      if (fileUrl) form.append('fileUrl', fileUrl)
      if (geotag) {
        form.append('geotagLat', String(geotag.lat))
        form.append('geotagLng', String(geotag.lng))
      }
      if (placeName) form.append('placeName', placeName)
      if (notes) form.append('notes', notes)
      const { data } = await api.post(`/projects/${projectId}/milestones/${milestoneId}/evidence`, form)
      return data.data
    },
    // Only invalidated the submitter's own "my projects" list — fine for an
    // owner submitting on their own project, but a contractor submits
    // proof on a project someone *else* owns, read via the singular
    // useProjectQuery(id) cache (see ContractDetailScreen), which this never
    // touched. Without this, returning to the contract screen after
    // submitting showed the milestone still "pending" until something else
    // happened to invalidate it.
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
    },
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
      return { project: mapProject(data.data.project, undefined), releasedEscrow: data.data.releasedEscrow }
    },
    // Same gap useSubmitEvidenceMutation was fixed for above: a funder
    // approves/rejects from MilestoneReviewScreen (FunderScreens.tsx), which
    // reads via the singular useProjectQuery(projectId) cache — same cache
    // ContractDetailScreen/ContractorScreens read from — never touched by
    // invalidating the plural 'projects' list alone. Without this, approving
    // a milestone (including releasing escrow) left every project-detail
    // screen showing the stale pre-approval status until an unrelated
    // refetch happened to occur.
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}

/** Lighter-weight than a dispute — sends a submitted milestone back to
 * 'pending' with a reason so the contractor can resubmit, no escalation, no
 * money moves. See projectController.requestMilestoneChanges. */
export function useRequestMilestoneChangesMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, milestoneId, reason }: { projectId: string; milestoneId: string; reason: string }) => {
      const { data } = await api.post<{ data: BackendProject }>(`/projects/${projectId}/milestones/${milestoneId}/request-changes`, { reason })
      return mapProject(data.data, undefined)
    },
    // Same singular-cache gap as useDecideApprovalMutation above.
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
    },
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
    // Same singular-cache gap as useDecideApprovalMutation above.
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', id] })
    },
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
    // Same singular-cache gap as useDecideApprovalMutation above.
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}
