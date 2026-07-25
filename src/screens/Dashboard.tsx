import { useNavigate } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { C, FONT, AppShell, Card, StatusBadge, ProgressBar, DashboardShell, DashboardHero, QuickActionsGrid } from '../components/MobileLayout'

// ── Home dashboard — routes to role-specific view ────────────────────────────
export function HomeScreen() {
  const { role } = useApp()
  if (role === 'recipient') return <RecipientHome />
  if (role === 'contractor') return <ContractorHome />
  if (role === 'seller') return <SellerHome />
  return <FunderHome />
}

// ── Funder dashboard ──────────────────────────────────────────────────────────
function FunderHome() {
  const nav = useNavigate()
  const { name, projects } = useApp()
  const active = projects.filter((p) => p.status === 'active')
  const totalFunded = projects.reduce((s, p) => s + p.raised, 0)
  const pendingMilestones = projects.flatMap((p) => p.milestones).filter((m) => m.status === 'under_review').length

  return (
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
          action={
            <button onClick={() => nav('/shared/notifications')} className="flex w-fit items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2C6 2 4 4.5 4 7V11L2 13H16L14 11V7C14 4.5 12 2 9 2Z" stroke="white" strokeWidth="1.3" />
                <path d="M7 13C7 14.1 7.9 15 9 15C10.1 15 11 14.1 11 13" stroke="white" strokeWidth="1.3" />
              </svg>
              Notifications
              {pendingMilestones > 0 && <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: C.amber, color: C.forestDark }}>{pendingMilestones}</span>}
            </button>
          }
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div>
              <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">Quick actions</p>
              <QuickActionsGrid actions={[
                { icon: '➕', label: 'Create project', path: '/funder/create' },
                { icon: '🔍', label: 'Browse', path: '/funder/browse' },
                { icon: '📋', label: 'Post job', path: '/funder/post-job' },
                { icon: '📊', label: 'Activity', path: '/funder/transactions' },
              ]} />
            </div>

            {pendingMilestones > 0 && (
              <button onClick={() => nav('/funder/review')} className="flex w-full items-center gap-4 rounded-[24px] border border-[#f3d793] bg-[#fff7e6] p-4 text-left shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: C.amber }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2L16 13H2L9 2Z" stroke={C.forestDark} strokeWidth="1.4" strokeLinejoin="round" />
                    <line x1="9" y1="8" x2="9" y2="11" stroke={C.forestDark} strokeWidth="1.3" strokeLinecap="round" />
                    <circle cx="9" cy="13" r="0.8" fill={C.forestDark} />
                  </svg>
                </div>
                <div className="flex-1">
                  <div style={{ fontFamily: FONT.sans, color: C.forestDark }} className="text-sm font-semibold">{pendingMilestones} milestone{pendingMilestones > 1 ? 's' : ''} waiting for your review</div>
                  <div style={{ fontFamily: FONT.mono, color: '#92400E' }} className="mt-1 text-[10px] uppercase tracking-[0.25em]">Tap to review proof</div>
                </div>
              </button>
            )}

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">Active projects</p>
                <button onClick={() => nav('/funder/browse')} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold">See all</button>
              </div>
              <div className="space-y-3">
                {active.map((p) => {
                  const pct = Math.round((p.raised / p.totalAmount) * 100)
                  const milestone = p.milestones.find((m) => m.status !== 'released') ?? p.milestones[p.milestones.length - 1]
                  return (
                    <Card key={p.id} onClick={() => nav(`/funder/project/${p.id}`)}>
                      <div className="p-4">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div style={{ fontFamily: FONT.serif }} className="text-sm font-bold">{p.title}</div>
                            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-0.5 text-[10px] uppercase tracking-[0.25em]">{p.location}</div>
                          </div>
                          <StatusBadge status={milestone.status} />
                        </div>
                        <ProgressBar pct={pct} />
                        <div className="mt-2 flex justify-between">
                          <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px]">{fmt(p.raised)} raised</span>
                          <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px]">{pct}%</span>
                        </div>
                        <div className="mt-2 text-[10px]" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>Current: {milestone.title}</div>
                      </div>
                    </Card>
                  )
                })}
              </div>
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

            <Card>
              <div className="p-5">
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">Portfolio insight</div>
                <div style={{ fontFamily: FONT.serif }} className="mt-2 text-lg font-semibold">Balanced, verified, and ready to scale</div>
                <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-2 text-sm leading-relaxed">Your dashboard is now tuned for bigger screens with a richer information hierarchy and more breathing room.</p>
              </div>
            </Card>
          </div>
        </div>
      </DashboardShell>
    </AppShell>
  )
}

// ── Recipient dashboard ────────────────────────────────────────────────────────
function RecipientHome() {
  const nav = useNavigate()
  const { name, projects } = useApp()
  const project = projects[0]
  const nextMilestone = project.milestones.find((m) => m.status !== 'released')
  const received = project.milestones.filter((m) => m.status === 'released').reduce((s, m) => s + m.amount, 0)

  return (
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            {nextMilestone && (
              <div className="rounded-[24px] border-2 p-5" style={{ background: '#F0FDF4', borderColor: '#86EFAC' }}>
                <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] uppercase tracking-widest mb-2">Next milestone</div>
                <div style={{ fontFamily: FONT.serif }} className="font-bold text-base mb-1">{nextMilestone.title}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs mb-3">{fmt(nextMilestone.amount)} will be released upon approval</div>
                <button
                  onClick={() => nav('/recipient/submit')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm"
                  style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}
                >
                  Submit milestone proof →
                </button>
              </div>
            )}

            <div>
              <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">Quick actions</p>
              <QuickActionsGrid actions={[
                { icon: '📸', label: 'Submit proof', path: '/recipient/submit' },
                { icon: '💳', label: 'Withdraw', path: '/recipient/withdrawal' },
                { icon: '📋', label: 'Status', path: '/recipient/submission-status' },
                { icon: '⭐', label: 'Reputation', path: '/recipient/reputation' },
              ]} />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">My active project</p>
              <Card onClick={() => nav(`/funder/project/${project.id}`)}>
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
      </DashboardShell>
    </AppShell>
  )
}

// ── Contractor dashboard ───────────────────────────────────────────────────────
function ContractorHome() {
  const nav = useNavigate()
  const { name, jobs } = useApp()
  const featured = jobs[0]

  return (
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
            { label: 'Active bids', value: '3' },
            { label: 'Completed jobs', value: '34' },
            { label: 'Rating', value: '4.9 ★' },
          ]}
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div>
              <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">Quick actions</p>
              <QuickActionsGrid actions={[
                { icon: '🔍', label: 'Browse open jobs', path: '/contractor/jobs' },
                { icon: '📋', label: 'My bids', path: '/contractor/bids' },
                { icon: '📝', label: 'Active contract', path: '/contractor/contract' },
                { icon: '💰', label: 'Earnings', path: '/contractor/earnings' },
                { icon: '👤', label: 'Profile', path: '/contractor/profile' },
                { icon: '📄', label: 'Contract doc', path: '/funder/contract-summary' },
              ]} />
            </div>
          </div>

          <div className="space-y-6">
            {featured && (
              <div>
                <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">New job matching your trade</p>
                <Card onClick={() => nav(`/contractor/job/${featured.id}`)}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{featured.title}</div>
                      <span style={{ fontFamily: FONT.mono, color: C.forest, background: '#E8F5EE' }} className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
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
      </DashboardShell>
    </AppShell>
  )
}

// ── Seller dashboard ────────────────────────────────────────────────────────────
function SellerHome() {
  const nav = useNavigate()
  const { name, landListings } = useApp()
  const mine = landListings.slice(0, 2)

  return (
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div>
              <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-[0.3em]">Quick actions</p>
              <QuickActionsGrid actions={[
                { icon: '🏡', label: 'Browse all land', path: '/land/browse' },
                { icon: '➕', label: 'Create listing', path: '/land/create' },
                { icon: '📋', label: 'My listings', path: '/land/my-listings' },
                { icon: '🔍', label: 'Schedule visit', path: '/land/schedule' },
              ]} />
            </div>
          </div>

          <div className="space-y-6">
            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">My listings</p>
            <div className="space-y-3">
              {mine.map((l) => (
                <Card key={l.id} onClick={() => nav(`/land/listing/${l.id}`)}>
                  <div className="flex gap-3 p-4">
                    <img src={l.image} alt={l.title} className="w-20 h-16 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div style={{ fontFamily: FONT.serif, color: C.ink }} className="font-bold text-sm leading-tight mb-1">{l.title}</div>
                      <div style={{ fontFamily: FONT.serif, color: C.forest }} className="font-bold text-sm">{fmt(l.price)}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DashboardShell>
    </AppShell>
  )
}
