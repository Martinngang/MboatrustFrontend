import { useNavigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useApp } from '../context'
import { useTheme } from '../theme'
import { Tilt3D } from './Tilt3D'
import type { ReactNode, KeyboardEvent } from 'react'
// AppShell (sidebar/top-bar/command-palette) lives in ./shell/AppShell and is
// re-exported below — kept out of this already-large file.

// C/FONT/StatusTone/STATUS_TONE_VARS live in ./tokens (a dependency-free leaf
// module) and are re-exported here so existing `from '../components/MobileLayout'`
// imports keep working — see tokens.ts for why they can't be defined in this
// file directly (this file re-exports AppShell, which pulls in the whole
// shell/ directory; anything in shell/ that needs these tokens must NOT
// import them from here, or it closes a circular import back to this file).
import { C, FONT, STATUS_TONE_VARS, type StatusTone } from './tokens'
export { C, FONT, STATUS_TONE_VARS, type StatusTone }
import { AppIcon, type IconName } from './icons'

const STATUS_MAP: Record<string, { tone: StatusTone; label: string }> = {
  released: { tone: 'success', label: 'Released' },
  under_review: { tone: 'warning', label: 'Under review' },
  pending: { tone: 'neutral', label: 'Pending' },
  disputed: { tone: 'error', label: 'Disputed' },
  active: { tone: 'success', label: 'Active' },
  completed: { tone: 'info', label: 'Completed' },
  accepted: { tone: 'success', label: 'Accepted' },
  rejected: { tone: 'error', label: 'Rejected' },
  verified: { tone: 'success', label: 'Verified' },
  unverified: { tone: 'warning', label: 'Pending verification' },
  in_progress: { tone: 'warning', label: 'In progress' },
  submitted: { tone: 'success', label: 'Submitted' },
  flagged: { tone: 'error', label: 'Flagged' },
  approved: { tone: 'success', label: 'Approved' },
  open: { tone: 'success', label: 'Open' },
  awarded: { tone: 'info', label: 'Awarded' },
  closed: { tone: 'neutral', label: 'Closed' },
}
export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { tone: 'neutral' as const, label: status }
  const { bg, text } = STATUS_TONE_VARS[s.tone]
  return (
    <span
      style={{ fontFamily: FONT.mono, background: bg, color: text }}
      className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full"
    >
      {s.label}
    </span>
  )
}

// ── Progress bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ pct, color = C.amber }: { pct: number; color?: string }) {
  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: C.parchmentDark }}>
      <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  )
}

// ── Theme toggle ─────────────────────────────────────────────────────────────
/** Sun/moon icon button that flips the app between light and dark mode. `dark` mirrors Header's tone prop for use on colored hero backgrounds. */
export function ThemeToggle({ dark }: { dark?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const stroke = dark ? '#FFFFFF' : C.ink
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors"
      style={{ background: dark ? 'rgba(255,255,255,0.14)' : C.parchment }}
    >
      {theme === 'dark' ? (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3.5" stroke={stroke} strokeWidth="1.4" />
          <path d="M8 1V2.5M8 13.5V15M15 8H13.5M2.5 8H1M12.9 3.1L11.8 4.2M4.2 11.8L3.1 12.9M12.9 12.9L11.8 11.8M4.2 4.2L3.1 3.1" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M14 9.8A6.2 6.2 0 116.2 2 5 5 0 0014 9.8Z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

// ── Notification bell ───────────────────────────────────────────────────────
/** Global unread-notifications entry point — lives in both the mobile top bar
 * and the desktop header so notifications are always one tap away instead of
 * buried inside Settings or bolted onto a single role's dashboard. Opens the
 * NotificationsDrawer overlay; `onClick` is injected by the caller (rather
 * than this component importing useNotificationsDrawer itself) because that
 * hook's module imports C/FONT back from this one — closing the loop here
 * would make the two files circularly dependent on each other. */
export function NotificationBell({ dark, onClick }: { dark?: boolean; onClick: () => void }) {
  const { unreadNotifications } = useApp()
  const stroke = dark ? '#FFFFFF' : C.ink
  return (
    <button
      onClick={onClick}
      aria-label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
      className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors"
      style={{ background: dark ? 'rgba(255,255,255,0.14)' : C.parchment }}
    >
      <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
        <path d="M9 2C6 2 4 4.5 4 7V11L2 13H16L14 11V7C14 4.5 12 2 9 2Z" stroke={stroke} strokeWidth="1.3" />
        <path d="M7 13C7 14.1 7.9 15 9 15C10.1 15 11 14.1 11 13" stroke={stroke} strokeWidth="1.3" />
      </svg>
      {unreadNotifications > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold"
          style={{ background: C.seal, color: '#fff', fontFamily: FONT.mono }}
        >
          {unreadNotifications > 9 ? '9+' : unreadNotifications}
        </span>
      )}
    </button>
  )
}

// ── User avatar ──────────────────────────────────────────────────────────────
/** Renders the account's uploaded photo (User.avatarUrl, set via
 * ProfileScreen's "change photo" control) when there is one, falling back
 * to an initials circle otherwise — the same fallback every avatar spot in
 * the app already used before photo upload existed. Shared so TopBar's
 * desktop avatar and the mobile top bar's render identically. */
export function UserAvatar({ onClick, size = 32 }: { onClick: () => void; size?: number }) {
  const { name, avatarUrl } = useApp()
  return (
    <button
      onClick={onClick}
      aria-label="Profile"
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-bold"
      style={{ width: size, height: size, background: C.emerald, color: C.white, fontFamily: FONT.serif, fontSize: size * 0.42 }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        name ? name[0].toUpperCase() : 'M'
      )}
    </button>
  )
}

// ── Amount formatter ──────────────────────────────────────────────────────────
export function fmt(n: number) {
  return 'XAF ' + n.toLocaleString('fr-FR')
}

// ── Screen header ─────────────────────────────────────────────────────────────
export function Header({ title, subtitle, back, onBack, action, children, tone = 'light', background }: {
  title: string; subtitle?: string; back?: boolean; onBack?: () => void; action?: ReactNode; children?: ReactNode
  tone?: 'light' | 'dark'; background?: string
}) {
  const nav = useNavigate()
  const dark = tone === 'dark'
  const bg = background ?? (dark ? 'transparent' : C.white)
  const titleColor = dark ? C.white : C.ink
  const subtitleColor = dark ? 'rgba(255,255,255,0.6)' : C.inkSubtle
  const iconStroke = dark ? '#FFFFFF' : C.ink
  return (
    // Only the compact title/back/action row sticks — `children` (which
    // ranges from a small step-indicator to a full hero stat block) stays
    // in normal flow below it and scrolls away, so a screen with a tall
    // children block never ends up with an oversized sticky header eating
    // the viewport. Both blocks paint their own `bg`, so they read as one
    // seamless block until the page is actually scrolled.
    //
    // Deliberately a Fragment, not a wrapping <div>: `position: sticky`
    // can only stay "stuck" for as long as the viewport is still scrolling
    // through its own containing block (its DOM parent) — it can't stick
    // past that parent's bottom edge. A wrapping div here would make that
    // parent just [sticky row + this screen's own `children` prop], which
    // for the very common case of no `children` at all is barely taller
    // than the sticky row itself, giving it almost no room to visibly
    // stick before scrolling past its own container. Every screen renders
    // <Header/> immediately followed by the rest of that screen's content
    // as JSX siblings (inside AppShell, which has no extra wrapper around
    // them — see ScreenErrorBoundary), so without this wrapper the sticky
    // row's real containing block is the full page's content column,
    // which is exactly the scroll range it needs.
    <>
      <div
        className={`sticky top-0 z-30 px-5 pt-6 pb-4 lg:pt-5 ${!dark && !children ? 'border-b' : ''}`}
        style={{ borderColor: C.parchmentDark, background: bg }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {back && (
              <button
                onClick={onBack ?? (() => nav(-1))}
                aria-label="Back"
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${dark ? '' : 'hover:bg-[var(--color-parchment)]'}`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8L10 13" stroke={iconStroke} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              <div style={{ fontFamily: FONT.serif, color: titleColor }} className="font-bold text-base truncate">
                {title}
              </div>
              {subtitle && (
                <div style={{ fontFamily: FONT.mono, color: subtitleColor }} className="text-[10px] uppercase tracking-wider truncate">
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </div>
      {children && <div className={`px-5 pb-4 ${dark ? '' : 'border-b'}`} style={{ borderColor: C.parchmentDark, background: bg }}>{children}</div>}
    </>
  )
}

// ── Primary navigation ──────────────────────────────────────────────────────
// Drives both the mobile bottom nav and the desktop sidebar from one source
// of truth. Each role gets 5 destinations — the ones used often enough to
// deserve a permanent slot. Single-shot actions (create a project, submit
// proof) live as header buttons on the relevant list screen instead of
// eating a tab; "Menu" is the hub for everything else (see ProfileScreen).
export const TAB_ROUTES: Record<string, { icon: ReactNode; label: string; paths: string[] }[]> = {
  funder: [
    { icon: <HomeIcon />, label: 'Home', paths: ['/home'] },
    { icon: <GridIcon />, label: 'Projects', paths: ['/workspace/projects', '/funder/browse', '/funder/project', '/funder/create'] },
    { icon: <MessageIcon />, label: 'Messages', paths: ['/messages'] },
    { icon: <ReceiptIcon />, label: 'Activity', paths: ['/activity'] },
    { icon: <UserIcon />, label: 'Menu', paths: ['/shared/profile'] },
  ],
  recipient: [
    { icon: <HomeIcon />, label: 'Home', paths: ['/home'] },
    { icon: <GridIcon />, label: 'Projects', paths: ['/recipient/projects', '/recipient/submit', '/recipient/submission-status', '/recipient/history'] },
    { icon: <MessageIcon />, label: 'Messages', paths: ['/messages'] },
    { icon: <WalletIcon />, label: 'Wallet', paths: ['/recipient/withdrawal'] },
    { icon: <UserIcon />, label: 'Menu', paths: ['/shared/profile'] },
  ],
  contractor: [
    { icon: <HomeIcon />, label: 'Home', paths: ['/home'] },
    { icon: <BriefcaseIcon />, label: 'Jobs', paths: ['/workspace/jobs', '/contractor/jobs', '/contractor/job', '/contractor/bids', '/contractor/contract'] },
    { icon: <MessageIcon />, label: 'Messages', paths: ['/messages'] },
    { icon: <WalletIcon />, label: 'Earnings', paths: ['/contractor/earnings'] },
    { icon: <UserIcon />, label: 'Menu', paths: ['/shared/profile'] },
  ],
  seller: [
    { icon: <HomeIcon />, label: 'Home', paths: ['/home'] },
    { icon: <MapIcon />, label: 'Browse', paths: ['/workspace/land', '/land/browse', '/land/listing'] },
    { icon: <MessageIcon />, label: 'Messages', paths: ['/messages'] },
    { icon: <GridIcon />, label: 'My Listings', paths: ['/land/my-listings', '/land/create'] },
    { icon: <UserIcon />, label: 'Menu', paths: ['/shared/profile'] },
  ],
}

export const FUNDER_TABS = TAB_ROUTES.funder

// Secondary "Workspace" links — desktop-only, sits below primary nav so
// frequent-but-not-top-5 destinations don't require a trip through the Menu
// hub. Same three for every role: broadly useful, not role-exclusive.
export const WORKSPACE_LINKS: { icon: ReactNode; label: string; path: string }[] = [
  { icon: <ReceiptIcon />, label: 'Activity log', path: '/activity' },
  { icon: <UsersIcon />, label: 'Community', path: '/groups/dashboard' },
  { icon: <ConverterIcon />, label: 'Currency converter', path: '/tools/currency-converter' },
  { icon: <GearIcon />, label: 'Settings', path: '/shared/settings' },
]

// Administrative tier — verifier & platform-staff tools. Visually and
// structurally separated from the personal workspace above, and only ever
// shown to accounts that actually hold the matching backend role — most
// accounts hold neither, so this tier is normally invisible, not a
// standing assumption that every user is staff.
export const ADMIN_LINKS: { label: string; path: string; requiresRole: 'verifier' | 'admin' }[] = [
  { label: 'Verifier dashboard', path: '/verifier/dashboard', requiresRole: 'verifier' },
  { label: 'Admin panel', path: '/admin', requiresRole: 'admin' },
]

export function BottomNav() {
  const { role } = useApp()
  const loc = useLocation()
  const nav = useNavigate()
  const reduceMotion = useReducedMotion()
  const tabs = TAB_ROUTES[role ?? 'funder'] ?? FUNDER_TABS

  return (
    // Literal position:fixed pinned to the viewport edge — the same
    // technique used for the mobile bottom nav in the Technique Academy
    // project, adopted here after the grid-sibling approach (relying on a
    // dvh/grid-clamped ancestor to keep this in normal flow at the bottom)
    // repeatedly failed to render on real mobile devices for reasons that
    // never reproduced in any static/dev-server check. Fixed positioning
    // only needs one invariant to hold: no ancestor between this element
    // and <body> may have a `transform` (or filter/perspective/will-change:
    // transform), since that would turn the ancestor into this element's
    // containing block instead of the viewport. AppShell renders this as a
    // sibling of <main> — never inside the Framer Motion page-transition
    // wrapper, which is the one thing nearby that does apply a transform —
    // so that invariant holds. z-40 matches the "sticky in-page nav" tier
    // documented in index.css. pad for the home-indicator gesture bar on
    // notched phones so tab labels/press targets aren't flush against it.
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex border-t lg:hidden"
      style={{ borderColor: C.parchmentDark, background: C.white, boxShadow: C.shadowMd, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const active = tab.paths.some((p) => loc.pathname.startsWith(p))
        return (
          <button
            key={tab.label}
            onClick={() => nav(tab.paths[0])}
            className="relative flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors active:scale-95"
            style={{ color: active ? C.forest : C.inkSubtle }}
          >
            {active && (
              <motion.span
                layoutId="bottomNavIndicator"
                className="absolute top-0.5 z-0 h-8 w-11 rounded-xl"
                style={{ background: C.parchment }}
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex flex-col items-center gap-0.5">
              <span className={`${active ? 'scale-110' : ''} transition-transform duration-200`}>{tab.icon}</span>
              <span style={{ fontFamily: FONT.mono }} className="text-[9px] uppercase tracking-wider">
                {tab.label}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Shell: wraps authenticated screens ───────────────────────────────────────
// The full sidebar/top-bar/command-palette shell now lives in
// src/components/shell/AppShell.tsx (management-app IA upgrade) — re-exported
// here under the same name so every existing `import { AppShell } from
// '../components/MobileLayout'` call site keeps working unchanged.
export { AppShell } from './shell/AppShell'

export function PageShell({ children, className = '', background = C.cream }: { children: ReactNode; className?: string; background?: string }) {
  return (
    <div className={`min-h-full w-full ${className}`} style={{ background }}>
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {children}
      </div>
    </div>
  )
}

// ── Icon components ───────────────────────────────────────────────────────────
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 9L10 3L17 9V17H13V13H7V17H3V9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
function MessageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2 4.5C2 3.7 2.7 3 3.5 3H16.5C17.3 3 18 3.7 18 4.5V12.5C18 13.3 17.3 14 16.5 14H7L3 17.5V14H3.5C2.7 14 2 13.3 2 12.5V4.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
function ReceiptIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 2H15V18L12 16L10 18L8 16L5 18V2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="8" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8" y1="10" x2="12" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 18C3 14.5 6 12 10 12C14 12 17 14.5 17 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 17C1.5 13.5 4 11 7 11C10 11 12.5 13.5 12.5 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 11.3C15.3 11.9 17 14.1 17 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 4.2C13.2 4.6 14 5.7 14 7C14 8.3 13.2 9.4 12 9.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function ConverterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M3 7H15M15 7L11.5 3.5M15 7L11.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 13H5M5 13L8.5 9.5M5 13L8.5 16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 2.5V4.5M10 15.5V17.5M17.5 10H15.5M4.5 10H2.5M15.3 4.7L13.9 6.1M6.1 13.9L4.7 15.3M15.3 15.3L13.9 13.9M6.1 6.1L4.7 4.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="5" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 9H18" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="14" cy="13" r="1.5" fill="currentColor" />
    </svg>
  )
}
function BriefcaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="7" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 7V5C7 4 7.7 3 9 3H11C12.3 3 13 4 13 5V7" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
function MapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2C7 2 5 4.5 5 7C5 11 10 17 10 17C10 17 15 11 15 7C15 4.5 13 2 10 2Z" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

// ── Card component ─────────────────────────────────────────────────────────────
// variant: default (existing look, backward compatible) | elevated (deeper
// shadow, no border) | glass (translucent + blur, formalizes the glass
// styling already used ad hoc in DashboardShell) | interactive (spring
// hover-lift instead of a CSS transition class).
// tilt: composes Tilt3D for deliberate emphasis moments (opt-in, not blanket).
export function Card({ children, className = '', onClick, variant = 'default', tilt = false }: {
  children: ReactNode; className?: string; onClick?: () => void
  variant?: 'default' | 'elevated' | 'glass' | 'interactive'; tilt?: boolean
}) {
  const base: Record<string, { background: string; border: string; boxShadow: string }> = {
    default: { background: C.white, border: `1px solid ${C.parchmentDark}`, boxShadow: C.shadowSm },
    elevated: { background: C.white, border: 'none', boxShadow: C.shadowLg },
    glass: { background: C.glassBg, border: `1px solid ${C.glassBorder}`, boxShadow: C.shadowMd },
    interactive: { background: C.white, border: `1px solid ${C.parchmentDark}`, boxShadow: C.shadowSm },
  }
  const s = base[variant]
  const content = (
    <div
      className={`rounded-2xl ${variant === 'glass' ? 'backdrop-blur-xl' : ''} ${className}`}
      style={{ background: s.background, border: s.border, boxShadow: s.boxShadow }}
    >
      {children}
    </div>
  )
  // tilt is a hover/visual effect, independent of clickability — a showcase
  // card can tilt for emphasis without being navigable to anywhere.
  const tilted = tilt ? <Tilt3D max={5}>{content}</Tilt3D> : content
  if (!onClick) return tilted
  // A <div role="button"> rather than a real <button> — cards routinely wrap
  // other interactive controls (buttons, switches, links) that a real
  // <button> can't legally contain — but still needs to be a real keyboard
  // target: tab-focusable and Enter/Space-activatable, same as GroupedLinks'
  // row pattern (see SharedScreens.tsx), not just mouse/touch-only.
  const a11yProps = {
    role: 'button' as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } },
  }
  if (tilt) {
    return <div {...a11yProps} className="cursor-pointer">{tilted}</div>
  }
  if (variant === 'interactive') {
    return (
      <motion.div {...a11yProps} whileHover={{ y: -3, boxShadow: C.shadowLg }} whileTap={{ scale: 0.985 }} className="cursor-pointer rounded-2xl">
        {content}
      </motion.div>
    )
  }
  return (
    <div {...a11yProps} className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg rounded-2xl">
      {content}
    </div>
  )
}

// ── Stars ──────────────────────────────────────────────────────────────────────
export function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 10 10" fill={i <= Math.round(rating) ? C.amber : C.parchmentDark}>
          <path d="M5 1L6.2 3.8H9L6.8 5.7L7.6 8.5L5 6.8L2.4 8.5L3.2 5.7L1 3.8H3.8L5 1Z" />
        </svg>
      ))}
      <span style={{ fontFamily: FONT.mono }} className="text-[10px] ml-1">
        {rating}
      </span>
    </div>
  )
}

// ── Pill button ──────────────────────────────────────────────────────────────
export function PillButton({ children, onClick, variant = 'primary', fullWidth, disabled }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; fullWidth?: boolean; disabled?: boolean
}) {
  const styles: Record<string, { background: string; color: string; border: string; boxShadow: string }> = {
    primary: { background: C.forest, color: C.white, border: 'none', boxShadow: `0 8px 24px ${C.glowForest}` },
    secondary: { background: C.parchment, color: C.forest, border: `1px solid ${C.parchmentDark}`, boxShadow: C.shadowSm },
    ghost: { background: 'transparent', color: C.forest, border: `1px solid ${C.forest}`, boxShadow: 'none' },
    danger: { background: 'var(--status-error-bg)', color: 'var(--status-error-text)', border: '1px solid var(--status-error-bg)', boxShadow: C.shadowSm },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${fullWidth ? 'w-full' : ''}`}
      style={{ ...styles[variant], fontFamily: FONT.sans }}
    >
      {children}
    </button>
  )
}

// ── Step indicator (horizontal numbered stages) ───────────────────────────────
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: i <= current ? C.forest : C.parchmentDark, color: i <= current ? C.white : C.inkSubtle, fontFamily: FONT.mono }}
            >
              {i < current ? <AppIcon name="check" size={11} strokeWidth={2.5} /> : i + 1}
            </div>
            <span style={{ fontFamily: FONT.mono, color: i <= current ? C.forest : C.inkSubtle }} className="text-[10px] uppercase tracking-wide capitalize whitespace-nowrap">{s}</span>
          </div>
          {i < steps.length - 1 && <div className="flex-1 h-px" style={{ background: i < current ? C.forest : C.parchmentDark }} />}
        </div>
      ))}
    </div>
  )
}

// ── Vertical timeline (status stepper) ─────────────────────────────────────────
export function VerticalSteps({ steps }: { steps: { label: string; time: string; done: boolean; current?: boolean }[] }) {
  return (
    <div className="space-y-0">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: s.done ? C.forest : s.current ? C.amber : C.parchmentDark }}
            >
              {s.done ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7L5.5 9.5L11 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : s.current ? (
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: C.forestDark }} />
              ) : (
                <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{i + 1}</span>
              )}
            </div>
            {i < steps.length - 1 && <div className="w-px h-8 my-1" style={{ background: s.done ? C.forest : C.parchmentDark }} />}
          </div>
          <div className="pb-4">
            <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{s.label}</div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">{s.time}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── MoMo / Orange Money picker ─────────────────────────────────────────────────
export function MomoOmPicker({ method, onChange }: { method: 'momo' | 'om'; onChange: (m: 'momo' | 'om') => void }) {
  const options = [
    { id: 'momo' as const, name: 'MTN MoMo', color: '#FFCC00', bg: '#FFF9E6', logo: 'MTN' },
    { id: 'om' as const, name: 'Orange Money', color: '#FF6600', bg: '#FFF0E6', logo: 'OM' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map(({ id, name, color, bg, logo }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all"
          style={{ borderColor: method === id ? color : C.parchmentDark, background: method === id ? bg : C.white }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: color, color: '#111', fontFamily: FONT.mono }}>
            {logo}
          </div>
          <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-xs font-semibold">{name}</span>
        </button>
      ))}
    </div>
  )
}

// ── Dashboard hero + shell (responsive role-dashboard chrome) ─────────────────
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-[28px] border p-4 backdrop-blur-xl sm:p-6 lg:p-8"
      style={{ background: C.glassBg, borderColor: C.glassBorder, boxShadow: C.shadowLg }}
    >
      {children}
    </div>
  )
}

export function DashboardHero({ eyebrow, title, subtitle, stats, background, action }: {
  eyebrow: string; title: string; subtitle?: string; stats: { label: string; value: string }[]; background?: string; action?: ReactNode
}) {
  return (
    <div className="rounded-[24px] p-5 sm:p-7" style={{ background: background ?? C.gradientPrimary, boxShadow: C.shadowLg }}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-xs uppercase tracking-[0.3em]">{eyebrow}</p>
          <h1 style={{ fontFamily: FONT.serif }} className="mt-1 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          {subtitle && <p style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.74)' }} className="mt-2 max-w-xl text-sm sm:text-base">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
            <div style={{ fontFamily: FONT.serif }} className="text-xl font-bold text-white">{value}</div>
            <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="mt-1 text-[10px] uppercase tracking-[0.25em]">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function QuickActionsGrid({ actions }: { actions: { icon: IconName; label: string; path: string }[] }) {
  const nav = useNavigate()
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className="grid gap-3 grid-cols-2 sm:grid-cols-2 xl:grid-cols-4"
      variants={reduceMotion ? undefined : { show: { transition: { staggerChildren: 0.05 } } }}
      initial={reduceMotion ? undefined : 'hidden'}
      animate={reduceMotion ? undefined : 'show'}
    >
      {actions.map(({ icon, label, path }) => (
        <motion.button
          key={label}
          onClick={() => nav(path)}
          variants={reduceMotion ? undefined : { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
          whileHover={{ y: -3, boxShadow: C.shadowMd }}
          whileTap={{ scale: 0.96 }}
          className="flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center"
          style={{ borderColor: C.parchmentDark, background: C.white, boxShadow: C.shadowSm }}
        >
          <span style={{ color: C.forest }}><AppIcon name={icon} size={22} /></span>
          <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px] uppercase tracking-[0.2em] leading-tight">{label}</span>
        </motion.button>
      ))}
    </motion.div>
  )
}
