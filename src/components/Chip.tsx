import { motion } from 'framer-motion'
import { C, FONT } from './MobileLayout'

export function Chip({ children, selected, onClick, tone }: {
  children: string; selected?: boolean; onClick?: () => void; tone?: 'forest' | 'amber'
}) {
  const accent = tone === 'amber' ? C.amber : C.forest
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      className="flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
      style={{
        fontFamily: FONT.sans,
        borderColor: selected ? accent : C.parchmentDark,
        background: selected ? accent : C.white,
        color: selected ? C.white : C.inkMuted,
      }}
    >
      {children}
    </motion.button>
  )
}

/** Replaces the hand-rolled category-picker pill rows built independently
 * across create/filter screens (projects, jobs, materials, listings). */
export function ChipGroup({ options, value, onChange, multiple = false, tone }: {
  options: string[]
  value: string | string[]
  onChange: (v: string | string[]) => void
  multiple?: boolean
  tone?: 'forest' | 'amber'
}) {
  const selectedSet = new Set(Array.isArray(value) ? value : [value])
  function toggle(opt: string) {
    if (multiple) {
      const arr = Array.isArray(value) ? value : []
      onChange(arr.includes(opt) ? arr.filter((v) => v !== opt) : [...arr, opt])
    } else {
      onChange(opt)
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Chip key={opt} selected={selectedSet.has(opt)} onClick={() => toggle(opt)} tone={tone}>
          {opt}
        </Chip>
      ))}
    </div>
  )
}
