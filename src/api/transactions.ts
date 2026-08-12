import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export interface Transaction {
  id: string
  projectId: string
  projectTitle: string
  type: 'fund' | 'release' | 'refund' | 'fee_deduction'
  /** Always positive — the real net amount of this transaction. Whether it
   * reads as money in or out depends on the viewer's relationship to it
   * (a funder's 'fund' is an outflow; a contractor's 'release' is an
   * inflow), which only the screen showing it knows — see each consumer's
   * own sign/label mapping rather than baking one universal sign in here. */
  amount: number
  currency: string
  status: string
  date: string
}

interface BackendEscrow {
  _id: string
  projectId: { _id: string; title: string } | string
  type: 'fund' | 'release' | 'refund' | 'fee_deduction'
  netAmount: number
  currency: string
  status: string
  createdAt: string
}

function mapTransaction(doc: BackendEscrow): Transaction {
  return {
    id: doc._id,
    projectId: typeof doc.projectId === 'object' ? doc.projectId._id : doc.projectId,
    projectTitle: typeof doc.projectId === 'object' ? doc.projectId.title : 'Project',
    type: doc.type,
    amount: doc.netAmount,
    currency: doc.currency,
    status: doc.status,
    date: new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  }
}

/** No filter = every real Escrow transaction the caller is a party to — as
 * a funder (via project ownership) or a contractor (via contractorId) —
 * server-scoped the same way land offers are (see escrowController.getAll);
 * an admin instead sees the platform-wide, unscoped list. */
export function useTransactionsQuery(filter: { projectId?: string } = {}) {
  return useQuery({
    queryKey: ['transactions', filter],
    queryFn: async (): Promise<Transaction[]> => {
      const { data } = await api.get<{ data: BackendEscrow[] }>('/escrows', { params: filter })
      return data.data.map(mapTransaction)
    },
    staleTime: 10_000,
  })
}
