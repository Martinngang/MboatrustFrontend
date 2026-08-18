import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

// ── Ratings ──────────────────────────────────────────────────────────────
export interface RatingSummary { average: number | null; count: number }

/** Plain (non-hook) fetch for use inside other queryFns — e.g. mapping a
 * list of projects, where each row needs the owner's rating and hooks
 * can't be called in a loop or inside a non-component async function. */
export async function fetchRatingSummary(userId: string): Promise<RatingSummary> {
  const { data } = await api.get<{ data: RatingSummary }>(`/ratings/summary/${userId}`)
  return { average: data.data.average, count: data.data.count }
}

/** Real aggregate from the backend (GET /ratings/summary/:userId) — used to
 * replace the placeholder 4.5 stand-ins the Phase 3–5 mapping layers used
 * before this existed. Falls back to null-safe defaults for a brand new
 * user with no ratings yet, not an error. */
export function useRatingSummaryQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['ratingSummary', userId],
    queryFn: async (): Promise<RatingSummary> => {
      const { data } = await api.get<{ data: RatingSummary }>(`/ratings/summary/${userId}`)
      return { average: data.data.average, count: data.data.count }
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export interface RatingEntry { id: string; fromName: string; score: number; comment: string; date: string }
interface BackendRating {
  _id: string
  fromUserId: { _id: string; fullName: string } | string
  toUserId: string
  projectId: string
  score: number
  comment: string
  roleContext: string
  createdAt: string
}

export function useRatingsQuery(filter: { toUserId?: string; projectId?: string; roleContext?: string } = {}) {
  return useQuery({
    queryKey: ['ratings', filter],
    queryFn: async (): Promise<RatingEntry[]> => {
      const { data } = await api.get<{ data: BackendRating[] }>('/ratings', { params: filter })
      return data.data.map((r) => ({
        id: r._id,
        fromName: typeof r.fromUserId === 'object' ? r.fromUserId.fullName : 'Anonymous',
        score: r.score,
        comment: r.comment,
        date: new Date(r.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      }))
    },
    enabled: Boolean(filter.toUserId || filter.projectId),
    staleTime: 10_000,
  })
}

export interface CreateRatingInput {
  toUserId: string
  projectId: string
  score: number
  comment?: string
  roleContext: 'recipient' | 'contractor' | 'verifier' | 'land_seller'
}

export function useCreateRatingMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateRatingInput) => {
      const { data } = await api.post('/ratings', input)
      return data.data
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: ['ratings'] })
      qc.invalidateQueries({ queryKey: ['ratingSummary', vars.toUserId] })
    },
  })
}

// ── Disputes ─────────────────────────────────────────────────────────────
export interface BackendDispute {
  _id: string
  projectId: { _id: string; title: string; totalAmount: number; ownerId: { _id: string; fullName: string } | string } | string
  milestoneId: string | null
  raisedBy: { _id: string; fullName: string } | string
  reason: string
  status: string
  resolutionNotes: string
  createdAt: string
}

export function useDisputesQuery(filter: { status?: string; projectId?: string } = {}) {
  return useQuery({
    queryKey: ['disputes', filter],
    queryFn: async (): Promise<BackendDispute[]> => {
      const { data } = await api.get<{ data: BackendDispute[] }>('/disputes', { params: filter })
      return data.data
    },
    staleTime: 10_000,
  })
}

export function useResolveDisputeMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ disputeId, status, resolutionNotes }: { disputeId: string; status: 'under_review' | 'resolved' | 'rejected'; resolutionNotes?: string }) => {
      const { data } = await api.patch(`/disputes/${disputeId}/resolve`, { status, resolutionNotes })
      return data.data as BackendDispute
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['disputes'] }),
  })
}

// ── Risk flags (admin) ───────────────────────────────────────────────────
export interface BackendRiskFlag {
  _id: string
  userId: { _id: string; fullName: string } | string
  flagType: 'multiple_disputes' | 'duplicate_geotag' | 'reused_evidence' | 'ai_flagged' | 'land_listing_risk' | 'escrow_anomaly'
  severity: 'low' | 'medium' | 'high'
  detail: Record<string, unknown>
  /** Set only when Gemini returned a usable second opinion on flagged
   * evidence (see evidenceAnalysisService.getAiSecondOpinion) — null
   * whenever AI is unconfigured/disabled/timed out, never an error state. */
  aiRiskScore: number | null
  aiRationale: string | null
  createdAt: string
}

export function useRiskFlagsQuery(filter: { flagType?: string; severity?: string; minAiRiskScore?: number } = {}) {
  return useQuery({
    queryKey: ['riskFlags', filter],
    queryFn: async (): Promise<BackendRiskFlag[]> => {
      const { data } = await api.get<{ data: BackendRiskFlag[] }>('/risk-flags', { params: filter })
      return data.data
    },
    staleTime: 10_000,
  })
}

export interface RiskFlagSummary {
  countByFlagType: Record<string, number>
  countBySeverity: Record<string, number>
  avgAiRiskScore: number | null
  aiFlaggedCount: number
}
export function useRiskFlagSummaryQuery() {
  return useQuery({
    queryKey: ['riskFlagSummary'],
    queryFn: async (): Promise<RiskFlagSummary> => {
      const { data } = await api.get<{ data: RiskFlagSummary }>('/risk-flags/summary')
      return data.data
    },
    staleTime: 30_000,
  })
}

// ── Verification tasks (human verifier assignments) ─────────────────────
export interface BackendVerificationTask {
  _id: string
  targetType: 'milestone' | 'land_listing'
  targetId: string
  verifierId: string
  status: 'assigned' | 'in_progress' | 'submitted'
  reportText: string
  reportPhotos: string[]
  confirmedMatch: boolean | null
  createdAt: string
  // Server-resolved display info — targetId is a polymorphic reference
  // (milestone subdocument or LandListing), so the backend looks it up
  // rather than leaving the frontend to guess which collection it's in.
  target: { title: string; location: string; milestoneTitle?: string; projectId?: string } | null
}

export function useVerificationTasksQuery(filter: { verifierId?: string; targetType?: 'milestone' | 'land_listing'; targetId?: string } = {}) {
  return useQuery({
    queryKey: ['verificationTasks', filter],
    queryFn: async (): Promise<BackendVerificationTask[]> => {
      const { data } = await api.get<{ data: BackendVerificationTask[] }>('/verification-tasks', { params: filter })
      return data.data
    },
    staleTime: 10_000,
  })
}

export function useStartVerificationTaskMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data } = await api.post(`/verification-tasks/${taskId}/start`)
      return data.data as BackendVerificationTask
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verificationTasks'] }),
  })
}

export function useSubmitVerificationReportMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, reportText, reportPhotos, confirmedMatch }: {
      taskId: string; reportText: string; reportPhotos: string[]; confirmedMatch: boolean
    }) => {
      const { data } = await api.post(`/verification-tasks/${taskId}/report`, { reportText, reportPhotos, confirmedMatch })
      return data.data as BackendVerificationTask
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verificationTasks'] }),
  })
}

export function useCreateVerificationTaskMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ targetType, targetId, verifierId }: { targetType: 'milestone' | 'land_listing'; targetId: string; verifierId: string }) => {
      const { data } = await api.post('/verification-tasks', { targetType, targetId, verifierId })
      return data.data as BackendVerificationTask
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verificationTasks'] }),
  })
}

// ── Verifier matching (admin) ────────────────────────────────────────────
export interface RecommendedVerifier {
  verifierId: string
  fullName: string
  avatarUrl?: string
  specialties: string[]
  regions: string[]
  openTaskCount: number
  score: { total: number; breakdown: { location: number; specialty: number; load: number; availability: number } }
}

export function useRecommendedVerifiersQuery(targetType: 'milestone' | 'land_listing', targetId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['recommendedVerifiers', targetType, targetId],
    queryFn: async (): Promise<RecommendedVerifier[]> => {
      const { data } = await api.get<{ data: RecommendedVerifier[] }>('/verification-tasks/recommended-verifiers', { params: { targetType, targetId } })
      return data.data
    },
    enabled: enabled && !!targetId,
    staleTime: 10_000,
  })
}
