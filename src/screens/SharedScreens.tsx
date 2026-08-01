import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context'
import { useCompliance } from '../compliance'
import { useTheme } from '../theme'
import { C, FONT, AppShell, Card, Header } from '../components/MobileLayout'
import { Switch } from '../components/Switch'
import { StaggerList, StaggerItem } from '../components/Stagger'

// ── Shared grouped-links list ─────────────────────────────────────────────────
// One visual pattern for every "list of destinations" block — used by both
// Settings (pure preferences) and the Menu hub (everything else), so the two
// screens read as one consistent system instead of two different UIs.
function GroupedLinks({ title, items, dashed }: {
  title: string
  items: { label: string; sub?: string; action: () => void; right?: ReactNode }[]
  dashed?: boolean
}) {
  return (
    <div>
      {title && <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">{title}</div>}
      <div className={`rounded-2xl border overflow-hidden ${dashed ? 'border-dashed' : ''}`} style={{ borderColor: C.parchmentDark, boxShadow: dashed ? 'none' : C.shadowSm }}>
        {items.map(({ label, sub, action, right }, i) => (
          // A <div role="button"> rather than a real <button> — `right` may
          // itself be an interactive control (e.g. Switch, which renders its
          // own <button>), and a <button> can't legally contain one.
          <div
            key={label}
            role="button"
            tabIndex={0}
            onClick={action}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action() } }}
            className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left cursor-pointer hover:bg-[var(--color-parchment)] transition-colors"
            style={{ borderBottom: i < items.length - 1 ? `1px solid ${C.parchmentDark}` : 'none', background: C.white }}
          >
            <div className="min-w-0">
              <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">{label}</div>
              {sub && <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">{sub}</div>}
            </div>
            {right ?? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                <path d="M4 3L9 7L4 11" stroke={C.inkSubtle} strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function NotificationsScreen() {
  const { notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead } = useApp()

  return (
    <AppShell>
      <Header
        title="Notifications"
        subtitle={unreadNotifications > 0 ? `${unreadNotifications} unread` : undefined}
        back
        action={unreadNotifications > 0 && (
          <button onClick={markAllNotificationsRead} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold">
            Mark all read
          </button>
        )}
      />

      <StaggerList className="divide-y sm:grid sm:grid-cols-2 sm:divide-y-0 sm:gap-3 sm:p-4">
        {notifications.map((n) => (
          <StaggerItem key={n.id}>
            <div
              className="flex gap-4 px-5 py-4 cursor-pointer hover:bg-[var(--color-parchment)] transition-colors sm:rounded-2xl sm:border sm:px-4"
              style={{ background: n.unread ? 'var(--status-success-bg)' : 'transparent', borderColor: C.parchmentDark }}
              onClick={() => markNotificationRead(n.id)}
            >
              <div className="text-xl flex-shrink-0 mt-0.5">{n.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{n.title}</div>
                  {n.unread && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: C.forest }} />}
                </div>
                <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-0.5 leading-relaxed">{n.body}</p>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-1.5">{n.time}</div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerList>
    </AppShell>
  )
}

// ── Settings — true preferences only ──────────────────────────────────────────
// Appearance, account basics, security, and notification toggles. Everything
// that isn't a personal preference (messaging, community, tools, staff
// features) now lives in the Menu hub (ProfileScreen) instead of here.
export function SettingsScreen() {
  const nav = useNavigate()
  const { lang, setLoggedIn, setRole } = useApp()
  const { myKyc } = useCompliance()
  const kycLabel: Record<typeof myKyc.status, string> = { unverified: 'Not verified', pending: 'Under review', verified: 'Verified ✓', rejected: 'Rejected — action needed' }
  const { theme, toggleTheme } = useTheme()
  const [notifOn, setNotifOn] = useState(true)
  const [biometric, setBiometric] = useState(false)

  const sections: { title: string; items: { label: string; sub?: string; action: () => void; right?: ReactNode }[] }[] = [
    {
      title: 'Appearance',
      items: [
        {
          label: 'Dark mode',
          sub: theme === 'dark' ? 'On' : 'Off',
          action: toggleTheme,
          right: <Switch checked={theme === 'dark'} onChange={() => toggleTheme()} />,
        },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Language', sub: lang === 'en' ? 'English' : 'Français', action: () => nav('/language') },
        { label: 'Linked MoMo account', sub: '+237 677 234 891 · MTN', action: () => {} },
        { label: 'Linked Orange Money', sub: 'Not connected', action: () => {} },
        { label: 'Switch role', sub: 'Change your primary role', action: () => nav('/role') },
      ],
    },
    {
      title: 'Security',
      items: [
        { label: 'Change PIN', sub: 'Update your 4-digit transaction PIN', action: () => {} },
        {
          label: 'Biometric login',
          sub: 'Face ID / fingerprint',
          action: () => setBiometric(!biometric),
          right: <Switch checked={biometric} onChange={setBiometric} />,
        },
        { label: 'ID verification (KYC/AML)', sub: `Status: ${kycLabel[myKyc.status]}`, action: () => nav('/compliance/kyc') },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          label: 'Push notifications',
          sub: 'Milestone updates, bids, approvals',
          action: () => setNotifOn(!notifOn),
          right: <Switch checked={notifOn} onChange={setNotifOn} />,
        },
        { label: 'Notification preferences', sub: 'Granular control per notification type', action: () => nav('/shared/notifications/preferences') },
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'How Mboa Trust works', sub: 'Walkthrough & FAQ', action: () => nav('/shared/help') },
        { label: 'Contact support', sub: 'support@mboatrust.cm', action: () => {} },
        { label: 'Privacy policy', action: () => {} },
        { label: 'Terms of service', action: () => {} },
      ],
    },
  ]

  return (
    <AppShell>
      <Header title="Settings" back />

      <div className="pb-8 sm:mx-auto sm:max-w-3xl sm:grid sm:grid-cols-2 sm:gap-6 sm:px-6">
        {sections.map((section) => (
          <div key={section.title} className="mt-6 px-5 sm:px-0">
            <GroupedLinks {...section} />
          </div>
        ))}

        {/* Sign out */}
        <div className="px-5 mt-6 sm:col-span-2 sm:px-0">
          <button
            onClick={() => { setLoggedIn(false); setRole(null); nav('/') }}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm border-2 transition-all"
            style={{ borderColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', background: 'var(--status-error-bg)', fontFamily: FONT.sans }}
          >
            Sign out
          </button>
        </div>

        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] text-center mt-6 px-5 sm:col-span-2 sm:px-0">
          Mboa Trust v1.0.0 · Yaoundé / Brussels / Toronto
        </div>
      </div>
    </AppShell>
  )
}

// ── Help / Walkthrough ────────────────────────────────────────────────────────
const SLIDES = [
  {
    icon: '🔒',
    title: 'Your money is always protected',
    body: 'When you fund a project or hire a contractor, your money goes into a secure escrow account — not to the recipient. It stays there until work is independently verified.',
    color: C.forest,
  },
  {
    icon: '📸',
    title: 'Proof before payment',
    body: "Recipients and contractors submit photo, video, and GPS evidence for each milestone. Our on-ground verifiers check the evidence at the project site before anyone can approve a release.",
    color: C.steel,
  },
  {
    icon: '✅',
    title: 'You approve, then funds release',
    body: "Once a milestone is verified, you review the evidence and decide. If you approve, the milestone payment is released from escrow. If something is wrong, you raise a dispute — and funds stay frozen.",
    color: C.moss,
  },
  {
    icon: '🏗️',
    title: 'Find verified contractors',
    body: 'Every contractor on the platform has been ID-verified and reviewed. Post a job, receive bids, compare prices and ratings, and award the contract — all in one place.',
    color: '#3D2D0F',
  },
  {
    icon: '🏡',
    title: 'Safe land investment',
    body: 'Browse land listings with verified ownership documents, dispute-free certificates, and site inspection reports. No funds move until documents are confirmed clean.',
    color: '#1A3050',
  },
]

export function HelpScreen() {
  const nav = useNavigate()
  const [slide, setSlide] = useState(0)
  const s = SLIDES[slide]

  return (
    <AppShell noNav>
      <div className="flex flex-col h-full">
        <Header
          title="How it works"
          back
          action={<button onClick={() => nav('/home')} style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">Skip</button>}
        />

        {/* Slide */}
        <div className="flex-1 flex flex-col px-6 py-8 sm:mx-auto sm:max-w-xl sm:justify-center" style={{ background: s.color }}>
          <div className="flex justify-center mb-10">
            <div className="text-6xl">{s.icon}</div>
          </div>
          <h2 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold text-white text-center mb-4 leading-tight">
            {s.title}
          </h2>
          <p style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.75)' }} className="text-sm text-center leading-relaxed">
            {s.body}
          </p>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-10">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} className="w-2 h-2 rounded-full transition-all" style={{ background: i === slide ? C.amber : 'rgba(255,255,255,0.3)' }} />
            ))}
          </div>
        </div>

        {/* Nav */}
        <div className="px-6 py-6 border-t flex gap-3 sm:mx-auto sm:max-w-xl sm:w-full" style={{ background: C.white, borderColor: C.parchmentDark }}>
          {slide > 0 ? (
            <button
              onClick={() => setSlide((s) => s - 1)}
              className="flex-1 py-3 rounded-xl border font-semibold text-sm"
              style={{ borderColor: C.parchmentDark, color: C.ink, fontFamily: FONT.sans }}
            >
              Previous
            </button>
          ) : <div className="flex-1" />}
          <button
            onClick={() => slide < SLIDES.length - 1 ? setSlide((s) => s + 1) : nav('/home')}
            className="flex-1 py-3 rounded-xl font-semibold text-sm"
            style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}
          >
            {slide < SLIDES.length - 1 ? 'Next' : "I'm ready"}
          </button>
        </div>
      </div>
    </AppShell>
  )
}

// ── Menu hub (role-aware) ──────────────────────────────────────────────────────
// The 5th primary nav slot. Leads with identity (who you are, at a glance),
// then groups everything else by how often it's actually used: your own
// stats first, communication next (previously invisible — no nav entry at
// all), community and tools after that, and the platform-administration
// tier last, set apart rather than mixed into personal settings.
export function ProfileScreen() {
  const nav = useNavigate()
  const { name, role, projects, jobs, landListings, contractors, unreadNotifications } = useApp()
  const { myKyc } = useCompliance()
  const kycLabel: Record<typeof myKyc.status, string> = { unverified: 'Not verified', pending: 'Under review', verified: 'Verified ✓', rejected: 'Rejected — action needed' }

  const roleLabel: Record<string, string> = {
    funder: 'Diaspora Funder',
    recipient: 'Project Recipient',
    contractor: 'Local Contractor',
    seller: 'Land Seller',
  }

  const roleStats: Record<string, { label: string; value: string }[]> = {
    funder: [
      { label: 'Projects funded', value: String(projects.length) },
      { label: 'Active', value: String(projects.filter((p) => p.status === 'active').length) },
      { label: 'Since', value: '2024' },
    ],
    recipient: [
      { label: 'Projects', value: String(projects.length) },
      { label: 'Rating', value: `${projects[0]?.recipientRating.toFixed(1) ?? '—'}★` },
      { label: 'Since', value: '2024' },
    ],
    contractor: [
      { label: 'Jobs done', value: String(contractors[0]?.jobs ?? 0) },
      { label: 'Rating', value: `${contractors[0]?.rating.toFixed(1) ?? '—'}★` },
      { label: 'Open jobs', value: String(jobs.length) },
    ],
    seller: [
      { label: 'Listings', value: String(landListings.length) },
      { label: 'Verified', value: String(landListings.filter((l) => l.verified).length) },
      { label: 'Since', value: '2024' },
    ],
  }

  const roleProfileLink: Record<string, { label: string; sub: string; path: string }> = {
    funder: { label: 'Transaction history', sub: 'Every deposit, release and refund', path: '/funder/transactions' },
    recipient: { label: 'My reputation', sub: 'Ratings from funders you\'ve worked with', path: '/recipient/reputation' },
    contractor: { label: 'Contractor profile', sub: 'Certifications, availability & rate card', path: '/contractor/profile' },
    seller: { label: 'My listings', sub: 'Manage everything you have for sale', path: '/land/my-listings' },
  }

  const key = role ?? 'funder'
  const notifBadge = unreadNotifications > 0
    ? <span className="rounded-full px-2 py-0.5 text-[10px] font-bold flex-shrink-0" style={{ background: C.seal, color: '#fff', fontFamily: FONT.mono }}>{unreadNotifications}</span>
    : undefined

  return (
    <AppShell>
      <Header title="Menu" back tone="dark" background={C.forest}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.2)', fontFamily: FONT.serif }}>
            {name ? name[0] : 'M'}
          </div>
          <div style={{ fontFamily: FONT.serif }} className="text-xl font-bold text-white">{name || 'Marie-Claire N.'}</div>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-xs uppercase tracking-wider mt-1">{roleLabel[key]}</div>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: C.amber }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 4L3 6L7 2" stroke={C.forestDark} strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.7)' }} className="text-xs">ID verified</span>
          </div>
        </div>
      </Header>

      <div className="px-5 py-6 space-y-7 sm:mx-auto sm:max-w-3xl">
        <div className="grid grid-cols-3 gap-3">
          {roleStats[key].map(({ label, value }) => (
            <Card key={label} variant="glass">
              <div className="p-3 text-center">
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">{value}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            </Card>
          ))}
        </div>

        <GroupedLinks
          title="Your account"
          items={[
            { label: roleProfileLink[key].label, sub: roleProfileLink[key].sub, action: () => nav(roleProfileLink[key].path) },
            { label: 'ID verification (KYC/AML)', sub: kycLabel[myKyc.status], action: () => nav('/compliance/kyc') },
            { label: 'Switch role', sub: 'Change or add a primary role', action: () => nav('/role') },
          ]}
        />

        <GroupedLinks
          title="Communication"
          items={[
            { label: 'Messages', sub: 'Chat with recipients, contractors & sellers', action: () => nav('/messages') },
            { label: 'Notifications', sub: unreadNotifications > 0 ? `${unreadNotifications} unread` : 'You\'re all caught up', action: () => nav('/shared/notifications'), right: notifBadge },
            { label: 'Activity log', sub: 'Full audit trail across your account', action: () => nav('/activity') },
          ]}
        />

        <GroupedLinks
          title="Community"
          items={[
            { label: 'Diaspora group dashboard', sub: 'Shared funding across your association', action: () => nav('/groups/dashboard') },
            { label: 'Group members', sub: 'View & invite members', action: () => nav('/groups/members') },
            { label: 'Refer a friend', sub: 'Earn rewards for invites', action: () => nav('/referrals') },
            { label: 'Public project showcase', sub: 'Browse completed projects — no login', action: () => nav('/showcase') },
          ]}
        />

        <GroupedLinks
          title="Financial tools"
          items={[
            ...(key === 'funder' ? [
              { label: 'Recurring contributions', sub: 'Manage scheduled automatic funding', action: () => nav('/funder/recurring') },
              { label: 'Project templates', sub: 'Reusable milestone breakdowns', action: () => nav('/funder/templates') },
              { label: 'Team & permissions', sub: 'Who can fund, approve, or view', action: () => nav('/workspace/team') },
            ] : []),
            { label: 'Currency converter', sub: 'Mock exchange rate & fee calculator', action: () => nav('/tools/currency-converter') },
          ]}
        />

        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Platform administration</div>
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs mb-2 leading-relaxed">Staff tooling for verifiers and platform admins — not part of your personal account.</p>
          <GroupedLinks
            title=""
            dashed
            items={[
              { label: 'Register as verifier', sub: 'Set up a verifier profile', action: () => nav('/verifier/register') },
              { label: 'Verifier dashboard', sub: 'Review verification tasks', action: () => nav('/verifier/dashboard') },
              { label: 'Admin panel', sub: 'Platform overview & management', action: () => nav('/admin') },
              { label: 'Dispute resolution', sub: 'Manage open disputes', action: () => nav('/admin/disputes') },
              { label: 'Fraud & dispute analytics', sub: 'Flagged patterns across the platform', action: () => nav('/admin/fraud-analytics') },
            ]}
          />
        </div>

        <GroupedLinks
          title="Preferences & support"
          items={[
            { label: 'Settings', sub: 'Appearance, security, linked accounts', action: () => nav('/shared/settings') },
            { label: 'How Mboa Trust works', sub: 'Walkthrough & FAQ', action: () => nav('/shared/help') },
          ]}
        />
      </div>
    </AppShell>
  )
}
