import { createContext, useContext, useState, type ReactNode } from 'react'

// ── Evidence metadata (anti-fraud indicators) ──────────────────────────────────
export interface EvidenceMeta {
  locationMatch: boolean
  timestampRecent: boolean
  duplicateCheck: boolean // true = passed (unique), false = flagged as a possible duplicate
  flagged: boolean
  flagReason?: string
}

const CLEAN_META: EvidenceMeta = { locationMatch: true, timestampRecent: true, duplicateCheck: true, flagged: false }

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

// ── Community co-signing ─────────────────────────────────────────────────────────
export type CoSignerDecision = 'pending' | 'approved' | 'flagged'

export interface CoSigner {
  id: string
  projectId: string
  name: string
  phone: string
  status: CoSignerDecision
  note?: string
}

// ── Reputation & red flags ───────────────────────────────────────────────────────
export type RiskLevel = 'new' | 'good_standing' | 'flagged'

export interface DisputeRecord {
  id: string
  userName: string
  project: string
  issue: string
  outcome: 'Resolved — funds released' | 'Resolved — funds returned' | 'Open'
  raisedBy: string
  date: string
}

// ── Multi-signature milestone release ──────────────────────────────────────────
export interface Approver {
  name: string
  status: 'approved' | 'pending'
}

// ── Live video verification ────────────────────────────────────────────────────
export type VideoCallStatus = 'none' | 'requested' | 'scheduled'

export interface VideoCallRequest {
  status: VideoCallStatus
  scheduledFor?: string
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

const SEED_EVIDENCE_META: Record<string, EvidenceMeta> = {
  // Borehole — drilling milestone: clean, verifier-confirmed
  'p1:m2': { locationMatch: true, timestampRecent: true, duplicateCheck: true, flagged: false },
  // Clinic — foundation milestone: this is the one under active dispute elsewhere in the app
  'p3:m2': {
    locationMatch: true, timestampRecent: false, duplicateCheck: false, flagged: true,
    flagReason: 'Timestamp is 9 days old and the image closely matches a photo submitted for a different milestone. Flagged for verifier review.',
  },
}

const SEED_CO_SIGNERS: Record<string, CoSigner[]> = {
  p1: [{ id: 'cs1', projectId: 'p1', name: 'Chief Njoya T.', phone: '+237 677 555 010', status: 'approved', note: 'Confirmed with the village committee — work matches.' }],
  p3: [{ id: 'cs2', projectId: 'p3', name: 'Pastor Ekwalla M.', phone: '+237 677 555 020', status: 'pending' }],
}

const SEED_DISPUTES: DisputeRecord[] = [
  { id: 'dh1', userName: 'Emmanuel Njang', project: 'Borehole — Bamenda North', issue: 'Proof does not match milestone', outcome: 'Open', raisedBy: 'Marie-Claire N.', date: '18 Jul 2026' },
  { id: 'dh2', userName: 'Dr. Ngole Mbah', project: 'Clinic renovation — Limbe', issue: 'Work appears incomplete', outcome: 'Open', raisedBy: 'Théodore K.', date: '15 Jul 2026' },
]

// ── Context ──────────────────────────────────────────────────────────────────────
interface VerificationContextValue {
  evidenceMeta: Record<string, EvidenceMeta>
  getEvidenceMeta: (key: string) => EvidenceMeta
  setEvidenceFlag: (key: string, flagged: boolean, reason?: string) => void

  verifierProfile: VerifierProfile | null
  registerVerifier: (p: Pick<VerifierProfile, 'name' | 'phone' | 'region' | 'idUploaded'>) => void

  verifierTasks: VerifierTask[]
  startTask: (taskId: string) => void
  submitTaskReport: (taskId: string, report: { match: boolean; notes: string; photos: number }) => void

  coSigners: Record<string, CoSigner[]>
  addCoSigner: (projectId: string, name: string, phone: string) => CoSigner
  decideCoSigner: (coSignerId: string, decision: 'approved' | 'flagged', note?: string) => void
  findCoSigner: (coSignerId: string) => CoSigner | undefined

  disputeHistory: DisputeRecord[]
  addDispute: (d: Omit<DisputeRecord, 'id'>) => DisputeRecord

  multiSigApprovers: Record<string, Approver[]>
  setMultiSigApprovers: (key: string, approvers: Approver[]) => void
  approveAsApprover: (key: string, approverName: string) => Approver[]

  videoCallRequests: Record<string, VideoCallRequest>
  requestVideoCall: (key: string) => void
  scheduleVideoCall: (key: string, when: string) => void
}

const VerificationContext = createContext<VerificationContextValue>({} as VerificationContextValue)

let idCounter = 1000
const nextId = (prefix: string) => `${prefix}${idCounter++}`

export function VerificationProvider({ children }: { children: ReactNode }) {
  const [evidenceMeta, setEvidenceMeta] = useState<Record<string, EvidenceMeta>>(SEED_EVIDENCE_META)
  const [verifierProfile, setVerifierProfile] = useState<VerifierProfile | null>(SEED_VERIFIER_PROFILE)
  const [verifierTasks, setVerifierTasks] = useState<VerifierTask[]>(SEED_VERIFIER_TASKS)
  const [coSigners, setCoSigners] = useState<Record<string, CoSigner[]>>(SEED_CO_SIGNERS)
  const [disputeHistory, setDisputeHistory] = useState<DisputeRecord[]>(SEED_DISPUTES)
  const [multiSigApprovers, setMultiSigApproversState] = useState<Record<string, Approver[]>>({})
  const [videoCallRequests, setVideoCallRequests] = useState<Record<string, VideoCallRequest>>({})

  const getEvidenceMeta = (key: string) => evidenceMeta[key] ?? CLEAN_META
  const setEvidenceFlag = (key: string, flagged: boolean, reason?: string) => {
    setEvidenceMeta((m) => ({ ...m, [key]: { ...(m[key] ?? CLEAN_META), flagged, flagReason: reason } }))
  }

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

  const addCoSigner = (projectId: string, name: string, phone: string) => {
    const created: CoSigner = { id: nextId('cs'), projectId, name, phone, status: 'pending' }
    setCoSigners((cs) => ({ ...cs, [projectId]: [...(cs[projectId] ?? []), created] }))
    return created
  }
  const decideCoSigner = (coSignerId: string, decision: 'approved' | 'flagged', note?: string) => {
    setCoSigners((cs) => {
      const next = { ...cs }
      for (const projectId of Object.keys(next)) {
        next[projectId] = next[projectId].map((c) => (c.id === coSignerId ? { ...c, status: decision, note } : c))
      }
      return next
    })
  }
  const findCoSigner = (coSignerId: string) => Object.values(coSigners).flat().find((c) => c.id === coSignerId)

  const addDispute = (d: Omit<DisputeRecord, 'id'>) => {
    const created = { ...d, id: nextId('dh') }
    setDisputeHistory((ds) => [created, ...ds])
    return created
  }

  const setMultiSigApprovers = (key: string, approvers: Approver[]) => {
    setMultiSigApproversState((m) => ({ ...m, [key]: approvers }))
  }
  const approveAsApprover = (key: string, approverName: string) => {
    let result: Approver[] = []
    setMultiSigApproversState((prev) => {
      const current = prev[key] ?? []
      result = current.map((a) => (a.name === approverName ? { ...a, status: 'approved' } : a))
      return { ...prev, [key]: result }
    })
    return result
  }

  const requestVideoCall = (key: string) => {
    setVideoCallRequests((v) => ({ ...v, [key]: { status: 'requested' } }))
  }
  const scheduleVideoCall = (key: string, when: string) => {
    setVideoCallRequests((v) => ({ ...v, [key]: { status: 'scheduled', scheduledFor: when } }))
  }

  return (
    <VerificationContext.Provider
      value={{
        evidenceMeta, getEvidenceMeta, setEvidenceFlag,
        verifierProfile, registerVerifier,
        verifierTasks, startTask, submitTaskReport,
        coSigners, addCoSigner, decideCoSigner, findCoSigner,
        disputeHistory, addDispute,
        multiSigApprovers, setMultiSigApprovers, approveAsApprover,
        videoCallRequests, requestVideoCall, scheduleVideoCall,
      }}
    >
      {children}
    </VerificationContext.Provider>
  )
}

export const useVerification = () => useContext(VerificationContext)
