import { FONT, StatusBadge } from './MobileLayout'
import type { CoSigner } from '../verification'

const STATUS_MAP: Record<CoSigner['status'], string> = {
  pending: 'pending',
  approved: 'approved',
  flagged: 'flagged',
}

/** Sits in a milestone timeline to show the designated co-signer's decision. */
export function CoSignerStatusIndicator({ coSigner }: { coSigner: CoSigner | null | undefined }) {
  if (!coSigner) return null

  return (
    <div className="flex items-center gap-2">
      <span style={{ fontFamily: FONT.mono, color: '#8FA396' }} className="text-[10px] uppercase tracking-wider">Co-signer</span>
      <span style={{ fontFamily: FONT.sans }} className="text-xs font-medium">{coSigner.name}</span>
      <StatusBadge status={STATUS_MAP[coSigner.status]} />
    </div>
  )
}
