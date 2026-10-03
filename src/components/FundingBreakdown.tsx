import { C, FONT, StatusBadge, fmt } from './MobileLayout'
import type { FundingSummary, MilestoneFunding } from '../api/projects'

/** Which StatusBadge best describes a milestone's escrow situation. Released
 * milestones need no funding badge (their own status already says so). */
export function milestoneFundingBadgeStatus(m: MilestoneFunding): string | null {
  if (m.fundingStatus === 'released') return null
  if (m.awaitingFunds) return 'awaiting_funds'
  if (m.fundingStatus === 'funded') return 'funded'
  if (m.proceedAtRisk) return 'at_risk'
  return m.fundingStatus === 'partially_funded' ? 'partially_funded' : 'unfunded'
}

export function MilestoneFundingBadge({ milestone }: { milestone: MilestoneFunding | undefined }) {
  if (!milestone) return null
  const status = milestoneFundingBadgeStatus(milestone)
  return status ? <StatusBadge status={status} /> : null
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="min-w-0">
      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest">{label}</div>
      <div style={{ fontFamily: FONT.serif, color: tone ?? C.ink }} className="text-sm font-bold truncate">{fmt(value)}</div>
    </div>
  )
}

/** The four separate numbers of a contract — Total Contract Value, Currently
 * Funded, Released, Remaining to Fund — plus a bar that shows how the total
 * splits into released / still in escrow / unfunded. Everything comes from the
 * backend's funding state; nothing is derived here. */
export function FundingBreakdown({ funding, title = 'Escrow funding' }: { funding: FundingSummary; title?: string }) {
  const total = Math.max(funding.totalContractValue, 1)
  const releasedPct = Math.min(100, (funding.releasedAmount / total) * 100)
  const escrowPct = Math.min(100 - releasedPct, (Math.max(funding.inEscrow, 0) / total) * 100)
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
      <div className="flex items-center justify-between mb-3">
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">{title}</div>
        <span
          style={{ fontFamily: FONT.mono, background: C.parchment, color: C.inkMuted }}
          className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full"
        >
          {funding.fundingMode === 'full_upfront' ? 'Full upfront' : 'Staged funding'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Total contract value" value={funding.totalContractValue} />
        <Stat label="Currently funded" value={funding.fundedAmount} tone={C.forest} />
        <Stat label="Released" value={funding.releasedAmount} />
        <Stat label="Remaining to fund" value={funding.remainingToFund} tone={funding.remainingToFund > 0 ? C.amber : C.forest} />
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full mt-3" style={{ background: C.parchmentDark }} aria-label="Contract funding split">
        <div style={{ width: `${releasedPct}%`, background: C.inkMuted }} title="Released" />
        <div style={{ width: `${escrowPct}%`, background: C.forest }} title="In escrow" />
      </div>
      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="flex justify-between text-[9px] uppercase tracking-wider mt-1.5">
        <span>{fmt(funding.inEscrow)} in escrow now</span>
        {funding.pendingFunding > 0 && <span>{fmt(funding.pendingFunding)} pending</span>}
      </div>
    </div>
  )
}
