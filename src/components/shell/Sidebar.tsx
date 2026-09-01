import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useApp } from '../../context'
import { useMyRoleTypesQuery } from '../../api/session'
import { C, FONT, TAB_ROUTES, FUNDER_TABS, WORKSPACE_LINKS, ADMIN_LINKS } from '../MobileLayout'

const COLLAPSE_KEY = 'mboatrust-sidebar-collapsed'

const ROLE_LABEL: Record<string, string> = {
  funder: 'Diaspora Funder',
  contractor: 'Local Contractor',
  seller: 'Land Seller',
  supplier: 'Supplier',
}

/** Persistent collapsible sidebar — workspace switcher, primary nav (same
 * TAB_ROUTES data BottomNav uses), a Favorites section (placeholder for
 * future pinning), and the Workspace/Administration tiers carried over from
 * the previous AppShell. */
export function Sidebar() {
  const { role, name, devUserId } = useApp()
  const loc = useLocation()
  const nav = useNavigate()
  const reduceMotion = useReducedMotion()
  const { data: roleTypes = [] } = useMyRoleTypesQuery(Boolean(devUserId))
  const effectiveRole = role ?? 'funder'
  const tabs = TAB_ROUTES[effectiveRole] ?? FUNDER_TABS
  const visibleAdminLinks = ADMIN_LINKS.filter((link) => roleTypes.includes(link.requiresRole))
  const springTransition = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 32 }

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
    // flex-shrink-0 so the sidebar keeps its own width when a wide screen
    // (e.g. a DataTable) would otherwise try to squeeze it in the flex row.
    // The aside itself never scrolls as a whole — only the nav sections
    // below the workspace switcher do — so the header stays put and the
    // active-role/admin footer (mt-auto) stays pinned to the bottom.
    <aside
      className={`hidden flex-shrink-0 flex-col overflow-hidden border-r lg:flex transition-[width] duration-200 ${collapsed ? 'w-20' : 'w-72'}`}
      style={{ borderColor: C.parchmentDark, background: C.glassBg }}
    >
      {/* Workspace switcher — pinned, never scrolls */}
      <div className={`flex items-center gap-3 px-4 pt-6 lg:pt-8 ${collapsed ? 'flex-col px-4' : 'px-6'}`}>
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: `1px solid ${C.parchmentDark}`, boxShadow: `0 8px 20px ${C.glowForest}` }}>
          <img src="/brand/logo-64.png" alt="Mboa Trust" className="h-9 w-9 object-contain" />
        </div>
        {!collapsed && (
          <button className="min-w-0 flex-1 text-left" title="Workspace switcher (single workspace for now)">
            <div style={{ fontFamily: FONT.serif }} className="truncate text-lg font-semibold">Mboa Trust</div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="truncate text-[10px] uppercase tracking-[0.25em]">{name || 'Personal'} workspace</div>
          </button>
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

      {/* Scrollable middle: primary nav + favorites + workspace links. Its own
          region (not the whole aside) so the header above and the footer
          below stay pinned regardless of how many nav items there are. */}
      <div className={`mt-7 min-h-0 flex-1 overflow-y-auto ${collapsed ? 'px-4' : 'px-6'}`}>
      {/* Primary nav — same destinations as the mobile bottom nav */}
      <nav className="space-y-1">
        {tabs.map((tab) => {
          const active = tab.paths.some((p) => loc.pathname.startsWith(p))
          return (
            <motion.button
              key={tab.label}
              onClick={() => nav(tab.paths[0])}
              whileHover={{ x: collapsed ? 0 : 2 }}
              whileTap={{ scale: 0.97 }}
              title={collapsed ? tab.label : undefined}
              className={`relative flex w-full items-center gap-3 rounded-2xl text-left transition-colors ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-3'}`}
              style={{ color: active ? C.emerald : C.inkMuted }}
            >
              {active && (
                <motion.span
                  layoutId="sidebarNavIndicator"
                  className="absolute inset-0 z-0 rounded-2xl"
                  style={{ background: C.parchment }}
                  transition={springTransition}
                />
              )}
              <span className="relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors" style={{ background: active ? C.emerald : C.parchment, color: active ? C.white : C.ink }}>{tab.icon}</span>
              {!collapsed && <span style={{ fontFamily: FONT.sans }} className="relative z-10 text-sm font-medium">{tab.label}</span>}
            </motion.button>
          )
        })}
      </nav>

      {/* Favorites — empty state today, real pinning is a follow-up feature */}
      {!collapsed && (
        <div className="mt-7">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 px-3 text-[10px] uppercase tracking-[0.3em]">Favorites</div>
          <div className="rounded-xl border border-dashed px-3 py-3" style={{ borderColor: C.parchmentDark }}>
            <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs leading-relaxed">Pin a project, tender, or listing to find it here instantly.</p>
          </div>
        </div>
      )}

      {/* Secondary — frequent-but-not-top-5 destinations */}
      <div className="mt-7">
        {!collapsed && <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 px-3 text-[10px] uppercase tracking-[0.3em]">Workspace</div>}
        <nav className="space-y-1">
          {WORKSPACE_LINKS.map((link) => {
            const active = loc.pathname.startsWith(link.path)
            return (
              <motion.button
                key={link.label}
                onClick={() => nav(link.path)}
                whileHover={{ x: collapsed ? 0 : 2 }}
                whileTap={{ scale: 0.97 }}
                title={collapsed ? link.label : undefined}
                className={`relative flex w-full items-center gap-3 rounded-xl text-left transition-colors ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}`}
                style={{ background: active ? C.parchment : 'transparent', color: active ? C.emerald : C.inkMuted }}
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center">{link.icon}</span>
                {!collapsed && <span style={{ fontFamily: FONT.sans }} className="text-sm font-medium">{link.label}</span>}
              </motion.button>
            )
          })}
        </nav>
      </div>
      </div>

      <div className={`mt-auto flex-shrink-0 space-y-4 pb-6 pt-6 lg:pb-8 ${collapsed ? 'px-4' : 'px-6'}`}>
        {/* Administrative tier — deliberately set apart, and only rendered
            at all for accounts that actually hold a staff role. */}
        {visibleAdminLinks.length > 0 && (
          <div className={`rounded-2xl border border-dashed ${collapsed ? 'p-1.5' : 'p-3'}`} style={{ borderColor: C.parchmentDark }}>
            {!collapsed && <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 px-1 text-[9px] uppercase tracking-[0.3em]">Administration</div>}
            {visibleAdminLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => nav(link.path)}
                title={collapsed ? link.label : undefined}
                className={`flex w-full items-center rounded-lg text-left transition-colors hover:bg-[var(--color-parchment)] ${collapsed ? 'justify-center py-2' : 'justify-between px-2 py-1.5'}`}
              >
                {collapsed ? (
                  <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[9px] font-bold uppercase">{link.label[0]}</span>
                ) : (
                  <>
                    <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs font-medium">{link.label}</span>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M4 3L9 7L4 11" stroke={C.inkSubtle} strokeWidth="1.3" strokeLinecap="round" /></svg>
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        {!collapsed && (
          <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white, boxShadow: C.shadowSm }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">Active role</div>
            <div style={{ fontFamily: FONT.sans }} className="mt-2 text-sm font-semibold">{ROLE_LABEL[effectiveRole]}</div>
          </div>
        )}
      </div>
    </aside>
  )
}
