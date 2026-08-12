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
export function useContractsQuery(filter: { projectId?: string; bidId?: string; status?: string } = {}) {
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
