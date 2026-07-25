import { createContext, useContext, useState, type ReactNode } from 'react'

// ── KYC / AML verification ──────────────────────────────────────────────────────
export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface KycCase {
  id: string
  userName: string
  status: KycStatus
  submittedDate?: string
  rejectionReason?: string
  isYou?: boolean
}

// Transactions above this amount require a verified identity before they can proceed.
export const KYC_LARGE_TXN_THRESHOLD = 1000000

const SEED_KYC_CASES: KycCase[] = [
  { id: 'kyc1', userName: 'You', status: 'unverified', isYou: true },
  { id: 'kyc2', userName: 'Divine Che', status: 'rejected', submittedDate: '10 Jul 2026', rejectionReason: 'ID photo unreadable — document appears blurry and expired.' },
  { id: 'kyc3', userName: 'Patrice Onana', status: 'pending', submittedDate: '19 Jul 2026' },
]

interface ComplianceContextValue {
  kycCases: KycCase[]
  myKyc: KycCase
  submitKyc: () => void
  decideKyc: (id: string, status: 'verified' | 'rejected', reason?: string) => void
}

const ComplianceContext = createContext<ComplianceContextValue>({} as ComplianceContextValue)

export function ComplianceProvider({ children }: { children: ReactNode }) {
  const [kycCases, setKycCases] = useState<KycCase[]>(SEED_KYC_CASES)

  const submitKyc = () => {
    setKycCases((cs) => cs.map((c) => (c.isYou ? { ...c, status: 'pending', submittedDate: 'Just now', rejectionReason: undefined } : c)))
  }
  const decideKyc = (id: string, status: 'verified' | 'rejected', reason?: string) => {
    setKycCases((cs) => cs.map((c) => (c.id === id ? { ...c, status, rejectionReason: status === 'rejected' ? reason : undefined } : c)))
  }

  const myKyc = kycCases.find((c) => c.isYou)!

  return (
    <ComplianceContext.Provider value={{ kycCases, myKyc, submitKyc, decideKyc }}>
      {children}
    </ComplianceContext.Provider>
  )
}

export const useCompliance = () => useContext(ComplianceContext)
