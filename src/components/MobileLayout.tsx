import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context'
import { useTheme } from '../theme'
import { ConnectivityBar } from './ConnectivityBar'
import { InstallButton } from './InstallButton'
import type { ReactNode } from 'react'

// ── Shared style tokens ──────────────────────────────────────────────────────
// These resolve through CSS custom properties (see index.css) so every screen
// using C.xxx in an inline style automatically follows the active theme —
// see theme.tsx for the ThemeProvider that flips [data-theme] on <html>.
export const C = {
  forest: 'var(--color-forest)',
  forestLight: 'var(--color-forest-light)',
  forestDark: 'var(--color-forest-dark)',
  amber: 'var(--color-amber)',
  amberLight: 'var(--color-amber-light)',
  ink: 'var(--color-ink)',
  inkMuted: 'var(--color-ink-muted)',
  inkSubtle: 'var(--color-ink-subtle)',
  parchment: 'var(--color-parchment)',
  parchmentDark: 'var(--color-parchment-dark)',
  cream: 'var(--color-cream)',
  seal: 'var(--color-seal)',
  white: 'var(--color-white)',
  // Role-accent tokens — used only for dashboard hero differentiation between roles.
  steel: 'var(--color-steel)',
  moss: 'var(--color-moss)',
  // Translucent glass surfaces (sticky nav bars, glassmorphism dashboard shell).
  glassBg: 'var(--surface-glass-bg)',
  glassBorder: 'var(--surface-glass-border)',
  navGlassBg: 'var(--nav-glass-bg)',
  navGlassBorder: 'var(--nav-glass-border)',
}

export const FONT = {
  serif: "'Playfair Display', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
  mono: "'DM Mono', 'Courier New', monospace",
}

// ── Status badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    released: { bg: '#D1FAE5', text: '#065F46', label: 'Released' },
    under_review: { bg: '#FEF3C7', text: '#92400E', label: 'Under review' },
    pending: { bg: '#F3F4F6', text: '#6B7280', label: 'Pending' },
    disputed: { bg: '#FEE2E2', text: '#991B1B', label: 'Disputed' },
    active: { bg: '#DCFCE7', text: '#166534', label: 'Active' },
    completed: { bg: '#E0F2FE', text: '#0369A1', label: 'Completed' },
    accepted: { bg: '#D1FAE5', text: '#065F46', label: 'Accepted' },
    rejected: { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' },
    verified: { bg: '#D1FAE5', text: '#065F46', label: 'Verified' },
    unverified: { bg: '#FEF3C7', text: '#92400E', label: 'Pending verification' },
    in_progress: { bg: '#FEF3C7', text: '#92400E', label: 'In progress' },
    submitted: { bg: '#D1FAE5', text: '#065F46', label: 'Submitted' },
    flagged: { bg: '#FEE2E2', text: '#991B1B', label: 'Flagged' },
    approved: { bg: '#D1FAE5', text: '#065F46', label: 'Approved' },
  }
  const s = map[status] ?? { bg: '#F3F4F6', text: '#6B7280', label: status }
  return (
    <span
      style={{ fontFamily: FONT.mono, background: s.bg, color: s.text }}
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
    <div
      className={`px-5 pt-6 pb-4 lg:pt-5 ${dark ? '' : 'border-b'}`}
      style={{ borderColor: C.parchmentDark, background: bg }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {back && (
            <button
              onClick={onBack ?? (() => nav(-1))}
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
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

// ── Bottom tab nav ────────────────────────────────────────────────────────────
const TAB_ROUTES: Record<string, { icon: ReactNode; label: string; paths: string[] }[]> = {
  funder: [
    { icon: <HomeIcon />, label: 'Home', paths: ['/home'] },
    { icon: <GridIcon />, label: 'Projects', paths: ['/funder/browse', '/funder/project'] },
    { icon: <PlusIcon />, label: 'Create', paths: ['/funder/create'] },
    { icon: <ReceiptIcon />, label: 'Activity', paths: ['/funder/transactions'] },
    { icon: <UserIcon />, label: 'Profile', paths: ['/shared/profile'] },
  ],
  recipient: [
    { icon: <HomeIcon />, label: 'Home', paths: ['/home'] },
    { icon: <GridIcon />, label: 'Projects', paths: ['/recipient/projects', '/recipient/submit', '/recipient/submission-status', '/recipient/history'] },
    { icon: <UploadIcon />, label: 'Submit', paths: ['/recipient/submit'] },
    { icon: <WalletIcon />, label: 'Wallet', paths: ['/recipient/withdrawal'] },
    { icon: <UserIcon />, label: 'Profile', paths: ['/shared/profile'] },
  ],
  contractor: [
    { icon: <HomeIcon />, label: 'Home', paths: ['/home'] },
    { icon: <BriefcaseIcon />, label: 'Jobs', paths: ['/contractor/jobs', '/contractor/job'] },
    { icon: <GridIcon />, label: 'My Bids', paths: ['/contractor/bids'] },
    { icon: <WalletIcon />, label: 'Earnings', paths: ['/contractor/earnings'] },
    { icon: <UserIcon />, label: 'Profile', paths: ['/shared/profile'] },
  ],
  seller: [
    { icon: <HomeIcon />, label: 'Home', paths: ['/home'] },
    { icon: <MapIcon />, label: 'Browse', paths: ['/land/browse', '/land/listing'] },
    { icon: <PlusIcon />, label: 'List', paths: ['/land/create'] },
    { icon: <GridIcon />, label: 'My Listings', paths: ['/land/my-listings'] },
    { icon: <UserIcon />, label: 'Profile', paths: ['/shared/profile'] },
  ],
}

const FUNDER_TABS = TAB_ROUTES.funder

export function BottomNav() {
  const { role } = useApp()
  const loc = useLocation()
  const nav = useNavigate()
  const tabs = TAB_ROUTES[role ?? 'funder'] ?? FUNDER_TABS

  return (
    <div
      className="flex border-t"
      style={{ borderColor: C.parchmentDark, background: C.white }}
    >
      {tabs.map((tab) => {
        const active = tab.paths.some((p) => loc.pathname.startsWith(p))
        return (
          <button
            key={tab.label}
            onClick={() => nav(tab.paths[0])}
            className="flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors"
            style={{ color: active ? C.forest : C.inkSubtle }}
          >
            <span className={`${active ? 'scale-110' : ''} transition-transform duration-200`}>{tab.icon}</span>
            <span style={{ fontFamily: FONT.mono }} className="text-[9px] uppercase tracking-wider">
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Shell: wraps authenticated screens ───────────────────────────────────────
export function AppShell({ children, noNav }: { children: ReactNode; noNav?: boolean }) {
  const { role } = useApp()
  const loc = useLocation()
  const nav = useNavigate()
  const tabs = TAB_ROUTES[role ?? 'funder'] ?? FUNDER_TABS

  return (
    <div className="min-h-screen w-full" style={{ background: `linear-gradient(135deg, ${C.cream} 0%, ${C.parchment} 100%)`, color: C.ink }}>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="hidden w-72 flex-col border-r px-6 py-8 lg:flex" style={{ borderColor: C.parchmentDark, background: C.glassBg }}>
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: C.forest }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 2L18 7V15L11 20L4 15V7L11 2Z" fill="none" stroke={C.amber} strokeWidth="1.6" />
                  <circle cx="11" cy="11" r="2.5" fill={C.amber} />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: FONT.serif }} className="text-lg font-semibold">Mboa Trust</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">Web workspace</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">Active role</div>
            <div style={{ fontFamily: FONT.sans }} className="mt-2 text-sm font-semibold capitalize">{role ?? 'funder'}</div>
          </div>

          <nav className="mt-6 space-y-2">
            {tabs.map((tab) => {
              const active = tab.paths.some((p) => loc.pathname.startsWith(p))
              return (
                <button
                  key={tab.label}
                  onClick={() => nav(tab.paths[0])}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all"
                  style={{ background: active ? C.parchment : 'transparent', color: active ? C.forest : C.inkMuted }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: active ? C.forest : C.parchment, color: active ? C.white : C.ink }}>{tab.icon}</span>
                  <span style={{ fontFamily: FONT.sans }} className="text-sm font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="mt-auto rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: `linear-gradient(135deg, ${C.parchment} 0%, ${C.parchmentDark} 100%)` }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">Design focus</div>
            <div style={{ fontFamily: FONT.sans }} className="mt-2 text-sm font-semibold">Responsive workspace for desktop and mobile</div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="hidden border-b px-6 py-4 lg:flex" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div className="flex w-full items-center justify-between">
              <div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">Premium experience</div>
                <div style={{ fontFamily: FONT.serif }} className="text-lg font-semibold">Mboa Trust workspace</div>
              </div>
              <div className="flex items-center gap-3">
                <ConnectivityBar />
                <InstallButton />
                <ThemeToggle />
                <button onClick={() => nav('/shared/settings')} className="rounded-full px-4 py-2 text-sm font-semibold transition-all" style={{ background: C.forest, color: C.white }}>
                  Open settings
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between gap-2 px-4 pt-3 lg:hidden">
              <InstallButton />
              <ConnectivityBar />
            </div>
            <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8 lg:py-8">{children}</div>
          </main>
          {!noNav && <div className="lg:hidden"><BottomNav /></div>}
        </div>
      </div>
    </div>
  )
}

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
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 7V13M7 10H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 13V5M7 8L10 5L13 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4 14V16C4 16.6 4.4 17 5 17H15C15.6 17 16 16.6 16 16V14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border shadow-sm ${onClick ? 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg' : ''} ${className}`}
      style={{ background: C.white, borderColor: C.parchmentDark }}
    >
      {children}
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
  const styles = {
    primary: { background: C.forest, color: C.white, border: 'none' },
    secondary: { background: C.parchment, color: C.forest, border: `1px solid ${C.parchmentDark}` },
    ghost: { background: 'transparent', color: C.forest, border: `1px solid ${C.forest}` },
    danger: { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${fullWidth ? 'w-full' : ''}`}
      style={{ ...styles[variant], fontFamily: FONT.sans, boxShadow: '0 8px 24px rgba(15, 27, 20, 0.08)' }}
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
              {i < current ? '✓' : i + 1}
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
      className="rounded-[28px] border p-4 shadow-[0_20px_60px_rgba(15,27,20,0.08)] backdrop-blur sm:p-6 lg:p-8"
      style={{ background: C.glassBg, borderColor: C.glassBorder }}
    >
      {children}
    </div>
  )
}

export function DashboardHero({ eyebrow, title, subtitle, stats, background, action }: {
  eyebrow: string; title: string; subtitle?: string; stats: { label: string; value: string }[]; background?: string; action?: ReactNode
}) {
  return (
    <div className="rounded-[24px] p-5 sm:p-7" style={{ background: background ?? `linear-gradient(135deg, ${C.forest} 0%, ${C.forestLight} 100%)` }}>
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

export function QuickActionsGrid({ actions }: { actions: { icon: string; label: string; path: string }[] }) {
  const nav = useNavigate()
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map(({ icon, label, path }) => (
        <button
          key={label}
          onClick={() => nav(path)}
          className="flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition-all active:scale-95"
          style={{ borderColor: C.parchmentDark, background: C.white }}
        >
          <span className="text-xl">{icon}</span>
          <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px] uppercase tracking-[0.2em] leading-tight">{label}</span>
        </button>
      ))}
    </div>
  )
}
