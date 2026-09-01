import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useApp, fmt } from '../../context'
import { C, FONT } from '../MobileLayout'
import { scaleIn } from '../motion'
import { useNotificationsDrawer } from '../NotificationsDrawer'
import { AppIcon, type IconName } from '../icons'

interface PaletteResult {
  id: string
  icon: IconName
  title: string
  subtitle?: string
  group: 'Projects' | 'Tenders' | 'Land' | 'Contractors' | 'Actions'
  onSelect: () => void
}

const CommandPaletteContext = createContext<{ show: () => void; hide: () => void } | null>(null)

/** Mount once near the app root (see App.tsx). Owns the global Cmd/Ctrl+K
 * listener and the palette's open state — TopBar's search field and any
 * other trigger call `useCommandPalette().show()` to open the same instance. */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const { authChecked } = useApp()
  const [open, setOpen] = useState(false)
  const show = useCallback(() => setOpen(true), [])
  const hide = useCallback(() => setOpen(false), [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // This provider (and its global listener) mounts above App.tsx's
      // AuthGate loading splash, so without this guard Cmd/Ctrl+K could pop
      // the command palette open — and let someone navigate away via it —
      // while the app is still supposed to be a blocking "loading" gate.
      if (!authChecked) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [authChecked])

  return (
    <CommandPaletteContext.Provider value={{ show, hide }}>
      {children}
      <CommandPaletteOverlay open={open} onClose={hide} />
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) throw new Error('useCommandPalette must be used within a CommandPaletteProvider')
  return ctx
}

function CommandPaletteOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const { projects, jobs, landListings, contractors } = useApp()
  const { open: openNotifications } = useNotificationsDrawer()
  const reduceMotion = useReducedMotion()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const goTo = useCallback((path: string) => { nav(path); onClose() }, [nav, onClose])

  const allResults: PaletteResult[] = useMemo(() => [
    ...projects.map((p): PaletteResult => ({
      id: `project-${p.id}`, icon: 'folder', group: 'Projects',
      title: p.title, subtitle: `${p.location} · ${fmt(p.raised)} of ${fmt(p.totalAmount)}`,
      onSelect: () => goTo(`/funder/project/${p.id}`),
    })),
    ...jobs.map((j): PaletteResult => ({
      id: `job-${j.id}`, icon: 'clipboard', group: 'Tenders',
      title: j.title, subtitle: `${j.location} · ${fmt(j.budget)}`,
      onSelect: () => goTo(`/contractor/job/${j.id}`),
    })),
    ...landListings.map((l): PaletteResult => ({
      id: `land-${l.id}`, icon: 'home', group: 'Land',
      title: l.title, subtitle: `${l.city}, ${l.region} · ${fmt(l.price)}`,
      onSelect: () => goTo(`/land/listing/${l.id}`),
    })),
    ...contractors.map((c): PaletteResult => ({
      id: `contractor-${c.id}`, icon: 'hardHat', group: 'Contractors',
      title: c.name, subtitle: `${c.trade} · ${c.location}`,
      onSelect: () => goTo('/funder/contractors'),
    })),
    { id: 'action-post-job', icon: 'megaphone', group: 'Actions', title: 'Post a tender', onSelect: () => goTo('/funder/post-job') },
    { id: 'action-create-listing', icon: 'hardHat', group: 'Actions', title: 'Create land listing', onSelect: () => goTo('/land/create') },
    { id: 'action-home', icon: 'home', group: 'Actions', title: 'Go to Home', onSelect: () => goTo('/home') },
    { id: 'action-notifications', icon: 'bell', group: 'Actions', title: 'View notifications', onSelect: () => { onClose(); openNotifications() } },
    { id: 'action-settings', icon: 'settings', group: 'Actions', title: 'Go to Settings', onSelect: () => goTo('/shared/settings') },
  ], [projects, jobs, landListings, contractors, goTo, onClose, openNotifications])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allResults.slice(0, 8)
    return allResults.filter((r) => r.title.toLowerCase().includes(q) || r.subtitle?.toLowerCase().includes(q) || r.group.toLowerCase().includes(q)).slice(0, 20)
  }, [allResults, query])

  useEffect(() => { setActiveIndex(0) }, [query])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[activeIndex]?.onSelect() }
  }

  let lastGroup: string | null = null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1200] flex items-start justify-center px-4 pt-24">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(10,10,13,0.6)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border"
            style={{ background: C.white, borderColor: C.parchmentDark, boxShadow: C.shadowXl }}
            variants={reduceMotion ? undefined : scaleIn}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: C.parchmentDark }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                <circle cx="7" cy="7" r="5" stroke={C.inkSubtle} strokeWidth="1.4" />
                <line x1="11" y1="11" x2="14" y2="14" stroke={C.inkSubtle} strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search projects, tenders, land, contractors, or run an action…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ fontFamily: FONT.sans, color: C.ink }}
              />
              <kbd style={{ fontFamily: FONT.mono, color: C.inkSubtle, borderColor: C.parchmentDark }} className="rounded border px-1.5 py-0.5 text-[10px]">Esc</kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
              {filtered.length === 0 && (
                <div style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="px-4 py-8 text-center text-sm">No matches for "{query}".</div>
              )}
              {filtered.map((r, i) => {
                const showGroupLabel = r.group !== lastGroup
                lastGroup = r.group
                return (
                  <div key={r.id}>
                    {showGroupLabel && (
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="px-4 pb-1 pt-2 text-[10px] uppercase tracking-widest">{r.group}</div>
                    )}
                    <button
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={r.onSelect}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                      style={{ background: i === activeIndex ? C.parchment : 'transparent' }}
                    >
                      <span className="flex-shrink-0" style={{ color: C.forest }}><AppIcon name={r.icon} size={16} /></span>
                      <div className="min-w-0 flex-1">
                        <div style={{ fontFamily: FONT.sans, color: C.ink }} className="truncate text-sm font-medium">{r.title}</div>
                        {r.subtitle && <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="truncate text-[10px]">{r.subtitle}</div>}
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
