import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { C, FONT } from '../MobileLayout'

/** Right-side contextual panel — the "quick-view a project/bid/listing
 * without leaving the current list" pattern from ClickUp/Linear. Same
 * portal + backdrop approach as Modal.tsx, but slides in from the right
 * and only takes a partial width on desktop (full-width sheet on mobile). */
export function Drawer({ open, onClose, title, subtitle, children, footer }: {
  open: boolean; onClose: () => void; title?: string; subtitle?: string; children: ReactNode; footer?: ReactNode
}) {
  const reduceMotion = useReducedMotion()
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1000] flex justify-end">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(10,10,13,0.55)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative z-10 flex h-full w-full flex-col border-l sm:w-[420px]"
            style={{ background: C.white, borderColor: C.parchmentDark, boxShadow: C.shadowXl }}
            initial={{ x: reduceMotion ? 0 : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: reduceMotion ? 0 : '100%' }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 34 }}
          >
            <div className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: C.parchmentDark }}>
              <div className="min-w-0">
                {subtitle && <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">{subtitle}</div>}
                {title && <div style={{ fontFamily: FONT.serif, color: C.ink }} className="mt-0.5 text-lg font-bold truncate">{title}</div>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-parchment)]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2L12 12M12 2L2 12" stroke={C.inkSubtle} strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && (
              <div className="border-t px-5 py-4" style={{ borderColor: C.parchmentDark }}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
