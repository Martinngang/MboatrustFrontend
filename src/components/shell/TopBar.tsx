import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../../context'
import { C, FONT, NotificationBell, ThemeToggle, UserAvatar } from '../MobileLayout'
import { ConnectivityBar } from '../ConnectivityBar'
import { InstallButton } from '../InstallButton'
import { useCommandPalette } from './CommandPalette'
import { Breadcrumbs } from './Breadcrumbs'
import { QUICK_CREATE_BY_ROLE } from './quickCreate'
import { useShortcutsHelp } from './KeyboardShortcuts'
import { useNotificationsDrawer } from '../NotificationsDrawer'

/** Top bar: breadcrumb trail, global search (opens the command palette),
 * role-aware quick-create, existing chrome (notifications/theme/connectivity/
 * install), and an avatar menu (Profile/Settings/Sign out).
 *
 * Rendered at every breakpoint — it used to be `hidden ... lg:flex`
 * (desktop-only), with a smaller ad-hoc row duplicated inside AppShell's
 * scrolling <main> standing in on mobile. That row wasn't sticky or fixed,
 * so it scrolled away with the page, and below `lg` there was no persistent
 * header at all. Below `lg` here, the same chrome is kept but compacted:
 * the full search bar becomes an icon button, quick-create becomes a "+"
 * icon, and the keyboard-shortcuts hint is dropped (not meaningful on
 * touch) — nothing else is removed. */
export function TopBar() {
  const nav = useNavigate()
  const { role, setLoggedIn, setRole } = useApp()
  const { show } = useCommandPalette()
  const { show: showShortcuts } = useShortcutsHelp()
  const { toggle: toggleNotifications } = useNotificationsDrawer()
  const [menuOpen, setMenuOpen] = useState(false)
  const quickCreate = QUICK_CREATE_BY_ROLE[role ?? 'funder']

  const signOut = () => {
    setMenuOpen(false)
    setLoggedIn(false)
    setRole(null)
    nav('/')
  }

  return (
    <header
      className="flex border-b px-4 pb-3 lg:px-6 lg:pb-4"
      style={{ borderColor: C.parchmentDark, background: C.white, paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
    >
      <div className="flex w-full items-center gap-2 lg:gap-4">
        <div className="min-w-0 flex-1 lg:flex-shrink-0 lg:flex-initial">
          <Breadcrumbs />
        </div>

        {/* Full search bar on desktop; a compact icon button on mobile —
            both open the same command palette. */}
        <button
          onClick={show}
          className="ml-2 hidden max-w-md flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors hover:bg-[var(--color-parchment)] lg:flex"
          style={{ borderColor: C.parchmentDark, background: C.cream }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
            <circle cx="7" cy="7" r="5" stroke={C.inkSubtle} strokeWidth="1.3" />
            <line x1="11" y1="11" x2="14" y2="14" stroke={C.inkSubtle} strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="flex-1 truncate text-sm">Search or jump to…</span>
          <kbd style={{ fontFamily: FONT.mono, color: C.inkSubtle, borderColor: C.parchmentDark }} className="rounded border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
        </button>
        <button
          onClick={show}
          aria-label="Search"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-parchment)] lg:hidden"
          style={{ background: C.parchment }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke={C.inkSubtle} strokeWidth="1.3" />
            <line x1="11" y1="11" x2="14" y2="14" stroke={C.inkSubtle} strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>

        <div className="ml-auto flex flex-shrink-0 items-center gap-2 lg:gap-3">
          {quickCreate && (
            <>
              <motion.button
                onClick={() => nav(quickCreate.path)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                className="hidden whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold lg:inline-flex"
                style={{ background: C.emerald, color: '#fff', boxShadow: `0 8px 20px ${C.glowForest}`, fontFamily: FONT.sans }}
              >
                + {quickCreate.label}
              </motion.button>
              <motion.button
                onClick={() => nav(quickCreate.path)}
                whileTap={{ scale: 0.94 }}
                aria-label={quickCreate.label}
                title={quickCreate.label}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-lg font-semibold lg:hidden"
                style={{ background: C.emerald, color: '#fff', boxShadow: `0 8px 20px ${C.glowForest}` }}
              >
                +
              </motion.button>
            </>
          )}
          <ConnectivityBar />
          <InstallButton />
          <NotificationBell onClick={toggleNotifications} />
          <ThemeToggle />
          <button
            onClick={showShortcuts}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            className="hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors lg:flex"
            style={{ background: C.parchment, fontFamily: FONT.mono, color: C.inkSubtle, fontSize: 12 }}
          >
            ?
          </button>

          <div className="relative">
            <UserAvatar onClick={() => setMenuOpen((o) => !o)} size={36} />
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-xl border py-1"
                    style={{ background: C.white, borderColor: C.parchmentDark, boxShadow: C.shadowLg }}
                  >
                    {[
                      { label: 'Profile', action: () => { setMenuOpen(false); nav('/shared/profile') } },
                      { label: 'Settings', action: () => { setMenuOpen(false); nav('/shared/settings') } },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="block w-full px-3.5 py-2 text-left text-sm hover:bg-[var(--color-parchment)]"
                        style={{ fontFamily: FONT.sans, color: C.ink }}
                      >
                        {item.label}
                      </button>
                    ))}
                    <div className="my-1 border-t" style={{ borderColor: C.parchmentDark }} />
                    <button
                      onClick={signOut}
                      className="block w-full px-3.5 py-2 text-left text-sm hover:bg-[var(--color-parchment)]"
                      style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }}
                    >
                      Sign out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
