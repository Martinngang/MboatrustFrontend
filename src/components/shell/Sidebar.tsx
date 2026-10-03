import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useApp } from '../../context'
import { useMyRoleTypesQuery } from '../../api/session'
import { C, FONT, TAB_ROUTES, FUNDER_TABS, WORKSPACE_LINKS, ADMIN_LINKS, useNavRole } from '../MobileLayout'
import { resolveActiveId, type NavMatch } from './navActive'

const COLLAPSE_KEY = 'mboatrust-sidebar-collapsed'

const ROLE_LABEL: Record<string, string> = {
  funder: 'Diaspora Funder',
  contractor: 'Local Contractor',
  seller: 'Land Seller',
  supplier: 'Supplier',
  verifier: 'Local Verifier',
}

/** One nav row, used for the primary tabs, the Workspace links and the
 * Administration tier alike so "active" looks and behaves identically
 * everywhere: tinted pill + a solid accent bar on the leading edge (visible
 * even when the sidebar is collapsed to icons) + semibold label +
 * `aria-current="page"` (which is also what scroll-into-view keys off). */
function NavRow({
  active, collapsed, label, icon, onClick, size = 'md', layoutId, springTransition,
}: {
  active: boolean
  collapsed: boolean
  label: string
  icon: ReactNode
  onClick: () => void
  size?: 'md' | 'sm'
  layoutId: string
  springTransition: object
}) {
  const primary = size === 'md'
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: collapsed ? 0 : 2 }}
      whileTap={{ scale: 0.97 }}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`relative flex w-full items-center gap-3 text-left transition-colors ${primary ? 'rounded-2xl' : 'rounded-xl'} ${
        collapsed ? 'justify-center px-2 py-2.5' : primary ? 'px-3 py-3' : 'px-3 py-2.5'
      }`}
      style={{ color: active ? C.emerald : C.inkMuted }}
    >
      {active && (
        <>
          <motion.span
            layoutId={layoutId}
            className={`absolute inset-0 z-0 ${primary ? 'rounded-2xl' : 'rounded-xl'}`}
            style={{ background: C.parchment }}
            transition={springTransition}
          />
          {/* Sibling, not a child, of the layout-animated pill: a child would be
              squashed while the pill morphs between rows of different heights. */}
          <span aria-hidden className="absolute left-0 top-1/2 z-10 h-6 w-1 -translate-y-1/2 rounded-r-full" style={{ background: C.emerald }} />
        </>
      )}
      <span
        className={`relative z-10 flex flex-shrink-0 items-center justify-center transition-colors ${primary ? 'h-9 w-9 rounded-xl' : 'h-7 w-7 rounded-lg'}`}
        style={{ background: active ? C.emerald : primary ? C.parchment : 'transparent', color: active ? C.white : primary ? C.ink : 'inherit' }}
      >
        {icon}
      </span>
      {!collapsed && (
        <span style={{ fontFamily: FONT.sans }} className={`relative z-10 text-sm ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
      )}
    </motion.button>
  )
}

/** Persistent collapsible sidebar — workspace switcher, primary nav (same
 * TAB_ROUTES data BottomNav uses), a Favorites section (placeholder for
 * future pinning), and the Workspace/Administration tiers carried over from
 * the previous AppShell.
 *
 * Exactly one row is ever active across all three groups: they share one
 * longest-prefix resolver (see navActive.ts), so a sub-page keeps its parent
 * highlighted, two groups can't both claim the same route, and an unowned
 * page falls back to Menu instead of showing nothing. */
export function Sidebar() {
  const { name, devUserId } = useApp()
  const loc = useLocation()
  const nav = useNavigate()
  const reduceMotion = useReducedMotion()
  const { data: roleTypes = [] } = useMyRoleTypesQuery(Boolean(devUserId))
  const navRole = useNavRole()
  const tabs = TAB_ROUTES[navRole] ?? FUNDER_TABS
  const visibleAdminLinks = ADMIN_LINKS.filter((link) => roleTypes.includes(link.requiresRole))
  const springTransition = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 32 }

  // Tabs first so they win ties against the same route in a secondary group
  // (e.g. "Activity" tab vs the "Activity log" workspace link).
  const targets: NavMatch[] = [
    ...tabs.map((t) => ({ id: `tab:${t.label}`, paths: [...t.paths, ...(t.owns ?? [])] })),
    ...WORKSPACE_LINKS.map((l) => ({ id: `ws:${l.label}`, paths: [l.path, ...(l.owns ?? [])] })),
    ...visibleAdminLinks.map((l) => ({ id: `adm:${l.label}`, paths: [l.path, ...(l.owns ?? [])] })),
  ]
  const activeId = resolveActiveId(loc.pathname, targets, `tab:${tabs[tabs.length - 1].label}`)

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

  // The nav sits in its own scroll region (header + footer stay pinned), so on
  // a short window the active row can be scrolled out of view — e.g. landing
  // on /groups/dashboard by URL, or after a refresh. Bring it into view on
  // every route change; 'nearest' means no movement when it's already visible.
  const scrollRegionRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRegionRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
    el?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [activeId, collapsed, reduceMotion])

  return (
    // flex-shrink-0 so the sidebar keeps its own width when a wide screen
    // (e.g. a DataTable) would otherwise try to squeeze it in the flex row.
    // The aside itself never scrolls as a whole — only the nav sections
    // below the workspace switcher do — so the header stays put and the
    // active-role/admin footer (mt-auto) stays pinned to the bottom.
    <aside
      aria-label="Sidebar"
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
      <div ref={scrollRegionRef} className={`mt-7 min-h-0 flex-1 overflow-y-auto ${collapsed ? 'px-4' : 'px-6'}`}>
      {/* Primary nav — same destinations as the mobile bottom nav */}
      <nav aria-label="Primary" className="space-y-1">
        {tabs.map((tab) => (
          <NavRow
            key={tab.label}
            active={activeId === `tab:${tab.label}`}
            collapsed={collapsed}
            label={tab.label}
            icon={tab.icon}
            onClick={() => nav(tab.paths[0])}
            layoutId="sidebarNavIndicator"
            springTransition={springTransition}
          />
        ))}
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
      <div className="mt-7 pb-2">
        {!collapsed && <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 px-3 text-[10px] uppercase tracking-[0.3em]">Workspace</div>}
        <nav aria-label="Workspace" className="space-y-1">
          {WORKSPACE_LINKS.map((link) => (
            <NavRow
              key={link.label}
              size="sm"
              active={activeId === `ws:${link.label}`}
              collapsed={collapsed}
              label={link.label}
              icon={link.icon}
              onClick={() => nav(link.path)}
              layoutId="sidebarNavIndicator"
              springTransition={springTransition}
            />
          ))}
        </nav>
      </div>
      </div>

      <div className={`mt-auto flex-shrink-0 space-y-4 pb-6 pt-6 lg:pb-8 ${collapsed ? 'px-4' : 'px-6'}`}>
        {/* Administrative tier — deliberately set apart, and only rendered
            at all for accounts that actually hold a staff role. */}
        {visibleAdminLinks.length > 0 && (
          <div className={`rounded-2xl border border-dashed ${collapsed ? 'p-1.5' : 'p-3'}`} style={{ borderColor: C.parchmentDark }}>
            {!collapsed && <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 px-1 text-[9px] uppercase tracking-[0.3em]">Administration</div>}
            {visibleAdminLinks.map((link) => {
              const active = activeId === `adm:${link.label}`
              return (
                <button
                  key={link.label}
                  onClick={() => nav(link.path)}
                  title={collapsed ? link.label : undefined}
                  aria-label={collapsed ? link.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex w-full items-center rounded-lg text-left transition-colors hover:bg-[var(--color-parchment)] ${collapsed ? 'justify-center py-2' : 'justify-between px-2 py-1.5'}`}
                  style={{ background: active ? C.parchment : undefined }}
                >
                  {active && <span aria-hidden className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full" style={{ background: C.emerald }} />}
                  {collapsed ? (
                    <span style={{ fontFamily: FONT.mono, color: active ? C.emerald : C.inkMuted }} className="text-[9px] font-bold uppercase">{link.label[0]}</span>
                  ) : (
                    <>
                      <span style={{ fontFamily: FONT.sans, color: active ? C.emerald : C.inkMuted }} className={`text-xs ${active ? 'font-semibold' : 'font-medium'}`}>{link.label}</span>
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M4 3L9 7L4 11" stroke={active ? C.emerald : C.inkSubtle} strokeWidth="1.3" strokeLinecap="round" /></svg>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {!collapsed && (
          <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white, boxShadow: C.shadowSm }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">Active role</div>
            <div style={{ fontFamily: FONT.sans }} className="mt-2 text-sm font-semibold">{ROLE_LABEL[navRole]}</div>
          </div>
        )}
      </div>
    </aside>
  )
}
