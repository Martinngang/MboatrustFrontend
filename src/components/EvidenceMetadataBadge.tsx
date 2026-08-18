import { FONT, STATUS_TONE_VARS } from './MobileLayout'
import type { EvidenceMeta } from '../verification'

/**
 * Anti-fraud indicator cluster attached to every evidence thumbnail wherever
 * evidence is shown — milestone proof, land site photos, verifier reports.
 * Purely presentational: pass it a mock EvidenceMeta and it renders consistently.
 */
export function EvidenceMetadataBadge({ meta, size = 'sm' }: { meta: EvidenceMeta; size?: 'sm' | 'xs' }) {
  const items: { key: string; label: string; ok: boolean }[] = [
    { key: 'location', label: 'Location', ok: meta.locationMatch },
    { key: 'timestamp', label: 'Timestamp', ok: meta.timestampRecent },
    { key: 'unique', label: 'Unique', ok: meta.duplicateCheck },
  ]
  const pad = size === 'xs' ? 'px-1.5 py-0.5' : 'px-2 py-0.5'
  const textSize = size === 'xs' ? 'text-[8px]' : 'text-[9px]'
  // Was 4 hardcoded light-only hex values per tone (same bug class as
  // LandFlagBadge's pre-fix history) — routed through STATUS_TONE_VARS so
  // this ignores neither dark mode nor the rest of the badge system.
  const okTone = STATUS_TONE_VARS.success
  const badTone = STATUS_TONE_VARS.error

  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((it) => {
        const tone = it.ok ? okTone : badTone
        return (
          <span
            key={it.key}
            className={`inline-flex items-center gap-1 rounded-full ${pad}`}
            style={{ background: tone.bg }}
          >
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
              {it.ok ? (
                <path d="M2 5L4 7L8 3" stroke={tone.text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke={tone.text} strokeWidth="1.6" strokeLinecap="round" />
              )}
            </svg>
            <span className={`${textSize} uppercase tracking-wide font-semibold`} style={{ fontFamily: FONT.mono, color: tone.text }}>
              {it.label}
            </span>
          </span>
        )
      })}
      {meta.flagged && (
        <span className={`inline-flex items-center gap-1 rounded-full ${pad}`} style={{ background: badTone.bg }}>
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <path d="M5 2L9 8.5H1L5 2Z" stroke={badTone.text} strokeWidth="1.3" strokeLinejoin="round" />
            <line x1="5" y1="4.5" x2="5" y2="6" stroke={badTone.text} strokeWidth="1" strokeLinecap="round" />
            <circle cx="5" cy="7.2" r="0.4" fill={badTone.text} />
          </svg>
          <span className={`${textSize} uppercase tracking-wide font-bold`} style={{ fontFamily: FONT.mono, color: badTone.text }}>
            Flagged
          </span>
        </span>
      )}
    </div>
  )
}

/** Warning banner shown wherever a piece of evidence has been flagged as reused/suspicious. */
export function EvidenceWarningBanner({ reason }: { reason: string }) {
  const { bg, text } = STATUS_TONE_VARS.error
  return (
    <div className="flex items-start gap-2.5 rounded-xl border p-3" style={{ background: bg, borderColor: text }}>
      <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full" style={{ background: bg }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2L11 10H1L6 2Z" stroke={text} strokeWidth="1.3" strokeLinejoin="round" />
          <line x1="6" y1="5.5" x2="6" y2="7.5" stroke={text} strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="6" cy="8.8" r="0.5" fill={text} />
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: FONT.mono, color: text }} className="mb-0.5 text-[10px] uppercase tracking-widest">Evidence flagged</div>
        <p style={{ fontFamily: FONT.sans, color: text }} className="text-xs leading-relaxed">{reason}</p>
      </div>
    </div>
  )
}
