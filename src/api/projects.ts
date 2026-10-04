import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { api } from './client'
import { getNextPageParam, type PageMeta } from './pagination'
import type { LocationDetails, SupplierRequirement, Milestone, MilestoneApprover, MilestoneEvidence, Project } from '../context'
import type { RecommendedVerifier } from './reputation'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=220&fit=crop&auto=format'

interface BackendLocationDetails {
  placeName?: string
  formattedAddress?: string
  source?: string
  resolvedAt?: string | null
}

function mapLocationDetails(d: BackendLocationDetails | null | undefined): LocationDetails | null {
  if (!d || (!d.placeName && !d.formattedAddress)) return null
  return {
    placeName: d.placeName || null,
    formattedAddress: d.formattedAddress || null,
    source: (d.source as LocationDetails['source']) || null,
  }
}

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
  formattedAddress?: string | null
  capturedAt: string | null
  createdAt: string
  fileHash: string
  locationMatch: boolean | null
  timestampRecent: boolean | null
  duplicateFlag: boolean
  submittedBy?: { _id: string; fullName: string } | string
  // 'ar_camera' for a live in-app HUD-camera capture, 'gallery_upload' for
  // anything picked from an existing file/gallery. See the backend's
  // Project.js EvidenceSchema.captureSource comment.
  captureSource?: 'ar_camera' | 'gallery_upload'
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
  location?: { lat: number | null; lng: number | null }
  locationDetails?: BackendLocationDetails | null
}
interface BackendProject {
  _id: string
  title: string
  description: string
  projectType: string
  category: string
  locationName: string
  location: { lat: number | null; lng: number | null }
  locationDetails?: BackendLocationDetails | null
  locationBeforeVerification?: { lat: number | null; lng: number | null } | null
  locationBeforeVerificationDetails?: BackendLocationDetails | null
  imageUrl: string
  totalAmount: number
  status: string
  ownerId: { _id: string; fullName: string } | string
  milestones: BackendMilestone[]
  requiresMultiSig: boolean
  coSignerId: { _id: string; fullName: string } | string | null
  materialsManagedBy?: 'contractor' | 'supplier'
  preferredSupplierId?: string | null
  supplierRequirement?: SupplierRequirement
  supplier?: { id: string; businessName: string; region: string } | null
  hasExistingPlan?: boolean
  hasPlanDocument?: boolean
  locationVerificationStatus?: 'not_requested' | 'requested' | 'confirmed'
}
/** Per-milestone escrow cover, derived by the backend's waterfall
 * (milestoneFundingService.getFundingState) — never computed client-side. */
export interface MilestoneFunding {
  id: string
  name: string
  amount: number
  status: string
  fundedAmount: number
  unfundedAmount: number
  fundingStatus: 'released' | 'funded' | 'partially_funded' | 'unfunded'
  /** The contractor explicitly chose "Proceed Without Full Escrow". */
  proceedAtRisk: boolean
  /** Work may start/continue: funded, or proceeding at own risk. */
  workable: boolean
  /** Approved by the funder, waiting for escrow to cover it. */
  awaitingFunds: boolean
}

/** Contract value, funded escrow, released and unfunded amounts — four
 * separate figures, all from one backend source of truth. `raised`,
 * `released` and `escrowBalance` are the legacy names of
 * fundedAmount / releasedAmount / inEscrow. */
export interface FundingSummary {
  totalContractValue: number
  fundedAmount: number
  releasedAmount: number
  inEscrow: number
  unfundedAmount: number
  remainingToFund: number
  pendingFunding: number
  fundingMode: 'staged' | 'full_upfront'
  milestones: MilestoneFunding[]
  nextMilestoneToFund: { id: string; name: string; shortfall: number } | null
  suggestedFundingAmount: number
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
    formattedAddress: e.formattedAddress || null,
    capturedAt: e.capturedAt ?? e.createdAt,
    locationMatch: e.locationMatch,
    timestampRecent: e.timestampRecent,
    duplicateFlag: e.duplicateFlag,
    submittedByName: typeof e.submittedBy === 'object' ? e.submittedBy.fullName : null,
    captureSource: e.captureSource === 'ar_camera' ? 'ar_camera' : 'gallery_upload',
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
    location: m.location?.lat != null && m.location?.lng != null ? { lat: m.location.lat, lng: m.location.lng } : null,
    locationDetails: mapLocationDetails(m.locationDetails),
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
    locationDetails: mapLocationDetails(doc.locationDetails),
    locationBeforeVerification:
      doc.locationBeforeVerification?.lat != null && doc.locationBeforeVerification?.lng != null
        ? { lat: doc.locationBeforeVerification.lat, lng: doc.locationBeforeVerification.lng }
        : null,
    locationBeforeVerificationDetails: mapLocationDetails(doc.locationBeforeVerificationDetails),
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
    supplierRequirement: doc.supplierRequirement ?? 'none',
    supplier: doc.supplier ?? null,
    hasExistingPlan: doc.hasExistingPlan ?? false,
    hasPlanDocument: doc.hasPlanDocument ?? false,
    locationVerificationStatus: doc.locationVerificationStatus ?? 'not_requested',
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
 * the brief window before devUserId resolves.
 *
 * No projectType filter: a funder owns the tenders they post (see
 * assertCanCreateProjectType), so restricting this to the retired 'funding'
 * type silently returned nothing for every real owner. */
export function useMyProjectsQuery(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'mine', ownerId],
    queryFn: async (): Promise<Project[]> => {
      const { data } = await api.get<{ data: BackendProject[] }>('/projects', { params: { ownerId, limit: 100 } })
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
 * "my active projects" were actually everyone's.
 *
 * No projectType filter: funders fund tenders ('funding' projects are
 * retired and can no longer be created), so restricting to 'funding' here
 * silently returned nothing for every real funder. */
export function useMyFundedProjectsQuery(funderId: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'funded-by-me', funderId],
    queryFn: async (): Promise<Project[]> => {
      const { data } = await api.get<{ data: BackendProject[] }>('/projects', { params: { funderId, limit: 100 } })
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
    // Funding changes contract-level numbers, per-milestone cover, the funder's
    // dashboards and (via auto-release) transactions — refresh all of them.
    onSuccess: () => invalidateFundingQueries(qc),
  })
}

export function invalidateFundingQueries(qc: ReturnType<typeof useQueryClient>) {
  for (const key of ['projects', 'project', 'projectFundingSummary', 'escrow', 'transactions', 'dashboard', 'contracts', 'contract']) {
    qc.invalidateQueries({ queryKey: [key] })
  }
}

/** Fee-on-top quote: what the funder actually pays for `netAmount` to be
 * credited to escrow (the backend owns the fee maths). */
export interface FundingQuote {
  currency: string
  netAmount: number
  creditedNet: number
  grossAmount: number
  feeAmount: number
  feeRate: number
}

export function useFundingQuoteQuery(projectId: string | undefined, netAmount: number, currency = 'XAF') {
  return useQuery({
    queryKey: ['fundingQuote', projectId, netAmount, currency],
    queryFn: async (): Promise<FundingQuote> => {
      const { data } = await api.get<{ data: FundingQuote }>(`/projects/${projectId}/funding-quote`, { params: { netAmount, currency } })
      return data.data
    },
    enabled: Boolean(projectId) && netAmount > 0,
    staleTime: 30_000,
  })
}

/** "Proceed Without Full Escrow" — the awarded contractor explicitly accepts
 * the risk of working on an under-funded milestone. Only an override of the
 * funded-milestone gate: it never funds, releases or guarantees anything. */
export function useProceedAtRiskMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, milestoneId }: { projectId: string; milestoneId: string }) => {
      const { data } = await api.post<{ data: { funding: FundingSummary } }>(
        `/projects/${projectId}/milestones/${milestoneId}/proceed-at-risk`,
        { acknowledged: true }
      )
      return data.data
    },
    onSuccess: () => invalidateFundingQueries(qc),
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
    mutationFn: async ({ projectId, supplierId, supplierRequirement }: { projectId: string; supplierId?: string | null; supplierRequirement?: 'none' | 'need_supplier' }) => {
      const { data } = await api.post<{ data: BackendProject }>(`/projects/${projectId}/assign-supplier`, { supplierId, supplierRequirement })
      return mapProject(data.data, undefined)
    },
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

/** Dedicated endpoint, not the generic project update — PATCH /projects/:id
 * blocks ANY edit once a project leaves draft/open (to protect the escrow
 * ledger), but correcting a mislabeled pin has to keep working after that,
 * same reasoning as assign-supplier above. */
/** The extra fields LocationEditModal's onSave now hands back — already
 * resolved client-side (an address search's own result) or left for the
 * backend to reverse-geocode itself (GPS/manual drag) if omitted. Either
 * way, Project.locationDetails never ends up empty. */
interface LocationSaveExtras {
  placeName?: string | null
  formattedAddress?: string | null
  locationSource?: LocationDetails['source']
}

export function useUpdateProjectLocationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, location, ...extras }: { projectId: string; location: { lat: number; lng: number } } & LocationSaveExtras) => {
      const { data } = await api.patch<{ data: BackendProject }>(`/projects/${projectId}/location`, { location, ...extras })
      return mapProject(data.data, undefined)
    },
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateMilestoneLocationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, milestoneId, location, ...extras }: { projectId: string; milestoneId: string; location: { lat: number; lng: number } } & LocationSaveExtras) => {
      const { data } = await api.patch<{ data: BackendProject }>(`/projects/${projectId}/milestones/${milestoneId}/location`, { location, ...extras })
      return mapProject(data.data, undefined)
    },
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

/** Uploads (or replaces) the project's plan document — a follow-up
 * multipart call after creation, since POST /projects itself is plain
 * JSON (see createProject's hasExistingPlan field). */
export function useUploadPlanDocumentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, file }: { projectId: string; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post(`/projects/${projectId}/plan-document`, form)
      return data.data as { hasPlanDocument: boolean }
    },
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export interface PlanDocument {
  fileUrl: string
  fileName: string
  mimeType: string
  uploadedAt: string
}

/** A mutation, not a query — fetching the real fileUrl is a deliberate,
 * on-demand user action ("View plan"), not something to pre-fetch/cache
 * indefinitely, and the backend 403s for anyone not authorized to see it
 * (owner/admin/contractor/verifier — see projectController.getPlanDocument). */
export function useFetchPlanDocumentMutation() {
  return useMutation({
    mutationFn: async (projectId: string): Promise<PlanDocument> => {
      const { data } = await api.get<{ data: PlanDocument }>(`/projects/${projectId}/plan-document`)
      return data.data
    },
  })
}

/** Owner-only — same shared verifier-matching/scoring engine the admin-only
 * land-listing/milestone assignment flow already uses (see
 * api/reputation.ts's useRecommendedVerifiersQuery), just scoped to the
 * project's own owner via a dedicated endpoint instead of admin-only. */
export function useRecommendedVerifiersForProjectQuery(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['recommendedVerifiers', 'project_location', projectId],
    queryFn: async (): Promise<RecommendedVerifier[]> => {
      const { data } = await api.get<{ data: RecommendedVerifier[] }>(`/projects/${projectId}/recommended-verifiers`)
      return data.data
    },
    enabled: enabled && !!projectId,
    staleTime: 10_000,
  })
}

export function useRequestLocationVerificationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, verifierId }: { projectId: string; verifierId: string }) => {
      const { data } = await api.post(`/projects/${projectId}/request-location-verification`, { verifierId })
      return data.data
    },
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// ── Verifier invitations — a funder inviting someone THEY already know,
// distinct from picking an already-approved verifier off the recommended
// list above. See verifierInvitationController.js on the backend. ─────────
export interface VerifierInvitation {
  _id: string
  projectId: string
  email: string
  name: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expiresAt: string
  createdAt: string
}

interface BackendVerifierInvitation {
  _id: string
  projectId: string
  email: string
  name: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expiresAt: string
  createdAt: string
}

function mapInvitation(doc: BackendVerifierInvitation): VerifierInvitation {
  return { _id: doc._id, projectId: doc.projectId, email: doc.email, name: doc.name, status: doc.status, expiresAt: doc.expiresAt, createdAt: doc.createdAt }
}

/** Owner/admin-only — sends the invite email directly and also returns the
 * real shareable link, so the funder can copy/share it themselves rather
 * than relying solely on the email arriving. */
export function useInviteVerifierMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, email, name }: { projectId: string; email: string; name?: string }) => {
      const { data } = await api.post<{ data: { invitation: BackendVerifierInvitation; inviteUrl: string } }>(
        `/projects/${projectId}/verifier-invitations`,
        { email, name }
      )
      return { invitation: mapInvitation(data.data.invitation), inviteUrl: data.data.inviteUrl }
    },
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['verifierInvitations', projectId] })
    },
  })
}

export function useProjectVerifierInvitationsQuery(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['verifierInvitations', projectId],
    queryFn: async (): Promise<VerifierInvitation[]> => {
      const { data } = await api.get<{ data: BackendVerifierInvitation[] }>(`/projects/${projectId}/verifier-invitations`)
      return data.data.map(mapInvitation)
    },
    enabled: enabled && !!projectId,
    staleTime: 10_000,
  })
}

export function useRevokeVerifierInvitationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, invitationId }: { projectId: string; invitationId: string }) => {
      const { data } = await api.post<{ data: BackendVerifierInvitation }>(`/projects/${projectId}/verifier-invitations/${invitationId}/revoke`)
      return mapInvitation(data.data)
    },
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['verifierInvitations', projectId] })
    },
  })
}

export interface VerifierInvitationPreview {
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expiresAt: string
  projectTitle: string
  locationName: string
  funderName: string
}

/** Public — no auth — for the accept page (#/verifier-invite/:token) to
 * render context before/during signup. A plain function, not a hook: this
 * is fetched imperatively from a route param, not tied to any component's
 * render-driven query lifecycle in a way that benefits from useQuery. */
export async function fetchVerifierInvitationPreview(token: string): Promise<VerifierInvitationPreview> {
  const { data } = await api.get<{ data: VerifierInvitationPreview }>(`/verifier-invitations/${token}`)
  return data.data
}

/** Authenticated — any signed-in user (new or existing). Grants the
 * accepting user roleType:'verifier' and creates their VerificationTask;
 * never creates a VerifierProfile and never touches the funder's account —
 * see verifierInvitationController.acceptInvitation. */
export function useAcceptVerifierInvitationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (token: string) => {
      const { data } = await api.post<{ data: { task: unknown; project: BackendProject } }>(`/verifier-invitations/${token}/accept`)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
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
   * name/address the submitter saw during capture instead of re-geocoding,
   * and every later viewer reads a real place name instead of raw
   * coordinates. */
  placeName?: string | null
  formattedAddress?: string | null
  notes?: string
  // Defaults preserve the exact previous behavior (always 'photo'/
  // 'gallery_upload') for every pre-existing call site that doesn't pass
  // these — only the new AR-camera capture path sends 'video'/'ar_camera'.
  type?: 'photo' | 'video'
  captureSource?: 'ar_camera' | 'gallery_upload'
}

export function useSubmitEvidenceMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, milestoneId, file, fileUrl, geotag, placeName, formattedAddress, notes, type, captureSource }: SubmitEvidenceInput) => {
      const form = new FormData()
      form.append('type', type ?? 'photo')
      if (captureSource) form.append('captureSource', captureSource)
      if (file) form.append('file', file)
      if (fileUrl) form.append('fileUrl', fileUrl)
      if (geotag) {
        form.append('geotagLat', String(geotag.lat))
        form.append('geotagLng', String(geotag.lng))
      }
      if (placeName) form.append('placeName', placeName)
      if (formattedAddress) form.append('formattedAddress', formattedAddress)
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
      const { data } = await api.post<{ data: { project: BackendProject; releasedEscrow: unknown; awaitingFunds?: boolean; shortfall?: number } }>(
        `/projects/${projectId}/milestones/${milestoneId}/approval`,
        { status },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } }
      )
      // Only the milestone/approver state is needed by callers — funding
      // totals/rating aren't relevant to an approval decision's result.
      return {
        project: mapProject(data.data.project, undefined),
        releasedEscrow: data.data.releasedEscrow,
        // Approved while escrow was short: nothing was released — the payment
        // goes out automatically once the funder tops up.
        awaitingFunds: Boolean(data.data.awaitingFunds),
        shortfall: data.data.shortfall ?? 0,
      }
    },
    // Same gap useSubmitEvidenceMutation was fixed for above: a funder
    // approves/rejects from MilestoneReviewScreen (FunderScreens.tsx), which
    // reads via the singular useProjectQuery(projectId) cache — same cache
    // ContractDetailScreen/ContractorScreens read from — never touched by
    // invalidating the plural 'projects' list alone. Without this, approving
    // a milestone (including releasing escrow) left every project-detail
    // screen showing the stale pre-approval status until an unrelated
    // refetch happened to occur.
    onSuccess: () => invalidateFundingQueries(qc),
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
