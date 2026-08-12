import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { C, FONT, STATUS_TONE_VARS, type StatusTone } from './MobileLayout'
import { AppIcon, type IconName } from './icons'

export interface ToastOptions {
  title: string
  description?: string
  tone?: StatusTone
  duration?: number
}
interface ToastItem extends ToastOptions {
  id: string
}

const DEFAULT_DURATION = 3200

const ToastContext = createContext<{ show: (opts: ToastOptions) => void } | null>(null)

const TONE_ICON: Record<StatusTone, IconName> = {
  success: 'check',
  warning: 'alert',
  error: 'close',
  info: 'info',
  neutral: 'dot',
}

/** Standard feedback mechanism for "delightful feedback on every important
 * interaction" — fund a project, submit a milestone, send a message, etc.
 * Mount once (ToastProvider + Toaster) near the app root; call useToast()
 * anywhere inside it. Every toast in the app renders top-anchored with a
 * hover-pausable auto-dismiss countdown — see ToastRow. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const remove = useCallback((id: string) => {
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((opts: ToastOptions) => {
    const id = `t${counter.current++}`
    // Newest first — the stack is top-anchored, so the most recent toast
    // should sit closest to that edge rather than pile up at the end.
    setItems((list) => [{ id, tone: 'neutral', duration: DEFAULT_DURATION, ...opts }, ...list])
  }, [])

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
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[1100] flex flex-col items-center gap-2 px-4 lg:top-6 lg:items-end lg:px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <AnimatePresence>
        {items.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}

/** A single toast, owning its own auto-dismiss countdown. Hovering pauses
 * both the dismiss timer and the progress bar at their exact current
 * position; leaving resumes both from there, never restarting from zero. */
function ToastRow({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const reduceMotion = useReducedMotion()
  const tone = toast.tone ?? 'neutral'
  const { bg, text } = STATUS_TONE_VARS[tone]
  const duration = toast.duration ?? DEFAULT_DURATION

  const [paused, setPaused] = useState(false)
  // How much dismiss time is left, and when the current running phase
  // started — recomputed across pause/resume rather than relying on a
  // single fixed timeout, since the timer needs to stop counting down
  // while hovered instead of just visually looking paused.
  const remainingRef = useRef(duration)
  const startedAtRef = useRef(Date.now())
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    startedAtRef.current = Date.now()
    timeoutRef.current = setTimeout(() => onDismiss(toast.id), remainingRef.current)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pause = () => {
    if (timeoutRef.current === null) return
    clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    remainingRef.current -= Date.now() - startedAtRef.current
    setPaused(true)
  }

  const resume = () => {
    if (timeoutRef.current !== null) return
    if (remainingRef.current <= 0) {
      onDismiss(toast.id)
      return
    }
    startedAtRef.current = Date.now()
    timeoutRef.current = setTimeout(() => onDismiss(toast.id), remainingRef.current)
    setPaused(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: reduceMotion ? 0 : 0.15 } }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 32 }}
      className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border"
      style={{ background: C.white, borderColor: C.parchmentDark, boxShadow: C.shadowLg }}
      role={tone === 'error' ? 'alert' : 'status'}
      // Deliberately no onClick/onKeyDown dismiss handler — the countdown
      // (paused/resumed only by hover, see pause/resume above) is the one
      // and only way a toast goes away. Clicking, tapping, or pressing keys
      // must never skip it early.
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      <div className="flex items-start gap-3 p-3.5">
        <span
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: bg, color: text }}
        >
          <AppIcon name={TONE_ICON[tone]} size={13} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{toast.title}</div>
          {toast.description && (
            <div style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="mt-0.5 text-xs">{toast.description}</div>
          )}
        </div>
      </div>

      {/* Auto-dismiss countdown — full width at mount, shrinks to nothing
          over `duration`, freezing exactly in place while hovered. */}
      <div className="h-[3px] w-full" style={{ background: 'rgba(0,0,0,0.08)' }}>
        <div
          className="toast-progress-bar h-full"
          style={{
            background: text,
            animationDuration: `${duration}ms`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      </div>
    </motion.div>
  )
}
