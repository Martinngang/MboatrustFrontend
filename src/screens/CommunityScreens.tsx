import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { useFunding } from '../funding'
import { useCommunity, REFERRAL_REWARD_XAF, type ReferralStatus } from '../community'
import { C, FONT, AppShell, Header, Card, PillButton, StatusBadge, ThemeToggle } from '../components/MobileLayout'
import { ContactPicker, type PickedContact } from '../components/ContactPicker'
import { BeforeAfterComparison } from '../components/BeforeAfterComparison'
import { InstallButton } from '../components/InstallButton'

// ── Diaspora group: organization profile setup ────────────────────────────────
export function GroupSetupScreen() {
  const nav = useNavigate()
  const { createGroup } = useCommunity()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [region, setRegion] = useState('')

  const canCreate = name.trim() && region.trim()

  const submit = () => {
    if (!canCreate) return
    createGroup(name.trim(), description.trim(), region.trim())
    nav('/groups/dashboard')
  }

  return (
    <AppShell>
      <Header title="Create Diaspora Group" back />
      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed">
          Set up a shared account for your association so members can pool contributions and track every project you fund together.
        </p>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Group name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cameroon Diaspora Association — Brussels Chapter"
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
          />
        </div>
        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Based in</label>
          <input
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. Brussels, Belgium"
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
          />
        </div>
        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What does your group focus on?"
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors resize-none"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
          />
        </div>

        <PillButton onClick={submit} fullWidth disabled={!canCreate}>Create group</PillButton>
      </div>
    </AppShell>
  )
}

// ── Diaspora group: member list + invite ───────────────────────────────────────
export function GroupMembersScreen() {
  const { groups, members, addMember } = useCommunity()
  const [showInvite, setShowInvite] = useState(false)
  const [contact, setContact] = useState<PickedContact | null>(null)
  const group = groups[0]
  const groupMembers = members.filter((m) => m.groupId === group?.id)

  const invite = () => {
    if (!contact || !group) return
    addMember(group.id, contact.name, contact.phone)
    setContact(null)
    setShowInvite(false)
  }

  if (!group) {
    return (
      <AppShell>
        <Header title="Group Members" back />
        <EmptyGroupState />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="Group Members" subtitle={group.name} back />
      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">{groupMembers.length} members</span>
          <button onClick={() => setShowInvite((s) => !s)} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold">
            {showInvite ? 'Cancel' : '+ Invite member'}
          </button>
        </div>

        {showInvite && (
          <div className="rounded-2xl border p-4 space-y-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <ContactPicker suggestions={[]} onChange={setContact} />
            <PillButton onClick={invite} fullWidth disabled={!contact}>Add to group</PillButton>
          </div>
        )}

        <div className="space-y-2">
          {groupMembers.map((m) => (
            <Card key={m.id}>
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: C.forest, fontFamily: FONT.serif }}>
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{m.name}</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{m.phone} · Joined {m.joinedDate}</div>
                </div>
                {m.role === 'admin' && (
                  <span className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ background: '#FEF3C7', color: '#92400E', fontFamily: FONT.mono }}>Admin</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  )
}

// ── Diaspora group: shared dashboard ────────────────────────────────────────────
export function GroupDashboardScreen() {
  const nav = useNavigate()
  const { groups, members } = useCommunity()
  const { contributors } = useFunding()
  const { projects } = useApp()
  const group = groups[0]
  const groupMembers = members.filter((m) => m.groupId === group?.id)

  if (!group) {
    return (
      <AppShell>
        <Header title="Group Dashboard" back />
        <EmptyGroupState />
      </AppShell>
    )
  }

  const memberContributions = groupMembers.map((m) => {
    let total = 0
    const fundedProjectIds = new Set<string>()
    for (const [projectId, list] of Object.entries(contributors)) {
      for (const c of list) {
        if (c.name === m.name) {
          total += c.amount
          fundedProjectIds.add(projectId)
        }
      }
    }
    return { member: m, total, projectCount: fundedProjectIds.size }
  })

  const fundedProjectIds = new Set<string>()
  Object.entries(contributors).forEach(([projectId, list]) => {
    if (list.some((c) => groupMembers.some((m) => m.name === c.name))) fundedProjectIds.add(projectId)
  })
  const fundedProjects = projects.filter((p) => fundedProjectIds.has(p.id))
  const totalFunded = memberContributions.reduce((s, mc) => s + mc.total, 0)

  return (
    <AppShell>
      <Header title="Group Dashboard" subtitle={group.name} back />
      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl p-5" style={{ background: C.forest }}>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-widest">{group.region}</div>
          <p style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.85)' }} className="text-xs mt-2 leading-relaxed">{group.description}</p>
          <div className="mt-4 flex items-center gap-6">
            <div>
              <div style={{ fontFamily: FONT.serif, color: C.white }} className="text-2xl font-bold">{fmt(totalFunded)}</div>
              <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[9px] uppercase tracking-wider mt-0.5">Funded together</div>
            </div>
            <div>
              <div style={{ fontFamily: FONT.serif, color: C.white }} className="text-2xl font-bold">{groupMembers.length}</div>
              <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[9px] uppercase tracking-wider mt-0.5">Members</div>
            </div>
          </div>
        </div>

        <button onClick={() => nav('/groups/members')} className="w-full text-left" style={{ fontFamily: FONT.sans, color: C.forest }}>
          <span className="text-xs font-semibold">Manage members →</span>
        </button>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Per-member contribution</p>
          <div className="space-y-2">
            {memberContributions.map(({ member, total, projectCount }) => (
              <Card key={member.id}>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm" style={{ background: C.forest, fontFamily: FONT.serif }}>
                      {member.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold truncate">{member.name}</div>
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{projectCount} project{projectCount === 1 ? '' : 's'} funded</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: FONT.serif, color: C.forest }} className="text-sm font-bold flex-shrink-0">{fmt(total)}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Projects the group has funded</p>
          <div className="space-y-2">
            {fundedProjects.length === 0 && (
              <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">No projects funded by group members yet.</p>
            )}
            {fundedProjects.map((p) => (
              <Card key={p.id} onClick={() => nav(`/funder/project/${p.id}`)}>
                <div className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold truncate">{p.title}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{p.location}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function EmptyGroupState() {
  const nav = useNavigate()
  return (
    <div className="px-5 py-16 text-center sm:mx-auto sm:max-w-md">
      <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-4">You haven't set up a diaspora group yet.</p>
      <PillButton onClick={() => nav('/groups/create')}>Create a group</PillButton>
    </div>
  )
}

// ── Referral system ─────────────────────────────────────────────────────────────
const SUGGESTED_REFERRALS = [
  { name: 'Grace Tabi', phone: '+237 677 900 050', role: 'Friend' },
  { name: 'Samuel Njoh', phone: '+237 677 900 060', role: 'Colleague' },
]

const REFERRAL_STATUS_MAP: Record<ReferralStatus, string> = { invited: 'pending', joined: 'active', rewarded: 'approved' }

export function ReferralScreen() {
  const { referrals, referralCode, addReferral } = useCommunity()
  const [showInvite, setShowInvite] = useState(false)
  const [contact, setContact] = useState<PickedContact | null>(null)

  const rewardedCount = referrals.filter((r) => r.status === 'rewarded').length
  const totalRewards = rewardedCount * REFERRAL_REWARD_XAF

  const invite = () => {
    if (!contact) return
    addReferral(contact.name, contact.phone)
    setContact(null)
    setShowInvite(false)
  }

  return (
    <AppShell>
      <Header title="Refer a Friend" back />
      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl p-5 text-center" style={{ background: C.forest }}>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-widest mb-1">Your referral code</div>
          <div style={{ fontFamily: FONT.serif, color: C.white }} className="text-3xl font-bold tracking-widest">{referralCode}</div>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.65)' }} className="text-[10px] mt-2">mboatrust.app/#/signup?ref={referralCode}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <div className="p-4 text-center">
              <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold">{referrals.length}</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mt-0.5">Total referred</div>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <div style={{ fontFamily: FONT.serif, color: C.forest }} className="text-lg font-bold">{fmt(totalRewards)}</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mt-0.5">Rewards earned</div>
            </div>
          </Card>
        </div>

        {!showInvite ? (
          <PillButton onClick={() => setShowInvite(true)} fullWidth>Invite a friend</PillButton>
        ) : (
          <div className="rounded-2xl border p-4 space-y-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <ContactPicker suggestions={SUGGESTED_REFERRALS} onChange={setContact} />
            <PillButton onClick={invite} fullWidth disabled={!contact}>Send invite</PillButton>
          </div>
        )}

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Your referrals</p>
          <div className="space-y-2">
            {referrals.map((r) => (
              <Card key={r.id}>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{r.name}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{r.date}{r.status === 'rewarded' ? ` · +${fmt(REFERRAL_REWARD_XAF)}` : ''}</div>
                  </div>
                  <StatusBadge status={REFERRAL_STATUS_MAP[r.status]} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// ── Public project showcase (no login required) ─────────────────────────────────
interface ShowcaseProject {
  id: string
  title: string
  category: string
  region: string
  beforeImage: string
  afterImage: string
  fundedAmount: number
  completedDate: string
}

const SEED_SHOWCASE: ShowcaseProject[] = [
  {
    id: 'sc1', title: 'Community borehole — Bafoussam', category: 'Water & Sanitation', region: 'West Region',
    beforeImage: 'https://images.unsplash.com/photo-1594818379496-da1e345b0ded?w=500&h=340&fit=crop&auto=format',
    afterImage: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&h=340&fit=crop&auto=format',
    fundedAmount: 2100000, completedDate: 'Mar 2026',
  },
  {
    id: 'sc2', title: 'Village health post — Ebolowa', category: 'Healthcare', region: 'South Region',
    beforeImage: 'https://images.unsplash.com/photo-1590212151175-e58edd96185b?w=500&h=340&fit=crop&auto=format',
    afterImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&h=340&fit=crop&auto=format',
    fundedAmount: 3400000, completedDate: 'Jan 2026',
  },
  {
    id: 'sc3', title: 'Market stall roofing — Kumba', category: 'Infrastructure', region: 'SW Region',
    beforeImage: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&h=340&fit=crop&auto=format',
    afterImage: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500&h=340&fit=crop&auto=format',
    fundedAmount: 1250000, completedDate: 'Nov 2025',
  },
]

const SHOWCASE_FALLBACK_BEFORE = 'https://images.unsplash.com/photo-1594818379496-da1e345b0ded?w=500&h=340&fit=crop&auto=format'

export function PublicShowcaseScreen() {
  const nav = useNavigate()
  const { projects } = useApp()
  const [category, setCategory] = useState('All')
  const [region, setRegion] = useState('All')

  const realCompleted: ShowcaseProject[] = projects
    .filter((p) => p.status === 'completed')
    .map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      region: p.location.split(',').pop()?.trim() ?? p.location,
      beforeImage: SHOWCASE_FALLBACK_BEFORE,
      afterImage: p.image,
      fundedAmount: p.raised,
      completedDate: 'Completed',
    }))

  const all = [...SEED_SHOWCASE, ...realCompleted]
  const categories = ['All', ...Array.from(new Set(all.map((p) => p.category)))]
  const regions = ['All', ...Array.from(new Set(all.map((p) => p.region)))]
  const filtered = all.filter((p) => (category === 'All' || p.category === category) && (region === 'All' || p.region === region))

  return (
    <div style={{ background: C.cream, color: C.ink, minHeight: '100vh' }}>
      <div className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ borderColor: C.navGlassBorder, background: C.navGlassBg }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <button onClick={() => nav('/')} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: C.forest }}>
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                <path d="M11 2L18 7V15L11 20L4 15V7L11 2Z" fill="none" stroke={C.amber} strokeWidth="1.6" />
                <circle cx="11" cy="11" r="2.5" fill={C.amber} />
              </svg>
            </div>
            <span style={{ fontFamily: FONT.serif }} className="text-lg font-bold">Mboa Trust</span>
          </button>
          <div className="flex items-center gap-2">
          <InstallButton />
          <ThemeToggle />
          <button
            onClick={() => nav('/language')}
            className="rounded-full px-4 py-2.5 text-sm font-bold"
            style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}
          >
            Get started
          </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-10 max-w-2xl">
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-xs uppercase tracking-[0.3em]">Public showcase</div>
          <h1 style={{ fontFamily: FONT.serif }} className="mt-3 text-3xl font-bold sm:text-4xl">Verified projects, completed and delivered.</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-3 text-sm sm:text-base leading-relaxed">
            Every project here was funded through escrow, verified on-site, and completed with photo proof — no login required to browse.
          </p>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="rounded-full px-4 py-2 text-xs font-semibold transition-all"
              style={{ fontFamily: FONT.sans, background: category === c ? C.forest : C.white, color: category === c ? C.white : C.inkMuted, border: `1px solid ${category === c ? C.forest : C.parchmentDark}` }}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mb-8 flex flex-wrap gap-2">
          {regions.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className="rounded-full px-4 py-2 text-xs font-semibold transition-all"
              style={{ fontFamily: FONT.sans, background: region === r ? C.amber : C.white, color: region === r ? C.white : C.inkMuted, border: `1px solid ${region === r ? C.amber : C.parchmentDark}` }}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-[24px] border overflow-hidden" style={{ borderColor: C.parchmentDark, background: C.white }}>
              <div className="p-3 pb-0">
                <BeforeAfterComparison beforeSrc={p.beforeImage} afterSrc={p.afterImage} />
              </div>
              <div className="p-5">
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{p.category} · {p.region}</div>
                <div style={{ fontFamily: FONT.serif }} className="mt-1 text-base font-bold">{p.title}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span style={{ fontFamily: FONT.serif, color: C.forest }} className="text-sm font-bold">{fmt(p.fundedAmount)}</span>
                  <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{p.completedDate}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-sm col-span-full text-center py-10">No projects match these filters.</p>
          )}
        </div>
      </div>
    </div>
  )
}
