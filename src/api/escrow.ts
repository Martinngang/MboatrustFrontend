import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface EscrowEntry {
  id: string
  projectId: string
  projectTitle: string
  type: 'fund' | 'release' | 'refund' | 'fee_deduction'
  grossAmount: number
  netAmount: number
  currency: string
  paymentProvider: string
  status: 'pending' | 'completed' | 'failed' | 'reversed'
  createdAt: string
}

interface BackendEscrow {
  _id: string
  projectId: { _id: string; title: string } | string
  type: EscrowEntry['type']
  grossAmount: number
  netAmount: number
  currency: string
  paymentProvider: string
  status: EscrowEntry['status']
  createdAt: string
}

function mapEscrow(e: BackendEscrow): EscrowEntry {
  return {
    id: e._id,
    projectId: typeof e.projectId === 'object' ? e.projectId._id : e.projectId,
    projectTitle: typeof e.projectId === 'object' ? e.projectId.title : '',
    type: e.type,
    grossAmount: e.grossAmount,
    netAmount: e.netAmount,
    currency: e.currency,
    paymentProvider: e.paymentProvider,
    status: e.status,
    createdAt: e.createdAt,
  }
}

/** GET /escrows — server already scopes non-admins to their own
 * transactions (see escrowController.getAll), so an admin caller
 * transparently sees everything matching the filter, no special casing
 * needed here. */
export function useEscrowQuery(filter: { projectId?: string; type?: string; status?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['escrow', filter],
    queryFn: async (): Promise<{ entries: EscrowEntry[]; total: number }> => {
      const { data } = await api.get<{ data: BackendEscrow[]; meta: { total: number } }>('/escrows', {
        params: { ...filter, limit: filter.limit ?? 100 },
      })
      return { entries: data.data.map(mapEscrow), total: data.meta.total }
    },
    staleTime: 10_000,
  })
}

export function useAdminRefundEscrowMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (escrowId: string) => {
      const { data } = await api.post<{ data: BackendEscrow }>(
        `/escrows/${escrowId}/refund`,
        {},
        { headers: { 'Idempotency-Key': `admin-refund-${escrowId}-${Date.now()}` } }
      )
      return mapEscrow(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escrow'] }),
  })
}

export interface CreateEscrowInput {
  projectId: string
  type: 'fund' | 'release' | 'refund' | 'fee_deduction'
  grossAmount: number
  netAmount: number
  paymentProvider: 'mtn_momo' | 'orange_money' | 'flutterwave' | 'stripe'
  providerRole: 'collection' | 'disbursement'
  status?: 'pending' | 'completed' | 'failed' | 'reversed'
  reason: string
}

/** Admin manual ledger entry — e.g. recording an off-platform payment.
 * `reason` is required and recorded in the audit log (see
 * escrowController.adminCreate), not stored on the Escrow document itself. */
export function useAdminCreateEscrowMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateEscrowInput) => {
      const { data } = await api.post<{ data: BackendEscrow }>('/escrows', input)
      return mapEscrow(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escrow'] }),
  })
}

export interface UpdateEscrowInput {
  status?: 'pending' | 'completed' | 'failed' | 'reversed'
  grossAmount?: number
  netAmount?: number
  reason: string
}

export function useAdminUpdateEscrowMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ escrowId, input }: { escrowId: string; input: UpdateEscrowInput }) => {
      const { data } = await api.patch<{ data: BackendEscrow }>(`/escrows/${escrowId}`, input)
      return mapEscrow(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escrow'] }),
  })
}

export function useAdminRemoveEscrowMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ escrowId, reason }: { escrowId: string; reason: string }) => {
      await api.delete(`/escrows/${escrowId}`, { data: { reason } })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['escrow'] }),
  })
}
