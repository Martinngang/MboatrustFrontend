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
  /** Optional call-to-action (View, Retry...). Clicking runs onClick and
   * dismisses the toast. */
  action?: { label: string; onClick: () => void }
  /** Toasts sharing a key collapse into one while it is still showing or
   * was shown in the last few seconds - how one backend event that reaches
   * the user through two paths (an action's own toast AND its real-time
   * notification) only ever produces a single toast. Defaults to
   * tone+title+description. */
  dedupeKey?: string
}
interface ToastItem extends ToastOptions {
  id: string
}

const DEFAULT_DURATION = 3200
/** Actionable toasts stay a little longer so there is time to use the button. */
const ACTION_DURATION = 6000
const MAX_VISIBLE = 3
const DEDUPE_WINDOW_MS = 2500

type Handler = (opts: ToastOptions) => void
let handler: Handler | null = null
const pendingBeforeMount: ToastOptions[] = []
let lastErrorToastAt = 0

/** The one toast service. Components use useToast(); everything that lives
 * outside React (the socket listener, the global mutation-failure net) uses
 * this same module-level API, so there is exactly one place toasts are
 * queued, deduplicated and rendered. */
export const toast = {
  show(opts: ToastOptions) {
    if (opts.tone === 'error') lastErrorToastAt = Date.now()
    if (handler) handler(opts)
    else pendingBeforeMount.push(opts)
  },
  success: (title: string, description?: string, extra?: Partial<ToastOptions>) => toast.show({ title, description, tone: 'success', ...extra }),
  error: (title: string, description?: string, extra?: Partial<ToastOptions>) => toast.show({ title, description, tone: 'error', duration: 5000, ...extra }),
  warning: (title: string, description?: string, extra?: Partial<ToastOptions>) => toast.show({ title, description, tone: 'warning', duration: 4500, ...extra }),
  info: (title: string, description?: string, extra?: Partial<ToastOptions>) => toast.show({ title, description, tone: 'info', ...extra }),
  /** When an error toast was last shown - lets the global failure net stay
   * quiet if the screen already told the user what went wrong. */
  lastErrorAt: () => lastErrorToastAt,
}

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
  const [queue, setQueue] = useState<ToastItem[]>([])
  const counter = useRef(0)
  const recent = useRef(new Map<string, number>())

  const remove = useCallback((id: string) => {
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  // Promote queued toasts as visible slots free up.
  useEffect(() => {
    if (queue.length === 0 || items.length >= MAX_VISIBLE) return
    const [next, ...rest] = queue
    setQueue(rest)
    setItems((list) => [next, ...list])
  }, [queue, items])

  const show = useCallback((opts: ToastOptions) => {
    const key = opts.dedupeKey ?? `${opts.tone ?? 'neutral'}|${opts.title}|${opts.description ?? ''}`
    const now = Date.now()
    const seenAt = recent.current.get(key)
    if (seenAt !== undefined && now - seenAt < DEDUPE_WINDOW_MS) return
    recent.current.set(key, now)
    for (const [k, t] of recent.current) if (now - t > 30_000) recent.current.delete(k)
    const id = `t${counter.current++}`
    const item: ToastItem = { id, tone: 'neutral', duration: opts.action ? ACTION_DURATION : DEFAULT_DURATION, ...opts }
    // Every toast goes through the queue; the effect above promotes it as
    // soon as there is a free slot (max MAX_VISIBLE on screen, newest first
    // so the stack is top-anchored), instead of flooding the screen.
    setQueue((q) => [...q, item])
  }, [])

  useEffect(() => {
    handler = show
    for (const opts of pendingBeforeMount.splice(0)) show(opts)
    return () => {
      if (handler === show) handler = null
    }
  }, [show])

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
      // Below the sticky top bar on desktop (about 64px tall) so toasts never
      // cover the search/notification controls; safe-area aware on phones.
      className="pointer-events-none fixed inset-x-0 top-4 z-[1100] flex flex-col items-center gap-2 px-4 lg:top-[76px] lg:items-end lg:px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      aria-live="polite"
      aria-atomic="false"
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
      // Body clicks never dismiss (a stray tap should not hide a message the
      // user is mid-read) - it goes away by countdown or the explicit close
      // button above. Hovering pauses the countdown.
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
        <div className="min-w-0 flex-1">
          <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{toast.title}</div>
          {toast.description && (
            <div style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="mt-0.5 text-xs">{toast.description}</div>
          )}
          {toast.action && (
            <button
              type="button"
              onClick={() => { toast.action?.onClick(); onDismiss(toast.id) }}
              className="mt-1.5 text-xs font-semibold underline-offset-2 hover:underline"
              style={{ fontFamily: FONT.sans, color: C.forest }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(toast.id)}
          className="-mr-1 -mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100"
          style={{ color: C.inkSubtle }}
        >
          <AppIcon name="close" size={12} strokeWidth={2.25} />
        </button>
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
