import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { C, FONT, PillButton } from './MobileLayout'
import { scaleIn } from './motion'

const SIZES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({ open, onClose, title, children, footer, size = 'sm' }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(15,27,20,0.5)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`relative z-10 w-full ${SIZES[size]} rounded-t-[28px] sm:rounded-[28px] border p-6`}
            style={{ background: C.white, borderColor: C.parchmentDark, boxShadow: C.shadowXl }}
            variants={reduceMotion ? undefined : scaleIn}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {title && (
              <div style={{ fontFamily: FONT.serif, color: C.ink }} className="mb-4 text-lg font-bold">{title}</div>
            )}
            {children}
            {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export function ConfirmDialog({ open, onConfirm, onCancel, title, description, confirmLabel = 'Confirm', danger = false }: {
  open: boolean; onConfirm: () => void; onCancel: () => void; title: string; description?: string
  confirmLabel?: string; danger?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <PillButton variant="secondary" onClick={onCancel}>Cancel</PillButton>
          <PillButton variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</PillButton>
        </>
      }
    >
      {description && <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">{description}</p>}
    </Modal>
  )
}
