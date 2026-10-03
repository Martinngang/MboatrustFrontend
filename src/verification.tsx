import { createContext, useContext, type ReactNode } from 'react'
import { useApp } from './context'
import {
  useMyVerifierProfileQuery,
  useUpsertVerifierProfileMutation,
  type VerifierProfileRecord,
} from './api/verifierProfiles'
import type { VerificationTaskLocationDetails } from './api/reputation'

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
export type VerifierTaskType = 'milestone' | 'land' | 'location'

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
  /** Only meaningful for type 'location' — the project's original
   * (pre-confirmation) coordinates/place name, for context on what the
   * verifier is being asked to confirm or correct. */
  coordinates?: { lat: number; lng: number } | null
  locationDetails?: VerificationTaskLocationDetails | null
  /** Only meaningful for type 'location', once submitted — the verifier's
   * confirmed coordinates/place name. */
  confirmedLocation?: { lat: number; lng: number } | null
  confirmedLocationDetails?: VerificationTaskLocationDetails | null
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
interface RegisterVerifierInput {
  specialties: string[]
  regions: string[]
  bio?: string
  file?: File | null
  /** Already resolved client-side by useLocationCapture — the backend
   * (verifierProfileController.upsertMine) already accepts and persists
   * these alongside `location`. */
  location?: { lat: number; lng: number } | null
  placeName?: string | null
  formattedAddress?: string | null
  locationSource?: string
}

interface VerificationContextValue {
  verifierProfile: VerifierProfileRecord | null | undefined
  registerVerifier: (input: RegisterVerifierInput) => void
}

const VerificationContext = createContext<VerificationContextValue>({} as VerificationContextValue)

export function VerificationProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useApp()
  const { data: verifierProfile } = useMyVerifierProfileQuery(isLoggedIn)
  const upsert = useUpsertVerifierProfileMutation()

  const registerVerifier = (input: RegisterVerifierInput) => {
    upsert.mutate(input)
  }

  return (
    <VerificationContext.Provider value={{ verifierProfile, registerVerifier }}>
      {children}
    </VerificationContext.Provider>
  )
}

export const useVerification = () => useContext(VerificationContext)
