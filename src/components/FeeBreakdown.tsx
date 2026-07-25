import { fmt } from '../context'
import { C, FONT } from './MobileLayout'
import type { FeeResult } from '../feeConfig'

/**
 * The one fee-display component used everywhere a fee applies — funding,
 * contractor, land, or subscription screens. Pass it the result of a
 * `useFeeCalculation()` call and it renders consistently.
 *
 * `compact`: a single inline row (e.g. next to a checkbox/toggle).
 * default: a full receipt-style breakdown (amount, fee, result).
 */
export function FeeBreakdown({ result, amountLabel, note, compact }: {
  result: FeeResult
  amountLabel?: string
  note?: string
  compact?: boolean
}) {
  const sign = result.mode === 'deduct' ? '−' : '+'
  const showAmountRow = result.kind === 'percentage'

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: C.parchment }}>
        <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">{result.feeLabel}</span>
        <span style={{ fontFamily: FONT.mono, color: result.feeAmount > 0 ? C.ink : C.forest }} className="text-xs font-semibold">
          {result.feeAmount > 0 ? `${sign}${fmt(result.feeAmount)}` : 'Included'}
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border p-3.5" style={{ background: C.parchment, borderColor: C.parchmentDark }}>
      {showAmountRow && (
        <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
          <span>{amountLabel ?? result.amountLabel}</span>
          <span style={{ color: C.ink }}>{fmt(result.amount)}</span>
        </div>
      )}
      <div className={`flex justify-between text-xs ${showAmountRow ? 'mt-1' : ''}`} style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
        <span>{result.feeLabel}</span>
        <span style={{ color: C.ink }}>{result.feeAmount > 0 ? `${sign}${fmt(result.feeAmount)}` : 'Included'}</span>
      </div>
      <div
        className="mt-1.5 flex justify-between border-t pt-1.5 text-xs font-bold"
        style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, color: C.forest }}
      >
        <span>{result.resultLabel}</span>
        <span>{fmt(result.resultAmount)}</span>
      </div>
      {note && (
        <div className="mt-2 text-[10px] leading-relaxed" style={{ fontFamily: FONT.sans, color: C.inkSubtle }}>{note}</div>
      )}
    </div>
  )
}
