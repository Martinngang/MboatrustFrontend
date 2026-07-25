import { FONT } from './MobileLayout'
import type { RiskLevel } from '../verification'

/**
 * Trust signal shown on profiles wherever a funder is deciding whether to
 * commit money — mirrors StatusBadge's map-lookup pattern for consistency.
 */
export function RiskBadge({ level }: { level: RiskLevel }) {
  const map: Record<RiskLevel, { bg: string; text: string; label: string }> = {
    new: { bg: '#EFF6FF', text: '#1D4ED8', label: 'New user' },
    good_standing: { bg: '#D1FAE5', text: '#065F46', label: 'Good standing' },
    flagged: { bg: '#FEE2E2', text: '#991B1B', label: 'Flagged' },
  }
  const s = map[level]
  return (
    <span
      style={{ fontFamily: FONT.mono, background: s.bg, color: s.text }}
      className="inline-block text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full"
    >
      {s.label}
    </span>
  )
}
