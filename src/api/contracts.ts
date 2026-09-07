import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface Contract {
  id: string
  projectId: string
  projectTitle: string
  totalAmount: number
  bidId: string
  generatedDocumentText: string
  generatedDocumentUrl: string
  status: 'active' | 'completed' | 'terminated'
  createdAt: string
}

interface BackendContract {
  _id: string
  projectId: { _id: string; title: string; totalAmount: number } | string
  bidId: string
  generatedDocumentText: string
  generatedDocumentUrl: string
  status: 'active' | 'completed' | 'terminated'
  createdAt: string
}

function mapContract(doc: BackendContract): Contract {
  return {
    id: doc._id,
    projectId: typeof doc.projectId === 'object' ? doc.projectId._id : doc.projectId,
    projectTitle: typeof doc.projectId === 'object' ? doc.projectId.title : 'Project',
    totalAmount: typeof doc.projectId === 'object' ? doc.projectId.totalAmount : 0,
    bidId: doc.bidId,
    generatedDocumentText: doc.generatedDocumentText || '',
    generatedDocumentUrl: doc.generatedDocumentUrl || '',
    status: doc.status,
    createdAt: new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  }
}

/** No filter = every real contract the caller is a party to — as funder
 * (via project ownership) or contractor (via their bid) — server-scoped the
 * same way land offers/escrows are (see contractController.getAll). */
export function useContractsQuery(filter: { projectId?: string; bidId?: string; status?: string; contractorId?: string } = {}) {
  return useQuery({
    queryKey: ['contracts', filter],
    queryFn: async (): Promise<Contract[]> => {
      const { data } = await api.get<{ data: BackendContract[] }>('/contracts', { params: filter })
      return data.data.map(mapContract)
    },
    staleTime: 10_000,
  })
}

export function useContractQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: async (): Promise<Contract> => {
      const { data } = await api.get<{ data: BackendContract }>(`/contracts/${id}`)
      return mapContract(data.data)
    },
    enabled: Boolean(id),
    staleTime: 10_000,
  })
}

function useContractAction(action: 'complete' | 'terminate') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: BackendContract }>(`/contracts/${id}/${action}`)
      return mapContract(data.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] })
      qc.invalidateQueries({ queryKey: ['contract'] })
    },
  })
}

export const useCompleteContractMutation = () => useContractAction('complete')
export const useTerminateContractMutation = () => useContractAction('terminate')

export interface CreateContractInput {
  projectId: string
  bidId: string
  generatedDocumentText?: string
  status?: Contract['status']
}

/** Admin-only — contracts are normally system-generated when a bid is
 * accepted; this backfills/corrects a real hire recorded outside that flow. */
export function useAdminCreateContractMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateContractInput) => {
      const { data } = await api.post<{ data: BackendContract }>('/contracts', input)
      return mapContract(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
}

export function useAdminUpdateContractMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ contractId, input }: { contractId: string; input: { generatedDocumentText?: string; status?: Contract['status'] } }) => {
      const { data } = await api.patch<{ data: BackendContract }>(`/contracts/${contractId}`, input)
      return mapContract(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
}

export function useAdminRemoveContractMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contractId: string) => {
      await api.delete(`/contracts/${contractId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
}

export interface WithdrawableEscrow {
  id: string
  projectTitle: string
  netAmount: number
  currency: string
  createdAt: string
}

export interface WithdrawableBalance {
  available: number
  currency: string
  escrows: WithdrawableEscrow[]
}

interface BackendWithdrawableEscrow {
  _id: string
  netAmount: number
  currency: string
  createdAt: string
  projectId?: { _id: string; title: string } | string | null
}

/** Real shape from GET /escrows/withdrawable (escrowController.getWithdrawable)
 * — a single `available` total plus the underlying escrow records. Ported
 * from MboaTrustAPP/api/contracts.ts, which already had this; web's
 * EarningsScreen only showed read-only transaction history with no
 * withdrawable-balance concept at all. */
export function useWithdrawableBalanceQuery() {
  return useQuery({
    queryKey: ['escrows', 'withdrawable'],
    queryFn: async (): Promise<WithdrawableBalance> => {
      const { data } = await api.get<{ data: { available: number; currency: string; escrows: BackendWithdrawableEscrow[] } }>('/escrows/withdrawable')
      return {
        available: data.data.available,
        currency: data.data.currency,
        escrows: data.data.escrows.map((e) => ({
          id: e._id,
          projectTitle: typeof e.projectId === 'object' && e.projectId ? e.projectId.title : 'Project',
          netAmount: e.netAmount,
          currency: e.currency,
          createdAt: e.createdAt,
        })),
      }
    },
    staleTime: 15_000,
  })
}

/** Marks every currently-available escrow as withdrawn — money already
 * moved to the contractor's payout method automatically at milestone-release
 * time; this never re-disburses or takes a fee, it only records the claim.
 * No amount choice, no payment-method selection — the real endpoint takes no
 * body at all. */
export function useWithdrawMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: { amount: number; currency: string; count: number; withdrawnAt: string } }>('/escrows/withdraw', {})
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escrows', 'withdrawable'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
