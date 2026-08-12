import { useNavigate } from 'react-router-dom'
import { fmt } from '../context'
import { FONT } from './MobileLayout'
import { useMyKycStatusQuery, KYC_LARGE_TXN_THRESHOLD } from '../api/kyc'

/** Whether a transaction of this size is blocked pending identity verification — used to both show the banner and disable the confirm button. */
export function useKycGate(amount: number) {
  const { data: status = 'unverified' } = useMyKycStatusQuery()
  const blocked = amount > KYC_LARGE_TXN_THRESHOLD && status !== 'verified'
  return { blocked, threshold: KYC_LARGE_TXN_THRESHOLD }
}

/**
 * Blocking banner shown on any large-transaction screen (fund a project, make
 * a land offer) once the amount crosses the AML threshold and the user isn't
 * KYC-verified yet. Renders nothing once verified or below the threshold.
 */
export function KycGateBanner({ amount }: { amount: number }) {
  const nav = useNavigate()
  const { blocked, threshold } = useKycGate(amount)
  if (!blocked) return null

  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--status-error-bg)', borderColor: 'var(--status-error-bg)' }}>
      <div style={{ fontFamily: FONT.mono, color: 'var(--status-error-text)' }} className="text-[10px] uppercase tracking-widest mb-1">Identity verification required</div>
      <p style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }} className="text-xs leading-relaxed mb-3">
        Transactions over {fmt(threshold)} require ID verification (KYC/AML) before they can proceed.
      </p>
      <button onClick={() => nav('/compliance/kyc')} style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }} className="text-xs font-bold">
        Verify your identity →
      </button>
    </div>
  )
}
