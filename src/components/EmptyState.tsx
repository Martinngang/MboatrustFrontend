import type { ReactNode } from 'react'
import { C, FONT } from './MobileLayout'
import { Tilt3D } from './Tilt3D'

/** Standard "nothing here yet" block — replaces the emoji+text div every
 * screen used to hand-roll independently. `illustration='tilt'` is the
 * primary home for tasteful 3D outside the (off-limits) hero/onboarding: a
 * small-angle Tilt3D + gentle float turns a flat empty moment into a small
 * dimensional one, on-brand with the seal-stamp motif used elsewhere. */
export function EmptyState({ icon, title, description, action, tone = 'default', illustration = 'none' }: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  tone?: 'default' | 'success' | 'error'
  illustration?: 'float' | 'tilt' | 'none'
}) {
  const ring = tone === 'success' ? 'var(--status-success-bg)' : tone === 'error' ? 'var(--status-error-bg)' : C.parchment

  const glyph = (
    <div
      className={illustration === 'float' ? 'animate-float' : ''}
      style={{
        width: 64,
        height: 64,
        borderRadius: 20,
        background: ring,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 26,
      }}
    >
      {icon}
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[24px] px-6 py-14 text-center" style={{ background: C.gradientMesh }}>
      {illustration === 'tilt' ? <Tilt3D max={10} restY={-4} className="mx-auto">{glyph}</Tilt3D> : glyph}
      <div>
        <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-semibold">{title}</div>
        {description && (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="mt-1.5 max-w-xs text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
