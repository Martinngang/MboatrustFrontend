import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { useProjectQuery } from '../api/projects'
import { useMyReferralsQuery, useCreateReferralMutation, type Referral } from '../api/referrals'
import {
  useMyGroupsQuery,
  useGroupDashboardQuery,
  useCreateGroupMutation,
  useInviteGroupMemberMutation,
} from '../api/groups'
import { useUserSearchQuery } from '../api/users'
import { apiErrorMessage } from '../api/client'
import { C, FONT, AppShell, Header, Card, PillButton, StatusBadge, ThemeToggle } from '../components/MobileLayout'
import { BeforeAfterComparison } from '../components/BeforeAfterComparison'
import { InstallButton } from '../components/InstallButton'
import { EmptyState } from '../components/EmptyState'
import { ChipGroup } from '../components/Chip'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { Skeleton, SkeletonList } from '../components/Skeleton'
import { useToast } from '../components/Toast'

// ── Diaspora group: organization profile setup ────────────────────────────────
export function GroupSetupScreen() {
  const nav = useNavigate()
  const { show: showToast } = useToast()
  const createGroup = useCreateGroupMutation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [purpose, setPurpose] = useState('')

  const canCreate = name.trim().length > 0

  const submit = async () => {
    if (!canCreate) return
    try {
      const group = await createGroup.mutateAsync({ name: name.trim(), description: description.trim(), purpose: purpose.trim() })
      nav(`/groups/dashboard/${group.id}`)
    } catch (err) {
      showToast({ title: 'Failed to create group', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
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
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Purpose (optional)</label>
          <input
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. Pooling toward community water & education projects"
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

        <PillButton onClick={submit} fullWidth disabled={!canCreate || createGroup.isPending}>{createGroup.isPending ? 'Creating…' : 'Create group'}</PillButton>
      </div>
    </AppShell>
  )
}

// ── Diaspora group: member list + invite ───────────────────────────────────────
export function GroupMembersScreen() {
  const { id } = useParams()
  const { show: showToast } = useToast()
  const { data: groups = [] } = useMyGroupsQuery()
  const groupId = id ?? groups[0]?.id
  const { data: dashboard, isLoading } = useGroupDashboardQuery(groupId)
  const inviteMember = useInviteGroupMemberMutation()

  const [showInvite, setShowInvite] = useState(false)
  const [query, setQuery] = useState('')
  const { data: results = [], isFetching } = useUserSearchQuery(query)

  const invite = async (userId: string) => {
    if (!groupId) return
    try {
      await inviteMember.mutateAsync({ groupId, userId })
      setQuery('')
      setShowInvite(false)
      showToast({ title: 'Member added', tone: 'success' })
    } catch (err) {
      showToast({ title: 'Failed to add member', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  if (!isLoading && !groupId) {
    return (
      <AppShell>
        <Header title="Group Members" back />
        <EmptyGroupState />
      </AppShell>
    )
  }

  const groupMembers = dashboard?.members ?? []

  return (
    <AppShell>
      <Header title="Group Members" subtitle={dashboard?.group.name} back />
      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">{groupMembers.length} members</span>
          <button onClick={() => setShowInvite((s) => !s)} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold">
            {showInvite ? 'Cancel' : '+ Invite member'}
          </button>
        </div>

        {showInvite && (
          <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">
              Members must already have a Mboa Trust account. Search by name, phone, or email.
            </p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Marie-Claire, +32..., or name@email.com"
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
            />
            {query.trim().length >= 2 && (
              <div className="space-y-2">
                {isFetching && <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">Searching…</p>}
                {!isFetching && results.length === 0 && (
                  <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">No matching account found. They'll need to create one first.</p>
                )}
                {results
                  .filter((u) => !groupMembers.some((m) => m.userId === u.id))
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => invite(u.id)}
                      disabled={inviteMember.isPending}
                      className="w-full text-left rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                      style={{ borderColor: C.parchmentDark, background: C.white }}
                    >
                      <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{u.fullName}</div>
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">{u.phoneNumber || u.email || u.roles.join(', ')}</div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        <StaggerList className="space-y-2">
          {groupMembers.map((m) => (
            <StaggerItem key={m.id}>
              <Card>
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: C.forest, fontFamily: FONT.serif }}>
                    {m.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{m.name}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">Joined {m.joinedAt}</div>
                  </div>
                  {m.role === 'owner' && (
                    <span className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ background: 'var(--status-warning-bg)', color: 'var(--status-warning-text)', fontFamily: FONT.mono }}>Owner</span>
                  )}
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </AppShell>
  )
}

// ── Diaspora group: shared dashboard ────────────────────────────────────────────
export function GroupDashboardScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { data: groups = [] } = useMyGroupsQuery()
  const groupId = id ?? groups[0]?.id
  const { data: dashboard, isLoading } = useGroupDashboardQuery(groupId)
  const { data: linkedProject } = useProjectQuery(dashboard?.group.linkedProjectId ?? undefined)

  if (!isLoading && !groupId) {
    return (
      <AppShell>
        <Header title="Group Dashboard" back />
        <EmptyGroupState />
      </AppShell>
    )
  }

  if (!dashboard) {
    return (
      <AppShell>
        <Header title="Group Dashboard" back />
        <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
          <Skeleton variant="block" height={140} />
          <SkeletonList rows={3} />
        </div>
      </AppShell>
    )
  }

  const { group, members: groupMembers, fundingSummary, contributionsByMember } = dashboard
  const contributionByUserId = new Map(contributionsByMember.map((c) => [c.userId, c.total]))

  return (
    <AppShell>
      <Header title="Group Dashboard" subtitle={group.name} back />
      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl p-5" style={{ background: C.forest }}>
          {group.purpose && (
            <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-widest">{group.purpose}</div>
          )}
          <p style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.85)' }} className="text-xs mt-2 leading-relaxed">{group.description}</p>
          <div className="mt-4 flex items-center gap-6">
            <div>
              <div style={{ fontFamily: FONT.serif, color: '#fff' }} className="text-2xl font-bold">{fmt(fundingSummary?.raised ?? 0)}</div>
              <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[9px] uppercase tracking-wider mt-0.5">Funded together</div>
            </div>
            <div>
              <div style={{ fontFamily: FONT.serif, color: '#fff' }} className="text-2xl font-bold">{groupMembers.length}</div>
              <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[9px] uppercase tracking-wider mt-0.5">Members</div>
            </div>
          </div>
        </div>

        <button onClick={() => nav(`/groups/members/${group.id}`)} className="w-full text-left" style={{ fontFamily: FONT.sans, color: C.forest }}>
          <span className="text-xs font-semibold">Manage members →</span>
        </button>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Per-member contribution</p>
          <StaggerList className="space-y-2">
            {groupMembers.map((member) => (
              <StaggerItem key={member.id}>
                <Card>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm" style={{ background: C.forest, fontFamily: FONT.serif }}>
                        {member.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold truncate">{member.name}</div>
                        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">Joined {member.joinedAt}</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: FONT.serif, color: C.forest }} className="text-sm font-bold flex-shrink-0">{fmt(contributionByUserId.get(member.userId) ?? 0)}</span>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Project the group is funding</p>
          {!linkedProject ? (
            <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">No project linked to this group yet.</p>
          ) : (
            <Card variant="interactive" onClick={() => nav(`/funder/project/${linkedProject.id}`)}>
              <div className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold truncate">{linkedProject.title}</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{linkedProject.location}</div>
                </div>
                <StatusBadge status={linkedProject.status} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function EmptyGroupState() {
  const nav = useNavigate()
  return (
    <div className="px-5 sm:mx-auto sm:max-w-md">
      <EmptyState
        icon="users"
        title="No diaspora group yet"
        description="Set up a shared account so members can pool contributions and track every project you fund together."
        illustration="tilt"
        action={<PillButton onClick={() => nav('/groups/create')}>Create a group</PillButton>}
      />
    </div>
  )
}

// ── Referral system ─────────────────────────────────────────────────────────────
const REFERRAL_STATUS_MAP: Record<Referral['status'], string> = { invited: 'pending', joined: 'active', rewarded: 'approved' }

export function ReferralScreen() {
  const { show: showToast } = useToast()
  const { data: referrals = [], isLoading } = useMyReferralsQuery()
  const createReferral = useCreateReferralMutation()
  const [copied, setCopied] = useState(false)

  // "My shareable link" = the most recent still-'invited' (unclaimed)
  // referral record — each one is single-use, so a fresh one is created
  // once the last is claimed. See api/referrals.ts.
  const shareable = referrals.find((r) => r.status === 'invited')
  const createdRef = useRef(false)
  useEffect(() => {
    if (!isLoading && !shareable && !createdRef.current) {
      createdRef.current = true
      createReferral.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, shareable])

  const rewardedCount = referrals.filter((r) => r.status === 'rewarded').length
  const totalRewards = referrals.reduce((s, r) => s + (r.rewardAmount ?? 0), 0)
  const link = shareable ? `mboatrust.app/#/signup?ref=${shareable.id}` : ''

  const copyLink = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast({ title: 'Could not copy link', tone: 'error' })
    }
  }

  return (
    <AppShell>
      <Header title="Refer a Friend" back />
      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl p-5 text-center" style={{ background: C.forest }}>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-widest mb-1">Your referral link</div>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.85)' }} className="text-xs break-all mt-2">{link || 'Generating…'}</div>
          <button
            onClick={copyLink}
            disabled={!link}
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', fontFamily: FONT.sans }}
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card variant="glass">
            <div className="p-4 text-center">
              <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold">{rewardedCount}</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mt-0.5">Successful referrals</div>
            </div>
          </Card>
          <Card variant="glass">
            <div className="p-4 text-center">
              <div style={{ fontFamily: FONT.serif, color: C.forest }} className="text-lg font-bold">{fmt(totalRewards)}</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mt-0.5">Rewards earned</div>
            </div>
          </Card>
        </div>

        <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">
          Share your link with someone who hasn't joined yet. You're rewarded once they sign up and complete their first project or contract.
          Earned rewards are tracked here and paid out separately by our team — not sent automatically.
        </p>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Your referrals</p>
          {isLoading && <SkeletonList rows={2} />}
          {!isLoading && referrals.filter((r) => r.status !== 'invited').length === 0 && (
            <Card>
              <div className="p-4 text-center">
                <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">No one has joined via your link yet.</p>
              </div>
            </Card>
          )}
          <StaggerList className="space-y-2">
            {referrals.filter((r) => r.status !== 'invited').map((r) => (
              <StaggerItem key={r.id}>
                <Card>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{r.referredName ?? 'New member'}</div>
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{r.date}{r.status === 'rewarded' && r.rewardAmount ? ` · +${fmt(r.rewardAmount)}` : ''}</div>
                    </div>
                    <StatusBadge status={REFERRAL_STATUS_MAP[r.status]} />
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
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
            style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
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

        <div className="mb-3">
          <ChipGroup options={categories} value={category} onChange={(v) => setCategory(v as string)} />
        </div>
        <div className="mb-8">
          <ChipGroup options={regions} value={region} onChange={(v) => setRegion(v as string)} tone="amber" />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="hardHat" title="No projects match these filters" illustration="tilt" />
        ) : (
          <StaggerList className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <StaggerItem key={p.id}>
                <Card variant="elevated" tilt>
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
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  )
}
