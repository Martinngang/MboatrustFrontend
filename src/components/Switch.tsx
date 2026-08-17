import { motion, useReducedMotion } from 'framer-motion'
import { C, FONT } from './MobileLayout'

/** Spring-animated toggle — replaces the hand-rolled translate-x-5 divs that
 * were built independently 3-4 times across Settings/listing screens. */
export function Switch({ checked, onChange, label, ariaLabel, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label?: string; ariaLabel?: string; disabled?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const track = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      // Most call sites render this without `label` (the row it lives in
      // already shows that text separately — GroupedLinks in
      // SharedScreens.tsx) — without its own name here, the switch itself
      // has none at all for a screen reader, just "switch, on/off". `label`
      // still wins if both are passed, since it renders as visible text.
      aria-label={!label ? ariaLabel : undefined}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-40"
      style={{ background: checked ? C.forest : C.parchmentDark }}
    >
      <motion.span
        className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full"
        style={{ background: C.white, boxShadow: C.shadowSm }}
        animate={{ x: checked ? 20 : 0 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  )
  if (!label) return track
  return (
    <label className="flex items-center justify-between gap-3">
      <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">{label}</span>
      {track}
    </label>
  )
}
