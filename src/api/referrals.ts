import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface Referral {
  id: string
  referredId: string | null
  referredName: string | null
  status: 'invited' | 'joined' | 'rewarded'
  rewardAmount: number | null
  rewardCurrency: string
  date: string
}

interface BackendReferral {
  _id: string
  referredId: { _id: string; fullName: string } | string | null
  status: 'invited' | 'joined' | 'rewarded'
  rewardAmount: number | null
  rewardCurrency: string
  createdAt: string
}

function mapReferral(doc: BackendReferral): Referral {
  return {
    id: doc._id,
    referredId: doc.referredId ? (typeof doc.referredId === 'object' ? doc.referredId._id : doc.referredId) : null,
    referredName: doc.referredId && typeof doc.referredId === 'object' ? doc.referredId.fullName : null,
    status: doc.status,
    rewardAmount: doc.rewardAmount,
    rewardCurrency: doc.rewardCurrency,
    date: new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  }
}

export function useMyReferralsQuery() {
  return useQuery({
    queryKey: ['referrals'],
    queryFn: async (): Promise<Referral[]> => {
      const { data } = await api.get<{ data: BackendReferral[] }>('/referrals')
      return data.data.map(mapReferral)
    },
    staleTime: 10_000,
  })
}

/** Each referral record is single-use — once someone claims it (status
 * flips to 'joined'), the same link can't be claimed again — so "my
 * referral link" means the most recent still-'invited' record, creating a
 * fresh one if the last one has already been used. */
export function useCreateReferralMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: BackendReferral }>('/referrals', {})
      return mapReferral(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['referrals'] }),
  })
}

// ── Admin management ─────────────────────────────────────────────────────
export interface AdminReferralRow {
  id: string
  referrerName: string
  referredName: string | null
  status: 'invited' | 'joined' | 'rewarded'
  rewardAmount: number | null
  rewardCurrency: string
  createdAt: string
}

interface BackendAdminReferral {
  _id: string
  referrerId: { fullName: string } | string
  referredId: { fullName: string } | string | null
  status: 'invited' | 'joined' | 'rewarded'
  rewardAmount: number | null
  rewardCurrency: string
  createdAt: string
}

export function useAdminReferralsQuery(filter: { status?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['adminReferrals', filter],
    queryFn: async (): Promise<{ referrals: AdminReferralRow[]; total: number }> => {
      const { data } = await api.get<{ data: BackendAdminReferral[]; meta: { total: number } }>('/admin/referrals', {
        params: { ...filter, limit: filter.limit ?? 200 },
      })
      return {
        referrals: data.data.map((r) => ({
          id: r._id,
          referrerName: typeof r.referrerId === 'object' ? r.referrerId.fullName : 'Unknown',
          referredName: r.referredId ? (typeof r.referredId === 'object' ? r.referredId.fullName : 'Unknown') : null,
          status: r.status,
          rewardAmount: r.rewardAmount,
          rewardCurrency: r.rewardCurrency,
          createdAt: r.createdAt,
        })),
        total: data.meta.total,
      }
    },
    staleTime: 10_000,
  })
}

/** Admin-only — fraud cleanup for a self-referral loophole or spam invite
 * loop (see referralController.remove). No owner-facing delete exists. */
export function useAdminRemoveReferralMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (referralId: string) => {
      await api.delete(`/referrals/${referralId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminReferrals'] }),
  })
}

export function useClaimReferralMutation() {
  return useMutation({
    mutationFn: async (referralId: string) => {
      const { data } = await api.post<{ data: BackendReferral }>(`/referrals/${referralId}/claim`, {})
      return mapReferral(data.data)
    },
  })
}
