import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { fadeUp, staggerContainer } from './motion'

/** Cascading reveal for grid/list renders (dashboard lists, notification
 * feeds, browse/search results). Coexists with Reveal.tsx (kept for simple
 * one-shot fades) — this is for when children should cascade in as a group.
 *
 * Triggers on mount, not scroll-intersection: this app's lists are primary
 * content (a user's projects, their notifications), not marketing sections,
 * so they must never sit invisible waiting to be scrolled into view — a
 * `whileInView` gate first shipped here left the FunderHome active-projects
 * list blank on load until scrolled. Cascading in on mount still reads fine
 * for content further down the page; it's just already settled by the time
 * the user scrolls to it. */
export function StaggerList({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} variants={staggerContainer} initial="hidden" animate="show">
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  )
}
