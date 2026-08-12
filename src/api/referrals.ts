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

export function useClaimReferralMutation() {
  return useMutation({
    mutationFn: async (referralId: string) => {
      const { data } = await api.post<{ data: BackendReferral }>(`/referrals/${referralId}/claim`, {})
      return mapReferral(data.data)
    },
  })
}
