import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { C, FONT, STATUS_TONE_VARS, type StatusTone } from './MobileLayout'

export interface ToastOptions {
  title: string
  description?: string
  tone?: StatusTone
  duration?: number
}
interface ToastItem extends ToastOptions {
  id: string
}

const ToastContext = createContext<{ show: (opts: ToastOptions) => void } | null>(null)

const TONE_ICON: Record<StatusTone, string> = {
  success: '✓',
  warning: '!',
  error: '✕',
  info: 'i',
  neutral: '•',
}

/** Standard feedback mechanism for "delightful feedback on every important
 * interaction" — fund a project, submit a milestone, send a message, etc.
 * Mount once (ToastProvider + Toaster) near the app root; call useToast()
 * anywhere inside it. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const remove = useCallback((id: string) => {
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((opts: ToastOptions) => {
    const id = `t${counter.current++}`
    setItems((list) => [...list, { id, tone: 'neutral', duration: 3200, ...opts }])
    setTimeout(() => remove(id), opts.duration ?? 3200)
  }, [remove])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Toaster items={items} onDismiss={remove} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

function Toaster({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  const reduceMotion = useReducedMotion()
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[1100] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6">
      <AnimatePresence>
        {items.map((t) => {
          const tone = t.tone ?? 'neutral'
          const { bg, text } = STATUS_TONE_VARS[tone]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: reduceMotion ? 0 : 0.15 } }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 32 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-3.5"
              style={{ background: C.white, borderColor: C.parchmentDark, boxShadow: C.shadowLg }}
              onClick={() => onDismiss(t.id)}
            >
              <span
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: bg, color: text, fontFamily: FONT.mono }}
              >
                {TONE_ICON[tone]}
              </span>
              <div className="min-w-0">
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{t.title}</div>
                {t.description && (
                  <div style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="mt-0.5 text-xs">{t.description}</div>
                )}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>,
    document.body
  )
}
