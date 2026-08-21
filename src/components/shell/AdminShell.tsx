import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context'
import { C, FONT, UserAvatar } from '../MobileLayout'
import { AppIcon } from '../icons'
import { Drawer } from './Drawer'
import { AdminSidebar, AdminNavList } from './AdminSidebar'

/** Chrome for the admin dashboard — deliberately its own thing, not a reuse
 * of AppShell with the role left null. AppShell's Sidebar/TopBar/BottomNav
 * are all keyed off the consumer `Role` union (funder/recipient/contractor/
 * seller) via TAB_ROUTES/QUICK_CREATE_BY_ROLE — an admin has no such role,
 * so reusing it would silently default to funder-flavored navigation
 * (`TAB_ROUTES[role ?? 'funder']`), which is exactly the "why am I being
 * treated like a funder" problem this whole dashboard exists to fix.
 *
 * Sidebar + topbar + scrolling main, same shell shape as the consumer
 * AppShell — AdminSidebar is desktop-only (`hidden lg:flex`); below that
 * breakpoint a hamburger opens the same nav list in a Drawer instead of a
 * bottom tab bar (an admin's nav has 4-6 destinations across sections,
 * more than a 5-tab bottom bar comfortably fits). */
export function AdminShell({ children }: { children: ReactNode }) {
  const nav = useNavigate()
  const { name, logout } = useApp()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const signOut = async () => {
    await logout()
    nav('/admin/login', { replace: true })
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden" style={{ background: C.gradientSurface, color: C.ink }}>
      <AdminSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex flex-shrink-0 items-center gap-3 border-b px-4 sm:px-6"
          style={{ borderColor: C.parchmentDark, background: C.white, paddingTop: 'max(0.875rem, env(safe-area-inset-top))', paddingBottom: '0.875rem' }}
        >
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl lg:hidden"
            style={{ background: C.parchment, color: C.ink }}
          >
            <AppIcon name="menu" size={17} />
          </button>

          <button onClick={() => nav('/admin')} className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: C.forest, color: C.white }}>
              <AppIcon name="shield" size={18} strokeWidth={2} />
            </div>
          </button>

          <div className="ml-auto flex items-center gap-3">
            <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="hidden sm:inline text-xs font-medium">{name}</span>
            <UserAvatar onClick={() => {}} size={32} />
            <button
              onClick={signOut}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ background: C.parchment, color: C.inkSubtle, fontFamily: FONT.sans }}
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
            {children}
          </div>
        </main>
      </div>

      <Drawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} title="Admin" subtitle="Mboa Trust">
        <AdminNavList onNavigate={() => setMobileNavOpen(false)} />
      </Drawer>
    </div>
  )
}
