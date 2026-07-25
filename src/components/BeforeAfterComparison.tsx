import { C, FONT } from './MobileLayout'
import { EvidenceMetadataBadge } from './EvidenceMetadataBadge'
import type { EvidenceMeta } from '../verification'

/**
 * Side-by-side before/after viewer — used on the funder's milestone review
 * screen and anywhere else progress needs to be visually confirmed against
 * the project's starting state.
 */
export function BeforeAfterComparison({ beforeSrc, afterSrc, beforeLabel = 'Before', afterLabel = 'After', afterMeta }: {
  beforeSrc: string
  afterSrc: string
  beforeLabel?: string
  afterLabel?: string
  afterMeta?: EvidenceMeta
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Frame src={beforeSrc} label={beforeLabel} />
        <Frame src={afterSrc} label={afterLabel} />
      </div>
      {afterMeta && (
        <div className="mt-2 flex justify-end">
          <EvidenceMetadataBadge meta={afterMeta} size="xs" />
        </div>
      )}
    </div>
  )
}

function Frame({ src, label }: { src: string; label: string }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border" style={{ borderColor: C.parchmentDark }}>
      <img src={src} alt={label} className="h-full w-full object-cover" />
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1" style={{ background: 'rgba(0,0,0,0.6)' }}>
        <span style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.85)' }} className="text-[9px] uppercase tracking-wider">{label}</span>
      </div>
    </div>
  )
}
