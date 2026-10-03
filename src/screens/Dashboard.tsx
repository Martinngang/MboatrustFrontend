import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { useDashboardQuery, formatRating } from '../api/dashboard'
import { useMyLandListingsQuery } from '../api/land'
import { useMaterials } from '../materials'
import { useVerification } from '../verification'
import { C, FONT, AppShell, Card, StatusBadge, ProgressBar, DashboardShell, DashboardHero, QuickActionsGrid } from '../components/MobileLayout'
import { DeferredReveal, Skeleton, SkeletonCard } from '../components/Skeleton'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { ChipGroup } from '../components/Chip'
import { WidgetGrid, type WidgetDef } from '../components/dashboard/WidgetGrid'
import { NeedsAttentionWidget, type AttentionItem } from '../components/dashboard/NeedsAttentionWidget'
import { RecentActivityWidget } from '../components/dashboard/RecentActivityWidget'
import { OnboardingChecklistWidget } from '../components/dashboard/OnboardingChecklistWidget'

// ── Home dashboard — routes to role-specific view ────────────────────────────
export function HomeScreen() {
  const { role } = useApp()
  const { mySupplier } = useMaterials()
  const { verifierProfile } = useVerification()
  // Supplier has no inline "home" dashboard of its own among the three
  // below — it lands directly on its own dashboard screen, which already
  // renders a "Get started" / register prompt for an approved-role account
  // with no profile submitted yet, so this is a graceful outcome either way.
  if (role === 'supplier') return <Navigate to="/supplier/dashboard" replace />
  if (role === 'contractor') return <ContractorHome />
  if (role === 'seller') return <SellerHome />
  // `role` is null both for a genuinely fresh account AND for a Supplier or
  // Verifier applicant awaiting admin approval (see api/session.ts —
  // mapBackendRoles only returns a value once the backend has actually
  // granted the roleType, which happens on approval, not on application).
  // Falling straight through to FunderHome here used to attach every
  // approval-pending Supplier/Verifier account to the funder identity even
  // though they never chose it and nothing was ever granted — this is the
  // fix: check for a real pending (or rejected) application first and route
  // to that role's own dashboard, which already renders the correct
  // pending/rejected state, before ever defaulting to Funder.
  if (role === null) {
    if (mySupplier) return <Navigate to="/supplier/dashboard" replace />
    if (verifierProfile) return <Navigate to="/verifier/dashboard" replace />
  }
  return <FunderHome />
}

// Deliberate ~350ms polish beat on the highest-traffic screen in the app —
// shown regardless of how fast the real data actually loads, so the
// dashboard entrance always feels the same beat across all 4 role homes.
function DashboardSkeleton() {
  return (
    <AppShell>
      <DashboardShell>
        <Skeleton variant="block" height={220} className="mb-6" />
        <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="card" height={90} />)}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </DashboardShell>
    </AppShell>
  )
}

/** Renders "—" until the real number arrives, never a misleading 0. */
function statValue<T>(data: T | undefined, pick: (d: T) => string): string {
  return data ? pick(data) : '—'
}

// ── Funder dashboard ──────────────────────────────────────────────────────────
// Every figure comes from GET /dashboard/funder (backend
// dashboardStatsService.funder), computed for the signed-in user only:
// - Total funded: this funder's OWN completed payments into escrow. It used
//   to sum each funded project's platform-wide `raised`, and it only ever
//   looked at retired 'funding' projects — so every real funder (who funds
//   tenders) saw XAF 0.
// - Active projects: projects they paid into or own, funded/in progress.
// - Pending reviews: milestones awaiting THIS user's decision as owner or
//   co-signer — not every under-review milestone on anything they paid into.
function FunderHome() {
  const nav = useNavigate()
  const { name } = useApp()
  const { data } = useDashboardQuery('funder')
  const pendingReviews = data?.stats.pendingReviews ?? 0
  const [projectFilter, setProjectFilter] = useState('All')
  const activeProjects = data?.activeProjects ?? []
  const visibleActive = projectFilter === 'Needs my attention' ? activeProjects.filter((p) => p.needsMyReview) : activeProjects

  const attentionItems: AttentionItem[] = (data?.pendingReviews ?? []).map((m): AttentionItem => ({
    icon: 'hourglass', label: `${m.milestoneTitle} — ${m.projectTitle}`, sub: `${fmt(m.amount)} awaiting your review`,
    onClick: () => nav(`/funder/review/${m.projectId}`),
  }))
  const widgets: WidgetDef[] = [
    { id: 'attention', title: 'Needs your attention', render: () => <NeedsAttentionWidget items={attentionItems} /> },
    { id: 'activity', title: 'Recent activity', render: () => <RecentActivityWidget /> },
  ]
  const newProjects = data?.newBrowsableProjectsThisWeek ?? 0

  return (
    <DeferredReveal skeleton={<DashboardSkeleton />}>
    <AppShell>
      <DashboardShell>
        <DashboardHero
          eyebrow="Welcome back"
          title={name || 'Welcome'}
          subtitle="Track your funded projects, review milestones and keep every investment moving with confidence."
          stats={[
            { label: 'Total funded', value: statValue(data, (d) => fmt(d.stats.totalFunded)) },
            { label: 'Active projects', value: statValue(data, (d) => String(d.stats.activeProjects)) },
            { label: 'Pending reviews', value: statValue(data, (d) => String(d.stats.pendingReviews)) },
          ]}
        />

        <div className="mt-6"><OnboardingChecklistWidget role="funder" /></div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div>
              <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">Quick actions</p>
              <QuickActionsGrid actions={[
                { icon: 'search', label: 'Browse', path: '/funder/browse' },
                { icon: 'clipboard', label: 'Post job', path: '/funder/post-job' },
                { icon: 'barChart', label: 'Activity', path: '/funder/transactions' },
              ]} />
            </div>

            {pendingReviews > 0 && (
              <button
                onClick={() => nav('/funder/review')}
                className="flex w-full items-center gap-4 rounded-[24px] border p-4 text-left"
                style={{ background: 'var(--status-warning-bg)', borderColor: 'var(--status-warning-text)', boxShadow: C.shadowSm }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: C.amber }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2L16 13H2L9 2Z" stroke={C.forestDark} strokeWidth="1.4" strokeLinejoin="round" />
                    <line x1="9" y1="8" x2="9" y2="11" stroke={C.forestDark} strokeWidth="1.3" strokeLinecap="round" />
                    <circle cx="9" cy="13" r="0.8" fill={C.forestDark} />
                  </svg>
                </div>
                <div className="flex-1">
                  <div style={{ fontFamily: FONT.sans, color: 'var(--status-warning-text)' }} className="text-sm font-semibold">{pendingReviews} milestone{pendingReviews > 1 ? 's' : ''} waiting for your review</div>
                  <div style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="mt-1 text-[10px] uppercase tracking-[0.25em]">Tap to review proof</div>
                </div>
              </button>
            )}

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">Active projects</p>
                <button onClick={() => nav('/workspace/jobs')} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold">See all</button>
              </div>
              <div className="mb-3">
                <ChipGroup options={['All', 'Needs my attention']} value={projectFilter} onChange={(v) => setProjectFilter(v as string)} />
              </div>
              {data && visibleActive.length === 0 ? (
                <Card>
                  <div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>
                    {projectFilter === 'Needs my attention' ? "You're all caught up — nothing is waiting on your review." : 'No active projects yet. Fund a tender to see it here.'}
                  </div>
                </Card>
              ) : (
                <StaggerList className="space-y-3">
                  {visibleActive.map((p) => {
                    const pct = p.totalAmount > 0 ? Math.min(100, Math.round((p.raised / p.totalAmount) * 100)) : 0
                    return (
                      <StaggerItem key={p.id}>
                        <Card variant="interactive" onClick={() => nav(`/funder/project/${p.id}`)}>
                          <div className="p-4">
                            <div className="mb-3 flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div style={{ fontFamily: FONT.serif }} className="text-sm font-bold">{p.title}</div>
                                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-0.5 text-[10px] uppercase tracking-[0.25em]">{p.location}</div>
                              </div>
                              {p.currentMilestone && <StatusBadge status={p.currentMilestone.status} />}
                            </div>
                            <ProgressBar pct={pct} />
                            <div className="mt-2 flex justify-between">
                              <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px]">{fmt(p.fundedAmount ?? p.raised)} funded · {fmt(p.unfundedAmount ?? 0)} to fund</span>
                              <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px]">{pct}%</span>
                            </div>
                            {p.currentMilestone && <div className="mt-2 text-[10px]" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>Current: {p.currentMilestone.title}</div>}
                          </div>
                        </Card>
                      </StaggerItem>
                    )
                  })}
                </StaggerList>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <button onClick={() => nav('/funder/browse')} className="relative flex h-40 w-full items-center overflow-hidden rounded-[24px]">
              <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&h=200&fit=crop&auto=format" alt="Community projects" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'rgba(15,27,20,0.7)' }} />
              <div className="relative px-5">
                {newProjects > 0 && <div style={{ fontFamily: FONT.mono, color: C.amber }} className="mb-1 text-[10px] uppercase tracking-[0.3em]">New</div>}
                <div style={{ fontFamily: FONT.serif }} className="text-base font-bold text-white">Browse community projects</div>
                <div style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.72)' }} className="mt-1 text-sm">
                  {newProjects > 0 ? `${newProjects} new project${newProjects === 1 ? '' : 's'} added this week` : 'Explore verified projects across Cameroon'}
                </div>
              </div>
            </button>

            <Card variant="glass">
              <div className="p-5">
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">How your money moves</div>
                <div style={{ fontFamily: FONT.serif }} className="mt-2 text-lg font-semibold">Verified before it's released</div>
                <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-2 text-sm leading-relaxed">Every milestone payout waits in escrow until you approve the contractor's proof — nothing is released without your decision.</p>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-6">
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">Your dashboard</p>
          <WidgetGrid sectionKey="funder-home" widgets={widgets} />
        </div>
      </DashboardShell>
    </AppShell>
    </DeferredReveal>
  )
}

// ── Contractor dashboard ───────────────────────────────────────────────────────
// Same four tiles as mobile, from GET /dashboard/contractor. The "Verified
// contractor" badge used to be hardcoded onto every contractor; it now only
// shows once the account's KYC is actually verified. "Matching your trade"
// is only claimed when the tender really matches one of their categories.
function ContractorHome() {
  const nav = useNavigate()
  const { name } = useApp()
  const { data } = useDashboardQuery('contractor')
  const featured = data?.featuredTender ?? null
  const openBids = data?.openBids ?? []

  const attentionItems: AttentionItem[] = openBids.length > 0
    ? openBids.map((b): AttentionItem => ({
        icon: 'clipboard',
        label: b.awaitingMyResponse ? `Counter-offer to respond to — ${b.projectTitle}` : `Bid pending — ${b.projectTitle}`,
        sub: fmt(b.price),
        onClick: () => nav('/contractor/bids'),
      }))
    : featured
      ? [{ icon: 'search', label: `${featured.matchesTrade ? 'New tender matching your trade' : 'Latest open tender'}: ${featured.title}`, sub: `${fmt(featured.budget)} · ${featured.location}`, onClick: () => nav(`/contractor/job/${featured.id}`) }]
      : []
  const widgets: WidgetDef[] = [
    { id: 'attention', title: 'Needs your attention', render: () => <NeedsAttentionWidget items={attentionItems} /> },
    { id: 'activity', title: 'Recent activity', render: () => <RecentActivityWidget /> },
  ]

  return (
    <DeferredReveal skeleton={<DashboardSkeleton />}>
    <AppShell>
      <DashboardShell>
        <DashboardHero
          eyebrow="Contractor"
          title={name || 'Welcome'}
          background={`linear-gradient(135deg, ${C.steel} 0%, #2A4E77 100%)`}
          action={data?.isKycVerified ? (
            <div className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs" style={{ background: 'rgba(255,255,255,0.14)' }}>
              <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: C.forest }}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.85)' }}>Verified contractor</span>
            </div>
          ) : undefined}
          stats={[
            { label: 'Active bids', value: statValue(data, (d) => String(d.stats.activeBids)) },
            { label: 'Completed jobs', value: statValue(data, (d) => String(d.stats.completedJobs)) },
            { label: 'Rating', value: statValue(data, (d) => formatRating(d.stats.rating, d.stats.ratingCount)) },
            { label: 'Available payout', value: statValue(data, (d) => fmt(d.stats.availablePayout)) },
          ]}
        />

        <div className="mt-6"><OnboardingChecklistWidget role="contractor" /></div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div>
              <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">Quick actions</p>
              <QuickActionsGrid actions={[
                { icon: 'search', label: 'Browse open jobs', path: '/contractor/jobs' },
                { icon: 'clipboard', label: 'My bids', path: '/contractor/bids' },
                { icon: 'wallet', label: 'Earnings', path: '/contractor/earnings' },
                { icon: 'user', label: 'Profile', path: '/contractor/profile' },
              ]} />
            </div>
          </div>

          <div className="space-y-6">
            {featured && (
              <div>
                <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">
                  {featured.matchesTrade ? 'New job matching your trade' : 'Latest open tender'}
                </p>
                <Card variant="interactive" onClick={() => nav(`/contractor/job/${featured.id}`)}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{featured.title}</div>
                      <span style={{ fontFamily: FONT.mono, color: 'var(--status-info-text)', background: 'var(--status-info-bg)' }} className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
                        {featured.bidCount} bid{featured.bidCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-3">{featured.location}</div>
                    <div style={{ fontFamily: FONT.serif }} className="text-base font-bold">{fmt(featured.budget)}</div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">Your dashboard</p>
          <WidgetGrid sectionKey="contractor-home" widgets={widgets} />
        </div>
      </DashboardShell>
    </AppShell>
    </DeferredReveal>
  )
}

// ── Seller dashboard ────────────────────────────────────────────────────────────
// Tiles from GET /dashboard/seller; the "My listings" list from a
// server-side sellerId filter. Both used to be derived from the platform's
// newest page of listings (every seller's), filtered client-side.
function SellerHome() {
  const nav = useNavigate()
  const { name, devUserId } = useApp()
  const { data } = useDashboardQuery('seller')
  const { data: mine = [] } = useMyLandListingsQuery(devUserId)
  const pendingOffers = data?.pendingOffers ?? []
  const unverified = data?.firstUnverifiedListing ?? null

  const attentionItems: AttentionItem[] = pendingOffers.length > 0
    ? pendingOffers.map((o): AttentionItem => ({ icon: 'handshake', label: `New offer: ${fmt(o.amount)} — ${o.listingTitle}`, sub: o.message || 'Awaiting your response', onClick: () => nav(`/land/listing/${o.listingId}`) }))
    : unverified
      ? [{ icon: 'clock', label: `Verification pending — ${unverified.title}`, sub: unverified.titleType || unverified.verificationStatus, onClick: () => nav(`/land/listing/${unverified.id}`) }]
      : []
  const widgets: WidgetDef[] = [
    { id: 'attention', title: 'Needs your attention', render: () => <NeedsAttentionWidget items={attentionItems} /> },
    { id: 'activity', title: 'Recent activity', render: () => <RecentActivityWidget /> },
  ]

  return (
    <DeferredReveal skeleton={<DashboardSkeleton />}>
    <AppShell>
      <DashboardShell>
        <DashboardHero
          eyebrow="Land seller"
          title={name || 'Welcome'}
          background={`linear-gradient(135deg, ${C.moss} 0%, ${C.forest} 100%)`}
          stats={[
            { label: 'Listings', value: statValue(data, (d) => String(d.stats.listings)) },
            { label: 'Verified', value: statValue(data, (d) => String(d.stats.verifiedListings)) },
            { label: 'Pending offers', value: statValue(data, (d) => String(d.stats.pendingOffers)) },
          ]}
        />

        <div className="mt-6"><OnboardingChecklistWidget role="seller" /></div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div>
              <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">Quick actions</p>
              <QuickActionsGrid actions={[
                { icon: 'home', label: 'Browse all land', path: '/land/browse' },
                { icon: 'plus', label: 'Create listing', path: '/land/create' },
                { icon: 'clipboard', label: 'My listings', path: '/land/my-listings' },
              ]} />
            </div>
          </div>

          <div className="space-y-6">
            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">My listings</p>
            <StaggerList className="space-y-3">
              {mine.map((l) => (
                <StaggerItem key={l.id}>
                  <Card variant="interactive" onClick={() => nav(`/land/listing/${l.id}`)}>
                    <div className="flex gap-3 p-4">
                      <img src={l.image} alt={l.title} className="w-20 h-16 object-cover rounded-lg flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: FONT.serif, color: C.ink }} className="font-bold text-sm leading-tight mb-1">{l.title}</div>
                        <div style={{ fontFamily: FONT.serif, color: C.forest }} className="font-bold text-sm">{fmt(l.price)}</div>
                      </div>
                      <StatusBadge status={l.verified ? 'verified' : 'unverified'} />
                    </div>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerList>
          </div>
        </div>

        <div className="mt-6">
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">Your dashboard</p>
          <WidgetGrid sectionKey="seller-home" widgets={widgets} />
        </div>
      </DashboardShell>
    </AppShell>
    </DeferredReveal>
  )
}
