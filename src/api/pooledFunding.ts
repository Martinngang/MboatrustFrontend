import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface PooledContribution {
  id: string
  projectId: string
  projectTitle: string
  contributorId: string
  contributorName: string
  amount: number
  currency: string
  isRecurring: boolean
  recurrenceIntervalDays: number | null
  nextChargeAt: string | null
  paused: boolean
  status: 'pending' | 'collected' | 'failed' | 'cancelled'
  date: string
}

interface BackendPooledContribution {
  _id: string
  projectId: { _id: string; title: string } | string
  contributorId: { _id: string; fullName: string } | string
  amount: number
  currency: string
  isRecurring: boolean
  recurrenceIntervalDays: number | null
  nextChargeAt: string | null
  paused: boolean
  status: 'pending' | 'collected' | 'failed' | 'cancelled'
  createdAt: string
}

function mapContribution(doc: BackendPooledContribution): PooledContribution {
  return {
    id: doc._id,
    projectId: typeof doc.projectId === 'object' ? doc.projectId._id : doc.projectId,
    projectTitle: typeof doc.projectId === 'object' ? doc.projectId.title : 'Project',
    contributorId: typeof doc.contributorId === 'object' ? doc.contributorId._id : doc.contributorId,
    contributorName: typeof doc.contributorId === 'object' ? doc.contributorId.fullName : 'Contributor',
    amount: doc.amount,
    currency: doc.currency,
    isRecurring: doc.isRecurring,
    recurrenceIntervalDays: doc.recurrenceIntervalDays,
    nextChargeAt: doc.nextChargeAt,
    paused: doc.paused,
    status: doc.status,
    date: new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  }
}

export function usePooledContributionsQuery(filter: { projectId?: string; contributorId?: string } = {}) {
  return useQuery({
    queryKey: ['pooledContributions', filter],
    queryFn: async (): Promise<PooledContribution[]> => {
      const { data } = await api.get<{ data: BackendPooledContribution[] }>('/pooled-contributions', { params: filter })
      return data.data.map(mapContribution)
    },
    enabled: Boolean(filter.projectId || filter.contributorId),
    staleTime: 10_000,
  })
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['pooledContributions'] })
  qc.invalidateQueries({ queryKey: ['projects'] })
}

/** Invites an existing, already-registered user to pledge toward the
 * project — a pending pledge they must still pay themselves via
 * useContributeMutation; no money moves yet. */
export function useInviteCoFunderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { projectId: string; contributorId: string; amount: number }) => {
      const { data } = await api.post<{ data: BackendPooledContribution }>('/pooled-contributions/invite', input)
      return mapContribution(data.data)
    },
    onSuccess: () => invalidate(qc),
  })
}

export interface ContributeInput {
  contributionId?: string
  projectId?: string
  amount?: number
  isRecurring?: boolean
  recurrenceIntervalDays?: number
  paymentProvider: 'mtn_momo' | 'orange_money'
  payerPhoneNumber: string
}

/** Pays a pledge — either fulfilling an invited (pending) contribution via
 * contributionId, or a self-initiated one-off/recurring pledge via
 * projectId+amount. Real money moves here, through the same collection path
 * as a normal single-funder deposit (see projectController.fundProject). */
export function useContributeMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ContributeInput) => {
      const { data } = await api.post<{ data: { contribution: BackendPooledContribution; escrow: unknown } }>(
        '/pooled-contributions/contribute',
        input,
        { headers: { 'Idempotency-Key': crypto.randomUUID() } }
      )
      return mapContribution(data.data.contribution)
    },
    onSuccess: () => invalidate(qc),
  })
}

function useRecurringAction(action: 'cancel-recurring' | 'pause-recurring' | 'resume-recurring') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contributionId: string) => {
      const { data } = await api.post<{ data: BackendPooledContribution }>(`/pooled-contributions/${contributionId}/${action}`)
      return mapContribution(data.data)
    },
    onSuccess: () => invalidate(qc),
  })
}

export const useCancelRecurringMutation = () => useRecurringAction('cancel-recurring')
export const usePauseRecurringMutation = () => useRecurringAction('pause-recurring')
export const useResumeRecurringMutation = () => useRecurringAction('resume-recurring')
