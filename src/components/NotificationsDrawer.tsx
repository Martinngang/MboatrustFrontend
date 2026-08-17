import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useApp, type AppNotification, type NotifCategory } from '../context'
import { C, FONT, STATUS_TONE_VARS } from './tokens'
import { AppIcon } from './icons'

/** Right-anchored, full-height sliding panel — the notification bell's
 * destination everywhere it appears (TopBar, mobile strip, command palette,
 * profile menu). Deliberately an overlay rather than a routed page: it
 * sits on top of the existing left Sidebar without hiding it, closes with
 * Escape or a backdrop click, and never touches the URL. */
const NotificationsDrawerContext = createContext<{ open: () => void; close: () => void; toggle: () => void } | null>(null)

export function useNotificationsDrawer() {
  const ctx = useContext(NotificationsDrawerContext)
  if (!ctx) throw new Error('useNotificationsDrawer must be used within NotificationsDrawerProvider')
  return ctx
}

export function NotificationsDrawerProvider({ children }: { children: ReactNode }) {
  const { authChecked } = useApp()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen((v) => !v)

  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  // The drawer already closes itself when a notification's own "View
  // details" link navigates — but any other navigation while it's open (the
  // sidebar, a keyboard shortcut, browser back/forward) left it open with
  // its full-screen backdrop still covering the new page underneath,
  // silently swallowing clicks on whatever just loaded.
  useEffect(() => {
    setIsOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  return (
    <NotificationsDrawerContext.Provider value={{ open, close, toggle }}>
      {children}
      {authChecked && <NotificationsDrawer isOpen={isOpen} onClose={close} />}
    </NotificationsDrawerContext.Provider>
  )
}

const CATEGORY_META: Record<NotifCategory, { label: string; color: string }> = {
  funding: { label: 'Funding', color: C.forest },
  milestones: { label: 'Milestones', color: C.amber },
  marketplace: { label: 'Marketplace', color: C.steel },
  verification: { label: 'Verification', color: C.moss },
  messages: { label: 'Messages', color: C.seal },
}
const CATEGORY_ORDER: NotifCategory[] = ['funding', 'milestones', 'marketplace', 'verification', 'messages']

function NotifAvatar({ n, size = 40 }: { n: AppNotification; size?: number }) {
  const color = CATEGORY_META[n.category].color
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-2xl"
      style={{ width: size, height: size, color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      <AppIcon name={n.icon} size={Math.round(size * 0.45)} />
    </div>
  )
}

function NotifStatPill({ stat }: { stat: NonNullable<AppNotification['stat']> }) {
  const { bg, text } = STATUS_TONE_VARS[stat.tone]
  return (
    <span className="inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ background: bg, color: text, fontFamily: FONT.mono }}>
      {stat.label}
    </span>
  )
}

function NotifCard({ n, onOpen }: { n: AppNotification; onOpen: () => void }) {
  const category = CATEGORY_META[n.category]
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-2.5 rounded-2xl border p-3 transition-colors hover:bg-[var(--color-parchment)]"
      style={{
        background: C.white,
        borderColor: C.parchmentDark,
        borderLeft: n.unread ? `3px solid ${C.forest}` : `1px solid ${C.parchmentDark}`,
      }}
    >
      <NotifAvatar n={n} />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-[13px] font-semibold">{n.title}</span>
          <span
            className="rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
            style={{ background: `color-mix(in srgb, ${category.color} 14%, transparent)`, color: category.color, fontFamily: FONT.mono }}
          >
            {category.label}
          </span>
        </div>
        <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-[11.5px] leading-snug">{n.body}</p>
        {n.stat && <NotifStatPill stat={n.stat} />}
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1.5 pt-0.5">
        <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="whitespace-nowrap text-[9.5px]">{n.time}</span>
        {n.unread && <div className="h-1.5 w-1.5 rounded-full" style={{ background: C.forest }} />}
      </div>
    </div>
  )
}

function NotifDetail({ n, onBack, onView }: { n: AppNotification; onBack: () => void; onView: () => void }) {
  const category = CATEGORY_META[n.category]
  return (
    <div className="px-4 py-4">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-xs font-semibold transition-colors hover:text-[var(--color-forest)]" style={{ color: C.inkSubtle, fontFamily: FONT.sans }}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 2.5L3.5 8L9 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        Back
      </button>

      <div className="flex flex-col items-center rounded-2xl border px-5 py-7 text-center" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <NotifAvatar n={n} size={64} />
        <h2 style={{ fontFamily: FONT.serif, color: C.ink }} className="mt-3 text-lg font-bold">{n.title}</h2>
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: `color-mix(in srgb, ${category.color} 14%, transparent)`, color: category.color, fontFamily: FONT.mono }}
          >
            {category.label}
          </span>
          {n.stat && <NotifStatPill stat={n.stat} />}
          <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{n.time}</span>
        </div>
      </div>

      <div className="mt-5">
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">Details</div>
        <div className="rounded-2xl border p-3.5" style={{ borderColor: C.parchmentDark, borderLeft: `3px solid ${category.color}`, background: C.white }}>
          <p style={{ fontFamily: FONT.sans, color: C.ink }} className="text-[13px] leading-relaxed">{n.body}</p>
        </div>
      </div>

      <div className="mt-5 flex gap-2.5">
        <button onClick={onBack} className="flex-1 rounded-xl border py-2.5 text-xs font-semibold" style={{ borderColor: C.parchmentDark, color: C.inkMuted, fontFamily: FONT.sans }}>
          Close
        </button>
        {n.path && (
          <button onClick={onView} className="flex-1 rounded-xl py-2.5 text-xs font-semibold" style={{ background: C.forest, color: C.white, fontFamily: FONT.sans, boxShadow: `0 6px 18px ${C.glowForest}` }}>
            View details →
          </button>
        )}
      </div>
    </div>
  )
}

function NotificationsDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const reduceMotion = useReducedMotion()
  const { notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead } = useApp()
  const [filter, setFilter] = useState<NotifCategory | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  // Reset to the list (not wherever the user last drilled into) each time
  // the drawer is freshly opened.
  useEffect(() => { if (isOpen) setOpenId(null) }, [isOpen])

  const filtered = notifications.filter((n) => filter === 'all' || n.category === filter)
  const unread = filtered.filter((n) => n.unread)
  const read = filtered.filter((n) => !n.unread)
  const openNotif = notifications.find((n) => n.id === openId) ?? null

  const openDetail = (n: AppNotification) => {
    setOpenId(n.id)
    if (n.unread) markNotificationRead(n.id)
  }

  const goToPreferences = () => { onClose(); nav('/shared/notifications/preferences') }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[1150]"
            style={{ background: 'rgba(15,23,20,0.45)', backdropFilter: 'blur(3px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            className="fixed inset-y-0 right-0 z-[1151] flex w-full max-w-[420px] flex-col overflow-hidden border-l"
            style={{ background: C.cream, borderColor: C.parchmentDark, boxShadow: '-20px 0 60px rgba(0,0,0,0.25)' }}
            initial={{ x: reduceMotion ? 0 : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: reduceMotion ? 0 : '100%' }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 34 }}
          >
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b px-4 py-4" style={{ borderColor: C.parchmentDark }}>
              <div className="flex min-w-0 items-center gap-2">
                <span style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold">Notifications</span>
                {unreadNotifications > 0 && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: C.seal, color: '#fff', fontFamily: FONT.mono }}>
                    {unreadNotifications}
                  </span>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                {unreadNotifications > 0 && (
                  <button onClick={markAllNotificationsRead} aria-label="Mark all read" title="Mark all read" className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-parchment)]">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M1 8L4 11L9 5" stroke={C.inkMuted} strokeWidth="1.4" strokeLinecap="round" /><path d="M7 8L10 11L15 5" stroke={C.inkMuted} strokeWidth="1.4" strokeLinecap="round" /></svg>
                  </button>
                )}
                <button onClick={goToPreferences} aria-label="Notification settings" title="Notification settings" className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-parchment)]">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="2.2" stroke={C.inkMuted} strokeWidth="1.3" />
                    <path d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5M12.36 3.64L11.3 4.7M4.7 11.3L3.64 12.36M12.36 12.36L11.3 11.3M4.7 4.7L3.64 3.64" stroke={C.inkMuted} strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
                <button onClick={onClose} aria-label="Close notifications" className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-parchment)]">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1.5 1.5L12.5 12.5M12.5 1.5L1.5 12.5" stroke={C.inkMuted} strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              </div>
            </div>

            {/* Body: list<->detail, sliding within the panel */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {openNotif ? (
                  <motion.div
                    key="detail"
                    className="absolute inset-0 overflow-y-auto"
                    initial={{ opacity: 0, x: reduceMotion ? 0 : 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: reduceMotion ? 0 : 40 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.2, 0.7, 0.2, 1] }}
                  >
                    <NotifDetail n={openNotif} onBack={() => setOpenId(null)} onView={() => { if (openNotif.path) { onClose(); nav(openNotif.path) } }} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    className="absolute inset-0 flex flex-col overflow-y-auto"
                    initial={{ opacity: 0, x: reduceMotion ? 0 : -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: reduceMotion ? 0 : -40 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.2, 0.7, 0.2, 1] }}
                  >
                    {/* Filter chips */}
                    <div className="flex flex-shrink-0 gap-1.5 overflow-x-auto px-4 pb-2 pt-3">
                      {(['all', ...CATEGORY_ORDER] as const).map((f) => {
                        const active = filter === f
                        const meta = f === 'all' ? { label: 'All', color: C.forest } : CATEGORY_META[f]
                        return (
                          <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className="flex-shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all"
                            style={{
                              fontFamily: FONT.sans,
                              background: active ? `color-mix(in srgb, ${meta.color} 14%, transparent)` : C.white,
                              borderColor: active ? meta.color : C.parchmentDark,
                              color: active ? meta.color : C.inkMuted,
                            }}
                          >
                            {meta.label}
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex-1 space-y-2 px-4 pb-6 pt-1">
                      {unread.length > 0 && (
                        <>
                          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="px-0.5 pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-widest">New</div>
                          {unread.map((n) => <NotifCard key={n.id} n={n} onOpen={() => openDetail(n)} />)}
                        </>
                      )}

                      {unread.length > 0 && read.length > 0 && (
                        <div className="flex items-center gap-2 px-0.5 py-2">
                          <div className="h-px flex-1" style={{ background: C.parchmentDark }} />
                          <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9.5px] uppercase tracking-widest">Earlier</span>
                          <div className="h-px flex-1" style={{ background: C.parchmentDark }} />
                        </div>
                      )}

                      {read.map((n) => <NotifCard key={n.id} n={n} onOpen={() => openDetail(n)} />)}

                      {filtered.length === 0 && (
                        <div style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-16 text-center text-sm">
                          No notifications in this category
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
