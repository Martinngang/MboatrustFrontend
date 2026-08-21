import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { C, FONT } from '../MobileLayout'
import { AppIcon } from '../icons'
import { ADMIN_NAV } from './adminNav'
import { useMyAdminPermissionsQuery } from '../../api/session'

const COLLAPSE_KEY = 'mboatrust-admin-sidebar-collapsed'

/** The nav itself — grouped sections of icon+label buttons with an active
 * shared-element pill, same visual language as the consumer Sidebar
 * (components/shell/Sidebar.tsx). Reused by both the desktop AdminSidebar
 * (below) and AdminShell's mobile Drawer, so there's exactly one place
 * that renders admin nav items rather than two copies drifting apart.
 * `onNavigate` fires after every nav — the mobile drawer uses it to close
 * itself; the desktop sidebar passes a no-op. */
export function AdminNavList({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const loc = useLocation()
  const nav = useNavigate()
  const reduceMotion = useReducedMotion()
  const springTransition = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 32 }

  // null = unrestricted (see useMyAdminPermissionsQuery) — every section
  // shows. A restricted admin only sees sections whose items intersect
  // their granted keys; this is cosmetic only, requireAdminPermission on
  // the backend is the actual enforcement.
  const { data: permissions } = useMyAdminPermissionsQuery(true)
  const visibleSections = permissions == null
    ? ADMIN_NAV
    : ADMIN_NAV.map((group) => ({ ...group, items: group.items.filter((item) => permissions.includes(item.key)) })).filter((group) => group.items.length > 0)

  return (
    <div className="space-y-6">
      {visibleSections.map((group) => (
        <div key={group.section}>
          {!collapsed && (
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 px-2 text-[9px] uppercase tracking-[0.25em]">{group.section}</div>
          )}
          <nav className="space-y-1">
            {group.items.map((item) => {
              const active = loc.pathname === item.path || loc.pathname.startsWith(item.path + '/')
              return (
                <motion.button
                  key={item.key}
                  onClick={() => { nav(item.path); onNavigate?.() }}
                  whileHover={{ x: collapsed ? 0 : 2 }}
                  whileTap={{ scale: 0.97 }}
                  title={collapsed ? item.label : undefined}
                  className={`relative flex w-full items-center gap-3 rounded-xl text-left transition-colors ${collapsed ? 'justify-center px-2 py-2.5' : 'px-2.5 py-2.5'}`}
                  style={{ color: active ? C.forest : C.inkMuted }}
                >
                  {active && (
                    <motion.span
                      layoutId="adminSidebarIndicator"
                      className="absolute inset-0 z-0 rounded-xl"
                      style={{ background: C.parchment }}
                      transition={springTransition}
                    />
                  )}
                  <span className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors" style={{ background: active ? C.forest : 'transparent', color: active ? C.white : C.inkMuted }}>
                    <AppIcon name={item.icon} size={15} />
                  </span>
                  {!collapsed && <span style={{ fontFamily: FONT.sans }} className="relative z-10 text-sm font-medium">{item.label}</span>}
                </motion.button>
              )
            })}
          </nav>
        </div>
      ))}
    </div>
  )
}

/** Sidebar for the admin dashboard — same collapsible visual language as
 * the consumer Sidebar, but sourced from ADMIN_NAV's sections instead of
 * TAB_ROUTES, since an admin account has no `role` to key that off. Kept
 * as its own component (not a variant of the consumer one) for the same
 * reason AdminShell isn't a variant of AppShell — see AdminShell.tsx. */
export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
  })
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }

  return (
    <aside
      className={`hidden flex-shrink-0 flex-col overflow-hidden border-r lg:flex transition-[width] duration-200 ${collapsed ? 'w-20' : 'w-64'}`}
      style={{ borderColor: C.parchmentDark, background: C.glassBg }}
    >
      <div className={`flex items-center gap-3 pt-6 ${collapsed ? 'flex-col px-4' : 'px-5'}`}>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: C.forest, color: C.white }}>
          <AppIcon name="shield" size={18} strokeWidth={2} />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div style={{ fontFamily: FONT.serif }} className="truncate text-sm font-bold leading-tight">Mboa Trust</div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="truncate text-[9px] uppercase tracking-[0.25em] leading-tight">Admin</div>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-parchment)]"
          style={collapsed ? { marginLeft: 0, marginTop: 4 } : undefined}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ transform: collapsed ? 'rotate(180deg)' : undefined }}>
            <path d="M9 3L5 7L9 11" stroke={C.inkSubtle} strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <AdminNavList collapsed={collapsed} />
      </div>
    </aside>
  )
}
