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

// ── Admin management ─────────────────────────────────────────────────────
export interface AdminSubscriptionRow {
  id: string
  userName: string
  planType: PlanType
  status: Subscription['status']
  renewalDate: string | null
  createdAt: string
}

interface BackendAdminSubscription extends BackendSubscription {
  userId: { fullName: string } | string
}

export function useAdminSubscriptionsQuery(filter: { status?: string; planType?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['adminSubscriptions', filter],
    queryFn: async (): Promise<{ subscriptions: AdminSubscriptionRow[]; total: number }> => {
      const { data } = await api.get<{ data: BackendAdminSubscription[]; meta: { total: number } }>('/admin/subscriptions', {
        params: { ...filter, limit: filter.limit ?? 200 },
      })
      return {
        subscriptions: data.data.map((s) => ({
          id: s._id,
          userName: typeof s.userId === 'object' ? s.userId.fullName : 'Unknown',
          planType: s.planType,
          status: s.status,
          renewalDate: s.renewalDate,
          createdAt: s.createdAt,
        })),
        total: data.meta.total,
      }
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

/** Shared by the consumer self-service screen and the admin Community
 * screen — the backend now accepts either the owning user or an admin
 * force-cancelling on their behalf (see subscriptionController.cancel's
 * admin bypass), same route both ways. */
export function useCancelSubscriptionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data } = await api.patch<{ data: BackendSubscription }>(`/subscriptions/${subscriptionId}/cancel`)
      return mapSubscription(data.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] })
      qc.invalidateQueries({ queryKey: ['adminSubscriptions'] })
    },
  })
}
