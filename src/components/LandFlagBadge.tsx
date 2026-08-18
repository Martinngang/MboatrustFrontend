import { useState } from 'react'
import { useApp, type LandListing } from '../context'
import { C, FONT, STATUS_TONE_VARS } from './MobileLayout'

/**
 * Warning badge for a listing flagged as disputed or a possible duplicate of
 * another listing. `compact` renders a small pill for list/card contexts;
 * the default renders the full expandable "view flag details" panel.
 */
export function LandFlagBadge({ listing, compact }: { listing: LandListing; compact?: boolean }) {
  const { landListings } = useApp()
  const [expanded, setExpanded] = useState(false)
  // Was 4 hardcoded light-only hex values (matching StatusBadge/RiskBadge's
  // pre-fix history) — meant this badge silently ignored dark mode entirely
  // rather than just being visually inconsistent with its siblings.
  const { bg, text } = STATUS_TONE_VARS.error

  if (!listing.disputed && !listing.duplicateOfListingId) return null

  const isDuplicate = !!listing.duplicateOfListingId
  const duplicateTarget = isDuplicate ? landListings.find((l) => l.id === listing.duplicateOfListingId) : undefined
  const label = isDuplicate ? 'Possible duplicate' : 'Disputed listing'

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full px-2 py-1" style={{ background: bg }}>
        <WarningIcon size={9} color={text} />
        <span style={{ fontFamily: FONT.mono, color: text }} className="text-[9px] uppercase tracking-wider font-bold">{label}</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: text }}>
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between p-3" style={{ background: bg }}>
        <div className="flex items-center gap-2">
          <WarningIcon size={14} color={text} />
          <span style={{ fontFamily: FONT.sans, color: text }} className="text-xs font-bold">{label} — view flag details</span>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke={text} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {expanded && (
        <div className="p-3 border-t" style={{ borderColor: text, background: C.white }}>
          {isDuplicate ? (
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">
              This listing closely matches <strong style={{ color: C.ink }}>{duplicateTarget?.title ?? 'another listing already on the platform'}</strong>.
              Our team is verifying which listing is legitimate before either can proceed to sale.
            </p>
          ) : (
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">{listing.disputeReason}</p>
          )}
        </div>
      )}
    </div>
  )
}

function WarningIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M6 1.5L11 10.5H1L6 1.5Z" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      <line x1="6" y1="5" x2="6" y2="7" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <circle cx="6" cy="8.5" r="0.5" fill={color} />
    </svg>
  )
}
