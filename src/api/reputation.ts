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
  flagType: 'multiple_disputes' | 'duplicate_geotag' | 'reused_evidence'
  severity: 'low' | 'medium' | 'high'
  detail: Record<string, unknown>
  createdAt: string
}

export function useRiskFlagsQuery() {
  return useQuery({
    queryKey: ['riskFlags'],
    queryFn: async (): Promise<BackendRiskFlag[]> => {
      const { data } = await api.get<{ data: BackendRiskFlag[] }>('/risk-flags')
      return data.data
    },
    staleTime: 10_000,
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

export function useVerificationTasksQuery(filter: { verifierId?: string } = {}) {
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
