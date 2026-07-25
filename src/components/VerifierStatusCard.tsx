import { C, FONT, StatusBadge } from './MobileLayout'
import type { VerifierAssignment } from '../verification'

/**
 * Drops into a milestone/land detail or review screen to show that an
 * independent verifier has been assigned. Maps verifier task status onto the
 * existing StatusBadge vocabulary rather than inventing a parallel one.
 */
export function VerifierStatusCard({ assignment }: { assignment: VerifierAssignment | null }) {
  if (!assignment) return null

  return (
    <div className="flex items-center gap-3 rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white font-bold" style={{ background: C.forest, fontFamily: FONT.serif }}>
        {assignment.verifierName[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{assignment.verifierName}</div>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">
          Independent verifier · ETA {assignment.eta}
        </div>
      </div>
      <StatusBadge status={assignment.status} />
    </div>
  )
}
