import { FONT, STATUS_TONE_VARS, type StatusTone } from './MobileLayout'
import type { RiskLevel } from '../verification'

/**
 * Trust signal shown on profiles wherever a funder is deciding whether to
 * commit money — mirrors StatusBadge's semantic-tone lookup for consistency
 * (and dark-mode correctness — these used to hardcode light-only hex).
 */
export function RiskBadge({ level }: { level: RiskLevel }) {
  const map: Record<RiskLevel, { tone: StatusTone; label: string }> = {
    new: { tone: 'info', label: 'New user' },
    good_standing: { tone: 'success', label: 'Good standing' },
    flagged: { tone: 'error', label: 'Flagged' },
  }
  const s = map[level]
  const { bg, text } = STATUS_TONE_VARS[s.tone]
  return (
    <span
      style={{ fontFamily: FONT.mono, background: bg, color: text }}
      className="inline-block text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full"
    >
      {s.label}
    </span>
  )
}
