import { createContext, useContext, useState, type ReactNode } from 'react'

// ── Group / pooled funding ───────────────────────────────────────────────────────
export interface Contributor {
  id: string
  projectId: string
  name: string
  amount: number
  date: string
  isYou?: boolean
}

// ── Recurring contributions ──────────────────────────────────────────────────────
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly'
export type RecurringEndType = 'ongoing' | 'until_date' | 'occurrences'
export type RecurringStatus = 'active' | 'paused' | 'cancelled'

export interface RecurringContribution {
  id: string
  projectId: string
  projectTitle: string
  amount: number
  frequency: RecurringFrequency
  endType: RecurringEndType
  endDate?: string
  occurrences?: number
  nextChargeDate: string
  status: RecurringStatus
}

const SEED_CONTRIBUTORS: Record<string, Contributor[]> = {
  p1: [
    { id: 'ct1', projectId: 'p1', name: 'Marie-Claire N.', amount: 1200000, date: '28 Jun 2026', isYou: true },
    { id: 'ct2', projectId: 'p1', name: 'Théodore K.', amount: 600000, date: '2 Jul 2026' },
    { id: 'ct3', projectId: 'p1', name: 'Rosine A.', amount: 300000, date: '10 Jul 2026' },
  ],
}

const SEED_RECURRING: RecurringContribution[] = [
  {
    id: 'rc1', projectId: 'p3', projectTitle: 'Maternity clinic renovation — Limbe',
    amount: 50000, frequency: 'monthly', endType: 'ongoing', nextChargeDate: '1 Aug 2026', status: 'active',
  },
]

interface FundingContextValue {
  contributors: Record<string, Contributor[]>
  addContributor: (projectId: string, name: string, amount: number) => Contributor

  recurringContributions: RecurringContribution[]
  addRecurring: (r: Omit<RecurringContribution, 'id' | 'status' | 'nextChargeDate'>) => RecurringContribution
  pauseRecurring: (id: string) => void
  resumeRecurring: (id: string) => void
  cancelRecurring: (id: string) => void
}

const FundingContext = createContext<FundingContextValue>({} as FundingContextValue)

let idCounter = 1000
const nextId = (prefix: string) => `${prefix}${idCounter++}`

function nextChargeLabel(frequency: RecurringFrequency) {
  const labels: Record<RecurringFrequency, string> = { weekly: 'in 7 days', monthly: 'in 1 month', quarterly: 'in 3 months' }
  return labels[frequency]
}

export function FundingProvider({ children }: { children: ReactNode }) {
  const [contributors, setContributors] = useState<Record<string, Contributor[]>>(SEED_CONTRIBUTORS)
  const [recurringContributions, setRecurringContributions] = useState<RecurringContribution[]>(SEED_RECURRING)

  const addContributor = (projectId: string, name: string, amount: number) => {
    const created: Contributor = { id: nextId('ct'), projectId, name, amount, date: 'Just now' }
    setContributors((c) => ({ ...c, [projectId]: [...(c[projectId] ?? []), created] }))
    return created
  }

  const addRecurring = (r: Omit<RecurringContribution, 'id' | 'status' | 'nextChargeDate'>) => {
    const created: RecurringContribution = { ...r, id: nextId('rc'), status: 'active', nextChargeDate: nextChargeLabel(r.frequency) }
    setRecurringContributions((rs) => [created, ...rs])
    return created
  }
  const pauseRecurring = (id: string) => setRecurringContributions((rs) => rs.map((r) => (r.id === id ? { ...r, status: 'paused' } : r)))
  const resumeRecurring = (id: string) => setRecurringContributions((rs) => rs.map((r) => (r.id === id ? { ...r, status: 'active' } : r)))
  const cancelRecurring = (id: string) => setRecurringContributions((rs) => rs.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)))

  return (
    <FundingContext.Provider value={{ contributors, addContributor, recurringContributions, addRecurring, pauseRecurring, resumeRecurring, cancelRecurring }}>
      {children}
    </FundingContext.Provider>
  )
}

export const useFunding = () => useContext(FundingContext)
