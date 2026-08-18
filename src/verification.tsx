import { createContext, useContext, type ReactNode } from 'react'
import { useApp } from './context'
import {
  useMyVerifierProfileQuery,
  useUpsertVerifierProfileMutation,
  type VerifierProfileRecord,
} from './api/verifierProfiles'

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

// ── Context ──────────────────────────────────────────────────────────────────────
// Backed by the real verifier-profiles API (see api/verifierProfiles.ts) —
// verifier is a trust-elevating role (Phase 0's role-escalation fix made it
// admin-grant-only), so registerVerifier submits a real application for
// admin review rather than granting anything itself.
interface VerificationContextValue {
  verifierProfile: VerifierProfileRecord | null | undefined
  registerVerifier: (input: { specialties: string[]; regions: string[]; bio?: string; file?: File | null }) => void
}

const VerificationContext = createContext<VerificationContextValue>({} as VerificationContextValue)

export function VerificationProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useApp()
  const { data: verifierProfile } = useMyVerifierProfileQuery(isLoggedIn)
  const upsert = useUpsertVerifierProfileMutation()

  const registerVerifier = (input: { specialties: string[]; regions: string[]; bio?: string; file?: File | null }) => {
    upsert.mutate(input)
  }

  return (
    <VerificationContext.Provider value={{ verifierProfile, registerVerifier }}>
      {children}
    </VerificationContext.Provider>
  )
}

export const useVerification = () => useContext(VerificationContext)
