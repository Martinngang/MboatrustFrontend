import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { useMaterials } from '../materials'
import { useMyProjectsQuery, useMyFundedProjectsQuery } from '../api/projects'
import { useMyRoleTypesQuery } from '../api/session'
import { C, FONT, AppShell, Card, StatusBadge, ProgressBar, DashboardShell, DashboardHero, QuickActionsGrid } from '../components/MobileLayout'
import { DeferredReveal, Skeleton, SkeletonCard } from '../components/Skeleton'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { ChipGroup } from '../components/Chip'
import { EmptyState } from '../components/EmptyState'
import { WidgetGrid, type WidgetDef } from '../components/dashboard/WidgetGrid'
import { NeedsAttentionWidget, type AttentionItem } from '../components/dashboard/NeedsAttentionWidget'
import { RecentActivityWidget } from '../components/dashboard/RecentActivityWidget'
import { OnboardingChecklistWidget } from '../components/dashboard/OnboardingChecklistWidget'

// ── Home dashboard — routes to role-specific view ────────────────────────────
export function HomeScreen() {
  const { role, isLoggedIn } = useApp()
  const { myQuincaillerie, isLoadingMyQuincaillerie } = useMaterials()
  // A quincaillerie-only account (no real funder/recipient/contractor/
  // seller role — just Quincaillerie picked at onboarding) has no "home"
  // dashboard of its own among the four below; it must land on its own
  // page directly rather than falling through to the funder dashboard by
  // default, which is exactly the bug reported (picking Quincaillerie-only
  // silently showed a funder home screen with fake "funded projects" copy).
  // myQuincaillerie is a real network fetch now (see materials.tsx) — wait
  // for it before falling through to FunderHome, so a quincaillerie-only
  // account never flashes the wrong dashboard on the first render.
  //
  // myQuincaillerie alone isn't a complete signal, though: it's the
  // QuincaillerieProfile document, which only exists once someone has
  // submitted the registration form. An account whose quincaillerie role
  // was granted directly (e.g. an admin using the generic role-grant
  // instead of the profile-approval flow) has the role on User.roles with
  // no profile document at all — myQuincaillerie is then null, and this
  // used to fall through to FunderHome despite genuinely holding the role.
  // useMyRoleTypesQuery reads the raw roles (unlike `role`, which drops
  // quincaillerie entirely — see api/session.ts), so it catches that case;
  // QuincaillerieDashboardScreen already renders a "Get started" / register
  // prompt when there's no profile yet, so landing there with role-but-no-
  // profile is the correct, graceful outcome, not a dead end.
  const { data: myRoleTypes, isLoading: isLoadingRoleTypes } = useMyRoleTypesQuery(isLoggedIn && role === null)
  const hasQuincaillerieRole = myRoleTypes?.includes('quincaillerie') ?? false
  if (role === null && (isLoadingMyQuincaillerie || isLoadingRoleTypes)) return null
  if (role === null && (myQuincaillerie || hasQuincaillerieRole)) return <Navigate to="/quincaillerie/dashboard" replace />
  if (role === 'recipient') return <RecipientHome />
  if (role === 'contractor') return <ContractorHome />
  if (role === 'seller') return <SellerHome />
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

// ── Funder dashboard ──────────────────────────────────────────────────────────
function FunderHome() {
  const nav = useNavigate()
  const { name, devUserId } = useApp()
  // GET /projects with no filter is the public browse catalog (every
  // funder's projects, by design — see BrowseProjectsScreen). Home's own
  // totals/list need to be scoped to what THIS funder actually paid into,
  // which the backend can only answer via the funderId filter (matched
  // against Escrow.funderId, since a funder never owns the project they
  // fund) — without it, "Total funded" and "Active projects" here were
  // silently summing every funder's contributions across the platform.
  const { data: projects = [] } = useMyFundedProjectsQuery(devUserId ?? undefined)
  const active = projects.filter((p) => p.status === 'active')
  const totalFunded = projects.reduce((s, p) => s + p.raised, 0)
  const pendingMilestones = projects.flatMap((p) => p.milestones).filter((m) => m.status === 'under_review').length
  const [projectFilter, setProjectFilter] = useState('All')
  const visibleActive = projectFilter === 'Needs my attention'
    ? active.filter((p) => p.milestones.some((m) => m.status === 'under_review'))
    : active

  const attentionItems: AttentionItem[] = projects.flatMap((p) =>
    p.milestones.filter((m) => m.status === 'under_review').map((m): AttentionItem => ({
      icon: 'hourglass', label: `${m.title} — ${p.title}`, sub: `${fmt(m.amount)} awaiting your review`,
      onClick: () => nav(`/funder/review/${p.id}`),
    }))
  )
  const widgets: WidgetDef[] = [
    { id: 'attention', title: 'Needs your attention', render: () => <NeedsAttentionWidget items={attentionItems} /> },
    { id: 'activity', title: 'Recent activity', render: () => <RecentActivityWidget /> },
  ]

  return (
    <DeferredReveal skeleton={<DashboardSkeleton />}>
    <AppShell>
      <DashboardShell>
        <DashboardHero
          eyebrow="Welcome back"
          title={name || 'Marie-Claire N.'}
          subtitle="Track your funded projects, review milestones and keep every investment moving with confidence."
          stats={[
            { label: 'Total funded', value: fmt(totalFunded) },
            { label: 'Active projects', value: String(active.length) },
            { label: 'Pending reviews', value: String(pendingMilestones) },
          ]}
        />

        <div className="mt-6"><OnboardingChecklistWidget role="funder" /></div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div>
              <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">Quick actions</p>
              <QuickActionsGrid actions={[
                { icon: 'plus', label: 'Create project', path: '/funder/create' },
                { icon: 'search', label: 'Browse', path: '/funder/browse' },
                { icon: 'clipboard', label: 'Post job', path: '/funder/post-job' },
                { icon: 'barChart', label: 'Activity', path: '/funder/transactions' },
              ]} />
            </div>

            {pendingMilestones > 0 && (
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
                  <div style={{ fontFamily: FONT.sans, color: 'var(--status-warning-text)' }} className="text-sm font-semibold">{pendingMilestones} milestone{pendingMilestones > 1 ? 's' : ''} waiting for your review</div>
                  <div style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="mt-1 text-[10px] uppercase tracking-[0.25em]">Tap to review proof</div>
                </div>
              </button>
            )}

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">Active projects</p>
                <button onClick={() => nav('/funder/browse')} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold">See all</button>
              </div>
              <div className="mb-3">
                <ChipGroup options={['All', 'Needs my attention']} value={projectFilter} onChange={(v) => setProjectFilter(v as string)} />
              </div>
              <StaggerList className="space-y-3">
                {visibleActive.map((p) => {
                  const pct = Math.round((p.raised / p.totalAmount) * 100)
                  const milestone = p.milestones.find((m) => m.status !== 'released') ?? p.milestones[p.milestones.length - 1]
                  return (
                    <StaggerItem key={p.id}>
                      <Card variant="interactive" onClick={() => nav(`/funder/project/${p.id}`)}>
                        <div className="p-4">
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div style={{ fontFamily: FONT.serif }} className="text-sm font-bold">{p.title}</div>
                              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-0.5 text-[10px] uppercase tracking-[0.25em]">{p.location}</div>
                            </div>
                            {milestone && <StatusBadge status={milestone.status} />}
                          </div>
                          <ProgressBar pct={pct} />
                          <div className="mt-2 flex justify-between">
                            <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px]">{fmt(p.raised)} raised</span>
                            <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px]">{pct}%</span>
                          </div>
                          {milestone && <div className="mt-2 text-[10px]" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>Current: {milestone.title}</div>}
                        </div>
                      </Card>
                    </StaggerItem>
                  )
                })}
              </StaggerList>
            </div>
          </div>

          <div className="space-y-6">
            <button onClick={() => nav('/funder/browse')} className="relative flex h-40 w-full items-center overflow-hidden rounded-[24px]">
              <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&h=200&fit=crop&auto=format" alt="Community projects" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'rgba(15,27,20,0.7)' }} />
              <div className="relative px-5">
                <div style={{ fontFamily: FONT.mono, color: C.amber }} className="mb-1 text-[10px] uppercase tracking-[0.3em]">New</div>
                <div style={{ fontFamily: FONT.serif }} className="text-base font-bold text-white">Browse community projects</div>
                <div style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.72)' }} className="mt-1 text-sm">3 new projects added this week</div>
              </div>
            </button>

            <Card variant="glass">
              <div className="p-5">
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">Portfolio insight</div>
                <div style={{ fontFamily: FONT.serif }} className="mt-2 text-lg font-semibold">Balanced, verified, and ready to scale</div>
                <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-2 text-sm leading-relaxed">Every active project, milestone, and dispute in one place — verified before your money ever moves.</p>
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

// ── Recipient dashboard ────────────────────────────────────────────────────────
function RecipientHome() {
  const nav = useNavigate()
  const { name, devUserId } = useApp()
  const { data: projects = [] } = useMyProjectsQuery(devUserId ?? undefined)
  const project = projects[0]

  // A brand-new recipient account has no assigned project yet — every
  // computation below assumes one exists, so bail out to an empty state
  // rather than crashing on `project.milestones`.
  if (!project) {
    return (
      <DeferredReveal skeleton={<DashboardSkeleton />}>
        <AppShell>
          <DashboardShell>
            <DashboardHero
              eyebrow="Project recipient"
              title={name || 'Emmanuel N.'}
              background={`linear-gradient(135deg, ${C.forestDark} 0%, ${C.forest} 100%)`}
              stats={[
                { label: 'Funds received', value: fmt(0) },
                { label: 'Milestones done', value: '0 / 0' },
                { label: 'Active project', value: 'No' },
              ]}
            />
            <div className="mt-6"><OnboardingChecklistWidget role="recipient" /></div>
            <div className="mt-6">
              <EmptyState
                icon="clipboard"
                title="No projects yet"
                description="Once a funder assigns you a project, it'll show up here."
                illustration="tilt"
              />
            </div>
          </DashboardShell>
        </AppShell>
      </DeferredReveal>
    )
  }

  const nextMilestone = project.milestones.find((m) => m.status !== 'released')
  const received = project.milestones.filter((m) => m.status === 'released').reduce((s, m) => s + m.amount, 0)

  const attentionItems: AttentionItem[] = nextMilestone
    ? [{ icon: 'camera', label: `Submit proof for ${nextMilestone.title}`, sub: `${fmt(nextMilestone.amount)} released on approval`, onClick: () => nav('/recipient/submit') }]
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
          eyebrow="Project recipient"
          title={name || 'Emmanuel N.'}
          background={`linear-gradient(135deg, ${C.forestDark} 0%, ${C.forest} 100%)`}
          stats={[
            { label: 'Funds received', value: fmt(received) },
            { label: 'Milestones done', value: `${project.milestones.filter((m) => m.status === 'released').length} / ${project.milestones.length}` },
            { label: 'Active project', value: project.status === 'active' ? 'Yes' : 'No' },
          ]}
        />

        <div className="mt-6"><OnboardingChecklistWidget role="recipient" /></div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            {nextMilestone && (
              <div className="rounded-[24px] border-2 p-5" style={{ background: 'var(--status-success-bg)', borderColor: C.forestLight }}>
                <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] uppercase tracking-widest mb-2">Next milestone</div>
                <div style={{ fontFamily: FONT.serif }} className="font-bold text-base mb-1">{nextMilestone.title}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs mb-3">{fmt(nextMilestone.amount)} will be released upon approval</div>
                <button
                  onClick={() => nav('/recipient/submit')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm"
                  style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans, boxShadow: `0 8px 20px ${C.glowForest}` }}
                >
                  Submit milestone proof →
                </button>
              </div>
            )}

            <div>
              <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">Quick actions</p>
              <QuickActionsGrid actions={[
                { icon: 'camera', label: 'Submit proof', path: '/recipient/submit' },
                { icon: 'card', label: 'Withdraw', path: '/recipient/withdrawal' },
                { icon: 'clipboard', label: 'Status', path: '/recipient/submission-status' },
                { icon: 'star', label: 'Reputation', path: '/recipient/reputation' },
              ]} />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">My active project</p>
              <Card variant="interactive" onClick={() => nav(`/funder/project/${project.id}`)}>
                <img src={project.image} alt={project.title} className="w-full h-32 object-cover rounded-t-xl" />
                <div className="p-4">
                  <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm mb-1">{project.title}</div>
                  <ProgressBar pct={Math.round((project.raised / project.totalAmount) * 100)} />
                  <div className="flex justify-between mt-2">
                    <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px]">{fmt(project.raised)} raised</span>
                    <span style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] font-semibold">Active</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">Your dashboard</p>
          <WidgetGrid sectionKey="recipient-home" widgets={widgets} />
        </div>
      </DashboardShell>
    </AppShell>
    </DeferredReveal>
  )
}

// ── Contractor dashboard ───────────────────────────────────────────────────────
function ContractorHome() {
  const nav = useNavigate()
  const { name, jobs, bids, contractors, devUserId } = useApp()
  const featured = jobs[0]
  const pendingBids = bids.filter((b) => b.status === 'pending')
  // A brand-new contractor has no ContractorProfile document yet (created
  // lazily on first profile-setup save) — jobs/rating both read as 0/— in
  // that case rather than falling back to someone else's stats.
  const myProfile = contractors.find((c) => c.id === devUserId)

  const attentionItems: AttentionItem[] = pendingBids.length > 0
    ? pendingBids.map((b): AttentionItem => ({ icon: 'clipboard', label: `Bid pending — ${b.jobTitle}`, sub: fmt(b.price), onClick: () => nav('/contractor/bids') }))
    : featured
      ? [{ icon: 'search', label: `New tender matching your trade: ${featured.title}`, sub: `${fmt(featured.budget)} · ${featured.location}`, onClick: () => nav(`/contractor/job/${featured.id}`) }]
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
          title={name || 'Fon Ayuk Const.'}
          background={`linear-gradient(135deg, ${C.steel} 0%, #2A4E77 100%)`}
          action={
            <div className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs" style={{ background: 'rgba(255,255,255,0.14)' }}>
              <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: C.forest }}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.85)' }}>Verified contractor</span>
            </div>
          }
          stats={[
            { label: 'Active bids', value: String(pendingBids.length) },
            { label: 'Completed jobs', value: String(myProfile?.jobs ?? 0) },
            { label: 'Rating', value: myProfile ? myProfile.rating.toFixed(1) : '—' },
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
                <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">New job matching your trade</p>
                <Card variant="interactive" onClick={() => nav(`/contractor/job/${featured.id}`)}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{featured.title}</div>
                      <span style={{ fontFamily: FONT.mono, color: 'var(--status-info-text)', background: 'var(--status-info-bg)' }} className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
                        {featured.bids} bids
                      </span>
                    </div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-3">{featured.location}</div>
                    <div className="flex items-center justify-between">
                      <div style={{ fontFamily: FONT.serif }} className="text-base font-bold">{fmt(featured.budget)}</div>
                      <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px]">Due {featured.deadline}</span>
                    </div>
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
function SellerHome() {
  const nav = useNavigate()
  const { name, landListings, offers, devUserId } = useApp()
  const mine = landListings.filter((l) => l.sellerId && l.sellerId === devUserId)
  const pendingOffers = offers.filter((o) => o.status === 'pending' && mine.some((l) => l.id === o.listingId))
  const unverified = mine.find((l) => !l.verified)

  const attentionItems: AttentionItem[] = pendingOffers.length > 0
    ? pendingOffers.map((o): AttentionItem => ({ icon: 'handshake', label: `New offer: ${fmt(o.amount)}`, sub: o.message || 'Awaiting your response', onClick: () => nav(`/land/listing/${o.listingId}`) }))
    : unverified
      ? [{ icon: 'clock', label: `Verification pending — ${unverified.title}`, sub: unverified.titleType, onClick: () => nav(`/land/listing/${unverified.id}`) }]
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
          title={name || 'Christophe Essama'}
          background={`linear-gradient(135deg, ${C.moss} 0%, ${C.forest} 100%)`}
          stats={[
            { label: 'Active listings', value: String(mine.length) },
            { label: 'Verified listings', value: String(mine.filter((l) => l.verified).length) },
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
