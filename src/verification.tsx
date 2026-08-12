import { createContext, useContext, useState, type ReactNode } from 'react'

// ── Evidence metadata (anti-fraud indicators) ──────────────────────────────────
// Type only — the real values now come from the backend's own evidence
// analysis (locationMatch/timestampRecent/duplicateFlag on each submitted
// Evidence record), not this context. Kept here since components across the
// app (BeforeAfterComparison, EvidenceMetadataBadge) type their `meta` prop
// against it.
export interface EvidenceMeta {
  locationMatch: boolean
  timestampRecent: boolean
  duplicateCheck: boolean // true = passed (unique), false = flagged as a possible duplicate
  flagged: boolean
  flagReason?: string
}

// ── Human verifier role ─────────────────────────────────────────────────────────
export type VerifierTaskStatus = 'pending' | 'in_progress' | 'submitted'
export type VerifierTaskType = 'milestone' | 'land'

export interface VerifierTaskReport {
  match: boolean
  notes: string
  photos: number
  submittedAt: string
}

export interface VerifierTask {
  id: string
  type: VerifierTaskType
  projectId: string
  projectTitle: string
  milestoneTitle?: string
  location: string
  dueDate: string
  status: VerifierTaskStatus
  report?: VerifierTaskReport
}

export interface VerifierAssignment {
  verifierName: string
  status: VerifierTaskStatus
  eta: string
}

export interface VerifierProfile {
  name: string
  phone: string
  region: string
  idUploaded: boolean
  completedTasks: number
  rating: number
}

// ── Reputation & red flags ───────────────────────────────────────────────────────
export type RiskLevel = 'new' | 'good_standing' | 'flagged'

// ── Multi-signature milestone release ──────────────────────────────────────────
// Type only — display shape for ApprovalStatusList. Real approver state
// lives on Project.milestones[].approvers (see api/projects.ts's
// MilestoneApprover / mapApprover); this context no longer tracks it.
export interface Approver {
  name: string
  status: 'approved' | 'pending'
}

// ── Seed / mock data ────────────────────────────────────────────────────────────
const SEED_VERIFIER_TASKS: VerifierTask[] = [
  { id: 'vt1', type: 'milestone', projectId: 'p1', projectTitle: 'Borehole — Bamenda North', milestoneTitle: 'Drilling & casing', location: 'Bamenda, NW Region', dueDate: '24 Jul 2026', status: 'pending' },
  { id: 'vt2', type: 'land', projectId: 'l1', projectTitle: '800m² residential plot — Bastos, Yaoundé', location: 'Bastos, Yaoundé', dueDate: '26 Jul 2026', status: 'pending' },
  { id: 'vt3', type: 'milestone', projectId: 'p3', projectTitle: 'Maternity clinic renovation — Limbe', milestoneTitle: 'Foundation & walls', location: 'Limbe, SW Region', dueDate: '20 Jul 2026', status: 'in_progress' },
  {
    id: 'vt4', type: 'milestone', projectId: 'p2', projectTitle: 'Primary school roof — Maroua', milestoneTitle: 'Final roofing & inspection', location: 'Maroua, Far North', dueDate: '15 Jul 2026', status: 'submitted',
    report: { match: true, notes: 'Roofing matches submitted proof. No issues observed on site.', photos: 3, submittedAt: '15 Jul 2026' },
  },
]

const SEED_VERIFIER_PROFILE: VerifierProfile = {
  name: 'Njikam P.', phone: '+237 677 000 111', region: 'North West Region', idUploaded: true, completedTasks: 47, rating: 4.9,
}

// ── Context ──────────────────────────────────────────────────────────────────────
interface VerificationContextValue {
  verifierProfile: VerifierProfile | null
  registerVerifier: (p: Pick<VerifierProfile, 'name' | 'phone' | 'region' | 'idUploaded'>) => void

  verifierTasks: VerifierTask[]
  startTask: (taskId: string) => void
  submitTaskReport: (taskId: string, report: { match: boolean; notes: string; photos: number }) => void
}

const VerificationContext = createContext<VerificationContextValue>({} as VerificationContextValue)

export function VerificationProvider({ children }: { children: ReactNode }) {
  const [verifierProfile, setVerifierProfile] = useState<VerifierProfile | null>(SEED_VERIFIER_PROFILE)
  const [verifierTasks, setVerifierTasks] = useState<VerifierTask[]>(SEED_VERIFIER_TASKS)

  const registerVerifier = (p: Pick<VerifierProfile, 'name' | 'phone' | 'region' | 'idUploaded'>) => {
    setVerifierProfile({ ...p, completedTasks: 0, rating: 0 })
  }

  const startTask = (taskId: string) => {
    setVerifierTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status: 'in_progress' } : t)))
  }
  const submitTaskReport = (taskId: string, report: { match: boolean; notes: string; photos: number }) => {
    setVerifierTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status: 'submitted', report: { ...report, submittedAt: 'Just now' } } : t)))
    setVerifierProfile((p) => (p ? { ...p, completedTasks: p.completedTasks + 1 } : p))
  }

  return (
    <VerificationContext.Provider
      value={{
        verifierProfile, registerVerifier,
        verifierTasks, startTask, submitTaskReport,
      }}
    >
      {children}
    </VerificationContext.Provider>
  )
}

export const useVerification = () => useContext(VerificationContext)
