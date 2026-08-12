import { motion, useReducedMotion } from 'framer-motion'
import { C, FONT } from './MobileLayout'
import { AppIcon, type IconName } from './icons'

export interface TabItem {
  id: string
  label: string
  icon?: IconName
}

/** Shared-element sliding-indicator tab bar — replaces the hand-rolled tab
 * bars independently built in AdminPanelScreen, BrowseLandScreen, and
 * VerifierDashboard. */
export function Tabs({ tabs, value, onChange, variant = 'underline' }: {
  tabs: TabItem[]; value: string; onChange: (id: string) => void; variant?: 'underline' | 'pill'
}) {
  const reduceMotion = useReducedMotion()
  const layoutId = `tabs-${variant}-indicator`
  return (
    <div
      className={`flex gap-1 ${variant === 'pill' ? 'rounded-2xl p-1' : 'border-b'}`}
      style={variant === 'pill' ? { background: C.parchment } : { borderColor: C.parchmentDark }}
    >
      {tabs.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`relative flex-1 px-4 py-2.5 text-sm font-semibold transition-colors ${variant === 'pill' ? 'rounded-xl' : ''}`}
            style={{ fontFamily: FONT.sans, color: active ? (variant === 'pill' ? C.white : C.forest) : C.inkMuted }}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className={`absolute z-0 ${variant === 'pill' ? 'inset-0 rounded-xl' : 'inset-x-0 -bottom-px h-0.5'}`}
                style={{ background: variant === 'pill' ? C.forest : C.forest }}
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
              {t.icon && <AppIcon name={t.icon} size={14} />}
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
