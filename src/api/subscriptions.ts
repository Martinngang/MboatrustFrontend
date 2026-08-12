import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export type PlanType = 'pro_contractor' | 'power_funder'

export interface Subscription {
  id: string
  planType: PlanType
  status: 'active' | 'cancelled' | 'expired' | 'past_due'
  renewalDate: string | null
  payerPhoneNumber: string | null
  createdAt: string
}

interface BackendSubscription {
  _id: string
  planType: PlanType
  status: 'active' | 'cancelled' | 'expired' | 'past_due'
  renewalDate: string | null
  payerPhoneNumber: string | null
  createdAt: string
}

function mapSubscription(s: BackendSubscription): Subscription {
  return {
    id: s._id,
    planType: s.planType,
    status: s.status,
    renewalDate: s.renewalDate,
    payerPhoneNumber: s.payerPhoneNumber,
    createdAt: s.createdAt,
  }
}

/** Prices charged server-side (subscriptionController.js's PLAN_PRICES) —
 * kept here as a display-only mirror since the backend doesn't expose a
 * "list plans" endpoint; the actual charge always re-derives from the
 * server-side constant, never from what the client sends. */
export const PLAN_PRICES: Record<PlanType, number> = {
  pro_contractor: 5000,
  power_funder: 10000,
}

export function useMySubscriptionsQuery() {
  return useQuery({
    queryKey: ['subscriptions', 'mine'],
    queryFn: async (): Promise<Subscription[]> => {
      const { data } = await api.get<{ data: BackendSubscription[] }>('/subscriptions')
      return data.data.map(mapSubscription)
    },
    staleTime: 10_000,
  })
}

export function useCreateSubscriptionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { planType: PlanType; paymentProvider: 'mtn_momo' | 'orange_money' | 'flutterwave' | 'stripe'; payerPhoneNumber?: string }) => {
      const { data } = await api.post<{ data: BackendSubscription }>('/subscriptions', input)
      return mapSubscription(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  })
}

export function useCancelSubscriptionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data } = await api.patch<{ data: BackendSubscription }>(`/subscriptions/${subscriptionId}/cancel`)
      return mapSubscription(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  })
}
