import { C, FONT } from './MobileLayout'

export type FundingMode = 'staged' | 'full_upfront'

const OPTIONS: { id: FundingMode; label: string; desc: string }[] = [
  { id: 'staged', label: 'Staged — fund as you go', desc: 'Escrow is funded milestone by milestone. A milestone starts once its amount is in escrow; the funder tops up before each next one.' },
  { id: 'full_upfront', label: 'Full upfront', desc: 'The whole contract value must be in escrow before any milestone starts.' },
]

export function fundingModeLabel(mode: FundingMode): string {
  return mode === 'full_upfront' ? 'Full upfront funding' : 'Staged funding'
}

/** How escrow gets funded under a proposal — negotiated per round alongside
 * price/timeline/schedule; the accepted round's value becomes the project's
 * funding mode. Staged is the default. */
export function FundingModeSelector({ value, onChange }: { value: FundingMode; onChange: (mode: FundingMode) => void }) {
  return (
    <div>
      <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Escrow funding</label>
      <div className="space-y-2">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className="w-full text-left rounded-xl border-2 px-3 py-2.5"
            style={{ borderColor: value === o.id ? C.forest : C.parchmentDark, background: value === o.id ? 'var(--status-success-bg)' : C.white }}
          >
            <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{o.label}</div>
            <div style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-0.5 leading-relaxed">{o.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
