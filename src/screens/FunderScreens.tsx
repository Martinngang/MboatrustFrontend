import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { useApp, fmt, type Milestone, type Project } from '../context'
import { C, FONT, AppShell, Card, StatusBadge, ProgressBar, Stars, PillButton, Header, StepIndicator, MomoOmPicker } from '../components/MobileLayout'
import { ActivityTimeline, type TimelineEvent } from '../components/ActivityTimeline'
import { ApprovalStatusList } from '../components/ApprovalStatusList'
import { CurrencyConverterWidget } from '../components/CurrencyConverterWidget'
import { FeeBreakdown } from '../components/FeeBreakdown'
import { useTransactionsQuery, type Transaction } from '../api/transactions'
import { useVideoSessionsQuery, useRequestVideoSessionMutation, useScheduleVideoSessionMutation } from '../api/videoVerification'
import { useVerificationTasksQuery } from '../api/reputation'
import { KycGateBanner, useKycGate } from '../components/KycGateBanner'
import { useStartConversationMutation } from '../api/messaging'
import type { Approver } from '../verification'
import { useFeeCalculation } from '../feeConfig'
import { ChipGroup } from '../components/Chip'
import { EmptyState } from '../components/EmptyState'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { DeferredReveal, SkeletonCard } from '../components/Skeleton'
import { Switch } from '../components/Switch'
import { ConfirmDialog, Modal } from '../components/Modal'
import { AppIcon } from '../components/icons'
import { useTemplates } from '../templates'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'
import { useProjectsInfiniteQuery } from '../api/projects'
import { useContractorProfilesInfiniteQuery } from '../api/contractors'

interface DraftMilestone { id: number; title: string; amount: string; description: string; requiresMultiApproval?: boolean; requiresVideo?: boolean }

function buildProjectTimeline(p: Project): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { id: 'funded', label: 'Project funded', detail: `${fmt(p.raised)} of ${fmt(p.totalAmount)} raised`, status: 'done' },
  ]
  for (const m of p.milestones) {
    if (m.status === 'released') events.push({ id: `${m.id}-r`, label: `${m.title} — approved & released`, detail: fmt(m.amount), status: 'done' })
    else if (m.status === 'under_review') events.push({ id: `${m.id}-u`, label: `${m.title} — submitted for review`, detail: fmt(m.amount), status: 'current' })
    else if (m.status === 'disputed') events.push({ id: `${m.id}-d`, label: `${m.title} — disputed`, detail: fmt(m.amount), status: 'flagged' })
    else events.push({ id: `${m.id}-p`, label: `${m.title} — pending`, detail: fmt(m.amount), status: 'upcoming' })
  }
  return events
}
interface DraftProject {
  title: string
  category: string
  description: string
  location: string
  totalAmount: number
  milestones?: DraftMilestone[]
}

// ── Browse projects ────────────────────────────────────────────────────────────
export function BrowseProjectsScreen() {
  const nav = useNavigate()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useProjectsInfiniteQuery()
  const projects = data?.pages.flatMap((p) => p.items) ?? []
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const categories = ['All', 'Water & Sanitation', 'Education', 'Healthcare']
  const filtered = projects.filter((p) => {
    const matchesCategory = filter === 'All' || p.category === filter
    const q = query.trim().toLowerCase()
    const matchesQuery = !q || p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)
    return matchesCategory && matchesQuery
  })

  return (
    <AppShell>
      <Header
        title="Discover Projects"
        back
        action={
          <button onClick={() => nav('/funder/create')} style={{ fontFamily: FONT.sans, color: C.forest }} className="whitespace-nowrap text-sm font-semibold">
            + New project
          </button>
        }
      >
        <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5 mb-4" style={{ borderColor: C.parchmentDark, background: C.cream }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4" stroke={C.inkSubtle} strokeWidth="1.3" />
            <line x1="9" y1="9" x2="12" y2="12" stroke={C.inkSubtle} strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, locations..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ fontFamily: FONT.sans, color: C.ink }}
          />
        </div>
        <div className="overflow-x-auto pb-1">
          <ChipGroup options={categories} value={filter} onChange={(v) => setFilter(v as string)} />
        </div>
      </Header>

      <div className="px-5 py-4">
        {!isLoading && filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title="No projects found"
            description="Try a different search term or category."
            illustration="tilt"
          />
        ) : (
          <DeferredReveal
            skeleton={
              <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} className="h-56" />)}
              </div>
            }
          >
          <StaggerList className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 xl:grid-cols-3">
            {filtered.map((p) => {
              const pct = Math.round((p.raised / p.totalAmount) * 100)
              return (
                <StaggerItem key={p.id}>
                  <Card variant="interactive" onClick={() => nav(`/funder/project/${p.id}`)}>
              <img src={p.image} alt={p.title} className="w-full h-36 object-cover rounded-t-xl" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{p.title}</div>
                  <StatusBadge status={p.status} />
                </div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-3">{p.location} · {p.category}</div>
                <ProgressBar pct={pct} />
                <div className="flex justify-between mt-2">
                  <div>
                    <span style={{ fontFamily: FONT.serif }} className="text-sm font-bold">{fmt(p.raised)}</span>
                    <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] ml-1">of {fmt(p.totalAmount)}</span>
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: p.daysLeft > 0 ? C.inkMuted : C.forest }} className="text-[10px]">
                    {p.daysLeft > 0 ? `${p.daysLeft} days left` : 'Completed'}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: C.parchmentDark }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: C.forest, fontFamily: FONT.serif }}>
                    {p.recipient[0]}
                  </div>
                  <div>
                    <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">{p.recipient}</span>
                    <Stars rating={p.recipientRating} />
                  </div>
                </div>
              </div>
                  </Card>
                </StaggerItem>
              )
            })}
          </StaggerList>
          {hasNextPage && (
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-5 py-2.5 rounded-full text-sm font-semibold border"
                style={{ borderColor: C.parchmentDark, color: C.ink, fontFamily: FONT.sans, opacity: isFetchingNextPage ? 0.6 : 1 }}
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
          </DeferredReveal>
        )}
      </div>
    </AppShell>
  )
}

// ── Project detail ────────────────────────────────────────────────────────────
export function ProjectDetailScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { projects, devUserId } = useApp()
  const { show: showToast } = useToast()
  // id undefined (no specific project requested) falls back to projects[0]
  // as before; id given but not found must NOT silently substitute a
  // different real project — that's a fund/message screen, not read-only.
  const found = projects.find((x) => x.id === id)
  if (id && !found) {
    return (
      <AppShell noNav>
        <div className="px-5 py-5">
          <EmptyState icon="clipboard" title="Project not found" description="This project may have been removed, or the link is incorrect." action={<PillButton onClick={() => nav('/home')}>Back to home</PillButton>} />
        </div>
      </AppShell>
    )
  }
  const p = found ?? projects[0]
  const pct = Math.round((p.raised / p.totalAmount) * 100)
  const startConversation = useStartConversationMutation(devUserId)

  const messageRecipient = async () => {
    if (!p.recipientId || p.recipientId === devUserId) return
    try {
      const conversation = await startConversation.mutateAsync({ contextType: 'project', contextId: p.id, otherUserId: p.recipientId })
      nav(`/messages/${conversation.id}`)
    } catch (err) {
      showToast({ title: 'Failed to start conversation', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  return (
    <AppShell noNav>
      {/* Hero image */}
      <div className="relative h-52 sm:h-64 lg:h-80">
        <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,27,20,0.8), transparent 50%)' }} />
        <button onClick={() => nav(-1)} aria-label="Back" className="absolute top-6 left-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <StatusBadge status={p.status} />
          <h1 style={{ fontFamily: FONT.serif }} className="text-xl font-bold text-white mt-1 sm:text-2xl">{p.title}</h1>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.7)' }} className="text-[10px] uppercase tracking-wider">{p.location}</div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-3xl">
        {/* Funding progress */}
        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div className="flex justify-between mb-2">
            <div>
              <div style={{ fontFamily: FONT.serif }} className="text-xl font-bold">{fmt(p.raised)}</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">raised of {fmt(p.totalAmount)}</div>
            </div>
            <div className="text-right">
              <div style={{ fontFamily: FONT.serif, color: C.forest }} className="text-xl font-bold">{pct}%</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">funded</div>
            </div>
          </div>
          <ProgressBar pct={pct} />
          {p.daysLeft > 0 && (
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mt-2">{p.daysLeft} days remaining</div>
          )}
        </div>

        {/* Description */}
        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-2">About this project</p>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed">{p.description}</p>
        </div>

        {/* Milestones */}
        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-3">Milestone tracker</p>
          <div className="space-y-2">
            {p.milestones.map((m, i) => (
              <div
                key={m.id}
                className="flex items-start gap-3 p-4 rounded-xl border"
                style={{
                  borderColor: m.status === 'under_review' ? C.amber : C.parchmentDark,
                  background: m.status === 'released' ? 'var(--status-success-bg)' : m.status === 'under_review' ? 'var(--status-warning-bg)' : C.white,
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: m.status === 'released' ? C.forest : m.status === 'under_review' ? C.amber : C.parchmentDark }}
                >
                  {m.status === 'released' ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <span style={{ fontFamily: FONT.mono, color: m.status === 'under_review' ? C.forestDark : C.inkSubtle }} className="text-[10px] font-bold">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{m.title}</div>
                    <StatusBadge status={m.status} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px] mt-0.5">{fmt(m.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recipient */}
        <button onClick={() => nav(`/funder/recipient/${p.id}`)} className="w-full text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-3">Project recipient</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: C.forest, fontFamily: FONT.serif }}>
              {p.recipient[0]}
            </div>
            <div>
              <div style={{ fontFamily: FONT.sans }} className="font-semibold">{p.recipient}</div>
              <Stars rating={p.recipientRating} />
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">View profile →</div>
            </div>
          </div>
        </button>
        {p.recipientId && p.recipientId !== devUserId && (
          <PillButton onClick={messageRecipient} variant="ghost" fullWidth disabled={startConversation.isPending}>
            {startConversation.isPending ? 'Starting…' : 'Message recipient'}
          </PillButton>
        )}

        {/* Activity */}
        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-3">Activity</p>
          <ActivityTimeline events={buildProjectTimeline(p)} />
        </div>

        {/* Actions */}
        {p.milestones.some((m) => m.status === 'under_review') && (
          <button
            onClick={() => nav(`/funder/review/${p.id}`)}
            className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: C.amber, color: C.forestDark, fontFamily: FONT.sans }}
          >
            Review pending milestone proof
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7H11M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {/* 'open' covers a project that was created but never successfully funded
            (payment abandoned or failed) — without this it has no recovery path,
            since funding otherwise only happens inline during creation. */}
        {(p.status === 'active' || p.status === 'open') && (
          <PillButton onClick={() => nav('/funder/fund', { state: { projectId: p.id } })} fullWidth>
            {p.status === 'open' ? 'Fund this project' : 'Add funds to escrow'}
          </PillButton>
        )}
        {p.status === 'completed' && (
          <PillButton onClick={() => nav(`/funder/rate-recipient/${p.id}`)} fullWidth>Rate this recipient</PillButton>
        )}
        <PillButton onClick={() => nav(`/funder/co-signer/${p.id}`)} variant="secondary" fullWidth>Add a community co-signer</PillButton>
        <PillButton onClick={() => nav(`/funder/project/${p.id}/funding`)} variant="ghost" fullWidth>View group funding & contributors</PillButton>
      </div>
    </AppShell>
  )
}

// ── Recipient profile view (funder-facing) ─────────────────────────────────────
export function RecipientProfileScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { projects } = useApp()
  const foundAnchor = projects.find((p) => p.id === id)
  if (id && !foundAnchor) {
    return (
      <AppShell>
        <Header title="Recipient" back />
        <div className="px-5 py-5">
          <EmptyState icon="user" title="Project not found" description="This project may have been removed, or the link is incorrect." />
        </div>
      </AppShell>
    )
  }
  const anchor = foundAnchor ?? projects[0]
  const recipientProjects = projects.filter((p) => p.recipient === anchor.recipient)
  const totalReceived = recipientProjects.flatMap((p) => p.milestones).filter((m) => m.status === 'released').reduce((s, m) => s + m.amount, 0)

  return (
    <AppShell>
      <Header title="Recipient Profile" back />
      <div className="px-5 py-6 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3" style={{ background: C.forest, fontFamily: FONT.serif }}>
            {anchor.recipient[0]}
          </div>
          <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold">{anchor.recipient}</div>
          <Stars rating={anchor.recipientRating} />
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mt-1">Verified recipient</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Projects', value: String(recipientProjects.length) },
            { label: 'Received', value: fmt(totalReceived) },
            { label: 'Rating', value: anchor.recipientRating.toFixed(1) },
          ].map(({ label, value }) => (
            <Card key={label} variant="glass">
              <div className="p-3 text-center">
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold">{value}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            </Card>
          ))}
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Project history</p>
          <StaggerList className="space-y-3">
            {recipientProjects.map((p) => (
              <StaggerItem key={p.id}>
                <Card variant="interactive" onClick={() => nav(`/funder/project/${p.id}`)}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{p.title}</div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{p.location}</div>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>

        <PillButton onClick={() => nav(`/funder/rate-recipient/${anchor.id}`)} variant="secondary" fullWidth>Rate this recipient</PillButton>
      </div>
    </AppShell>
  )
}

// ── Create project — step wizard ───────────────────────────────────────────────
export function CreateProjectScreen() {
  const nav = useNavigate()
  const [step, setStep] = useState<'details' | 'review'>('details')
  const [form, setForm] = useState({ title: '', category: '', description: '', location: '', totalAmount: '' })

  const categories = ['Water & Sanitation', 'Education', 'Healthcare', 'Infrastructure', 'Agriculture', 'Housing']
  const canContinue = form.title.trim() !== '' && form.category !== '' && form.location.trim() !== '' && Number(form.totalAmount) > 0

  const proceed = () => {
    if (step === 'details') {
      if (!canContinue) return
      setStep('review')
      return
    }
    const draft: DraftProject = { title: form.title, category: form.category, description: form.description, location: form.location, totalAmount: Number(form.totalAmount) }
    nav('/funder/milestones', { state: { draft } })
  }

  return (
    <AppShell noNav>
      <Header title="New Project" back>
        <StepIndicator steps={['Details', 'Milestones', 'Fund']} current={0} />
      </Header>

      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {step === 'details' && (
          <>
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Project title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Borehole — Bamenda North"
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
            </div>
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Category</label>
              <ChipGroup options={categories} value={form.category} onChange={(v) => setForm({ ...form, category: v as string })} />
            </div>
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4} placeholder="Describe the project, who it serves, and why funding is needed..."
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none focus:border-[var(--color-forest)] transition-colors"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
            </div>
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Location</label>
              <div className="relative">
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Bamenda, North West Region"
                  className="w-full border-2 rounded-xl px-4 py-3 pl-10 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                  style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
                <svg className="absolute left-3 top-3.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2C5.8 2 4 3.8 4 6C4 9 8 14 8 14C8 14 12 9 12 6C12 3.8 10.2 2 8 2Z" stroke={C.inkSubtle} strokeWidth="1.3" />
                  <circle cx="8" cy="6" r="1.5" fill={C.inkSubtle} />
                </svg>
              </div>
            </div>
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Total amount needed (XAF)</label>
              <input value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                type="number" placeholder="e.g. 3200000"
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
            </div>
            <Link to="/tools/material-estimator" className="flex items-center gap-2 text-xs font-semibold" style={{ fontFamily: FONT.sans, color: C.forest }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L8.2 5.2H12.5L9 7.7L10.2 12L7 9.3L3.8 12L5 7.7L1.5 5.2H5.8L7 1Z" stroke={C.forest} strokeWidth="1.1" strokeLinejoin="round" /></svg>
              Not sure on a budget? Check the material cost estimator →
            </Link>
          </>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Project summary</div>
              {Object.entries({ Title: form.title || 'Not set', Category: form.category || 'Not set', Location: form.location || 'Not set', Amount: form.totalAmount ? fmt(Number(form.totalAmount)) : 'Not set' }).map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b last:border-0" style={{ borderColor: C.parchmentDark }}>
                  <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs uppercase tracking-wider">{k}</span>
                  <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={proceed} fullWidth disabled={step === 'details' && !canContinue}>
          {step === 'details' ? 'Continue' : 'Next: Define milestones'}
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Define milestones ──────────────────────────────────────────────────────────
export function MilestonesScreen() {
  const nav = useNavigate()
  const location = useLocation()
  const draft = (location.state as { draft?: DraftProject } | null)?.draft ?? {
    title: 'Untitled project', category: '', description: '', location: '', totalAmount: 0,
  }
  const [milestones, setMilestones] = useState<DraftMilestone[]>([
    { id: 1, title: 'Site survey & permits', amount: '', description: '' },
  ])
  const { templates, addTemplate } = useTemplates()
  const { show: showToast } = useToast()
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const addMilestone = () => {
    setMilestones((ms) => [...ms, { id: Date.now(), title: '', amount: '', description: '' }])
  }

  const update = (id: number, field: string, val: string) => {
    setMilestones((ms) => ms.map((m) => (m.id === id ? { ...m, [field]: val } : m)))
  }

  const toggleMultiApproval = (id: number) => {
    setMilestones((ms) => ms.map((m) => (m.id === id ? { ...m, requiresMultiApproval: !m.requiresMultiApproval } : m)))
  }

  const toggleRequiresVideo = (id: number) => {
    setMilestones((ms) => ms.map((m) => (m.id === id ? { ...m, requiresVideo: !m.requiresVideo } : m)))
  }

  const applyTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId)
    if (!t) return
    setMilestones(t.milestones.map((m, i) => ({ id: Date.now() + i, title: m.title, amount: String(m.amount), description: m.description })))
    showToast({ title: 'Template applied', description: `${t.milestones.length} milestones filled in from "${t.name}"`, tone: 'success' })
  }

  const saveAsTemplate = () => {
    const valid = milestones.filter((m) => m.title.trim() && Number(m.amount) > 0)
    if (!templateName.trim() || valid.length === 0) return
    addTemplate({
      name: templateName.trim(),
      category: draft.category || 'General',
      milestones: valid.map((m) => ({ title: m.title, amount: Number(m.amount), description: m.description })),
    })
    showToast({ title: 'Template saved', description: `"${templateName.trim()}" is ready to reuse next time`, tone: 'success' })
    setSaveModalOpen(false)
    setTemplateName('')
  }

  const proceed = () => {
    nav('/funder/fund', { state: { draft: { ...draft, milestones } } })
  }

  return (
    <AppShell noNav>
      <Header title="Define Milestones" subtitle={draft.title} back>
        <StepIndicator steps={['Details', 'Milestones', 'Fund']} current={1} />
      </Header>

      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl border p-4" style={{ background: 'var(--status-success-bg)', borderColor: C.forestLight }}>
          <p style={{ fontFamily: FONT.sans, color: 'var(--status-success-text)' }} className="text-xs leading-relaxed">
            Each milestone locks a portion of the escrow. Funds for each stage are released only when photo/video proof is submitted and independently verified.
          </p>
        </div>

        {templates.length > 0 && (
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Start from a template</label>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t.id)}
                  className="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
                  style={{ borderColor: C.parchmentDark, background: C.white, color: C.inkMuted, fontFamily: FONT.sans }}
                >
                  {t.name} · {t.milestones.length} steps
                </button>
              ))}
            </div>
          </div>
        )}

        {milestones.map((m, i) => (
          <div key={m.id} className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: C.forest, fontFamily: FONT.mono }}>{i + 1}</div>
              {milestones.length > 1 && (
                <button onClick={() => setMilestones((ms) => ms.filter((x) => x.id !== m.id))} style={{ color: 'var(--status-error-text)', fontFamily: FONT.mono }} className="text-xs">Remove</button>
              )}
            </div>
            {(['title', 'description', 'amount'] as const).map((field) => (
              <div key={field} className="mb-3">
                <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1">
                  {field === 'amount' ? 'Amount (XAF)' : field}
                </label>
                <input
                  value={m[field]}
                  onChange={(e) => update(m.id, field, e.target.value)}
                  placeholder={field === 'title' ? 'e.g. Foundation complete' : field === 'amount' ? 'e.g. 800000' : 'What proof is required?'}
                  className="w-full border rounded-xl px-3 py-2.5 outline-none text-sm"
                  style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
                />
              </div>
            ))}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!m.requiresMultiApproval}
                onChange={() => toggleMultiApproval(m.id)}
                className="w-4 h-4 rounded"
                style={{ accentColor: C.forest }}
              />
              <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">Require multiple approvers before release</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={!!m.requiresVideo}
                onChange={() => toggleRequiresVideo(m.id)}
                className="w-4 h-4 rounded"
                style={{ accentColor: C.forest }}
              />
              <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">Allow a live video verification call for this milestone</span>
            </label>
          </div>
        ))}

        <button
          onClick={addMilestone}
          className="w-full py-3.5 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all"
          style={{ borderColor: C.forest, color: C.forest, fontFamily: FONT.sans }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 4V12M4 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Add another milestone
        </button>

        <button
          onClick={() => setSaveModalOpen(true)}
          disabled={!milestones.some((m) => m.title.trim() && Number(m.amount) > 0)}
          className="w-full py-2.5 text-xs font-semibold disabled:opacity-40"
          style={{ color: C.inkMuted, fontFamily: FONT.sans }}
        >
          Save this breakdown as a reusable template
        </button>
      </div>

      <Modal open={saveModalOpen} onClose={() => setSaveModalOpen(false)} title="Save as template">
        <div className="space-y-4">
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Template name</label>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Borehole / water point"
              autoFocus
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
            />
          </div>
          <PillButton onClick={saveAsTemplate} fullWidth disabled={!templateName.trim()}>Save template</PillButton>
        </div>
      </Modal>

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={proceed} fullWidth disabled={!milestones.some((m) => m.title.trim() && Number(m.amount) > 0)}>
          Save &amp; continue to payment
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Fund project / MoMo payment ────────────────────────────────────────────────
export function FundProjectScreen() {
  const nav = useNavigate()
  const location = useLocation()
  const { projects, phone, addProject, fundProject } = useApp()
  const fees = useFeeCalculation()
  const { show: showToast } = useToast()
  const state = (location.state as { draft?: DraftProject; projectId?: string } | null) ?? {}
  const draft = state.draft
  const existing = state.projectId ? projects.find((p) => p.id === state.projectId) : undefined
  const fallback = projects[0]

  const [method, setMethod] = useState<'momo' | 'om'>('momo')
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select')
  const [pin, setPin] = useState('')
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [foreignCurrency, setForeignCurrency] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Frozen at submit time — `amount` below is derived from `existing.raised`,
  // which the fund mutation's cache invalidation updates as soon as it
  // succeeds. Without this, the success screen (rendered after that update)
  // would recompute `amount` as the tiny *remaining* shortfall instead of
  // showing what was actually just paid.
  const [paidAmount, setPaidAmount] = useState<number | null>(null)

  const amount = draft
    ? (draft.milestones && draft.milestones.length > 0
        ? draft.milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0)
        : draft.totalAmount)
    : existing
      ? Math.max(0, existing.totalAmount - existing.raised)
      : 1400000
  const title = draft?.title ?? existing?.title ?? fallback.title
  const { blocked: kycBlocked } = useKycGate(amount)

  const confirmPayment = async () => {
    setSubmitting(true)
    setPaidAmount(amount)
    try {
      if (draft) {
        const milestones: Milestone[] = (draft.milestones ?? []).map((m) => ({
          id: '',
          title: m.title || 'Milestone',
          amount: Number(m.amount) || 0,
          status: 'pending',
          proof: false,
          evidence: [],
          requiresCosigner: !!m.requiresMultiApproval,
          requiresVideo: !!m.requiresVideo,
          approvers: [],
        }))
        const created = await addProject({
          title: draft.title,
          category: draft.category || 'General',
          location: draft.location,
          totalAmount: draft.totalAmount || amount,
          raised: 0,
          status: 'active',
          recipient: 'Awaiting recipient',
          recipientRating: 0,
          milestones,
          image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=220&fit=crop&auto=format',
          description: draft.description,
          daysLeft: 90,
          requiresMultiSig: false,
        })
        await fundProject(created.id, amount, {
          paymentProvider: method === 'om' ? 'orange_money' : 'mtn_momo',
          payerPhoneNumber: phone || '+237677234891',
        })
        setCreatedId(created.id)
      } else if (existing) {
        await fundProject(existing.id, amount, {
          paymentProvider: method === 'om' ? 'orange_money' : 'mtn_momo',
          payerPhoneNumber: phone || '+237677234891',
        })
      }
      setStep('success')
    } catch (err) {
      showToast({ title: 'Payment failed', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'success') {
    const targetId = createdId ?? existing?.id ?? fallback.id
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.forest }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-2">Funds secured in escrow</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed mb-2">
            {fmt(paidAmount ?? amount)} is now held in escrow for <strong>{title}</strong>.
          </p>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed mb-8">
            Funds will be released to the recipient only when milestone proof is verified and you approve.
          </p>
          <div className="rounded-2xl border p-4 w-full mb-8" style={{ borderColor: C.parchmentDark, background: C.parchment }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-1">Transaction reference</div>
            <div style={{ fontFamily: FONT.mono, color: C.ink }} className="text-sm font-medium">DL-2025-07-{Math.floor(Math.random() * 90000 + 10000)}</div>
          </div>
          <PillButton onClick={() => nav(`/funder/project/${targetId}`)} fullWidth>Back to project</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Fund Project" subtitle={title} back>
        {draft && <StepIndicator steps={['Details', 'Milestones', 'Fund']} current={2} />}
      </Header>

      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {/* Amount card */}
        <div className="rounded-2xl p-5 text-center" style={{ background: C.forest }}>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-xs uppercase tracking-widest mb-1">Amount to escrow</div>
          <div style={{ fontFamily: FONT.serif }} className="text-4xl font-bold text-white">{fmt(amount)}</div>
          <div style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.7)' }} className="text-sm mt-2">{title}</div>
          <div className="mt-3 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5" style={{ background: 'rgba(232,160,32,0.2)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="2" y="4" width="6" height="5" rx="0.5" stroke={C.amber} strokeWidth="1" />
              <path d="M3.5 4V2.5C3.5 1.7 4.2 1 5 1C5.8 1 6.5 1.7 6.5 2.5V4" stroke={C.amber} strokeWidth="1" />
            </svg>
            <span style={{ fontFamily: FONT.mono, color: C.amber }} className="text-[9px] uppercase tracking-wider">Held in escrow until verified</span>
          </div>
        </div>

        <FeeBreakdown result={fees.projectFunding(amount)} />

        {/* Payment method */}
        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Payment method</label>
          <MomoOmPicker method={method} onChange={setMethod} />
        </div>

        {/* Phone confirm */}
        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Paying from</label>
          <div className="flex items-center gap-3 border-2 rounded-xl px-4 py-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm">+237 677 234 891</span>
            <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ background: C.forest }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* PIN */}
        {step === 'confirm' && (
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Enter MoMo PIN</label>
            <div className="flex gap-3 justify-center">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-12 h-12 rounded-xl border-2 flex items-center justify-center" style={{ borderColor: pin.length > i ? C.forest : C.parchmentDark, background: C.white }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: pin.length > i ? C.forest : 'transparent' }} />
                </div>
              ))}
            </div>
            <input type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)}
              className="opacity-0 absolute w-0 h-0" autoFocus />
          </div>
        )}

        {/* Foreign currency toggle */}
        <div className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">Fund in a different currency</span>
          <Switch checked={foreignCurrency} onChange={setForeignCurrency} ariaLabel="Fund in a different currency" />
        </div>
        {foreignCurrency && (
          <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <CurrencyConverterWidget defaultAmount={Math.round(amount / fees.config.foreignCurrencies[0].xafRate)} />
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-3 leading-relaxed">
              Send enough to cover {fmt(amount)} plus the conversion fee shown above. Your MoMo/Orange Money charge is always confirmed in XAF.
            </p>
          </div>
        )}

        {/* Escrow info */}
        <div className="rounded-xl border p-3" style={{ background: 'var(--status-success-bg)', borderColor: C.forestLight }}>
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] uppercase tracking-widest mb-1">Escrow protection</div>
          <p style={{ fontFamily: FONT.sans, color: 'var(--status-success-text)' }} className="text-xs leading-relaxed">
            This payment goes into a secured escrow account — not to the recipient. Funds are only released once you approve verified milestone evidence.
          </p>
        </div>

        <KycGateBanner amount={amount} />
      </div>

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={() => step === 'select' ? setStep('confirm') : confirmPayment()} fullWidth disabled={kycBlocked || submitting}>
          {submitting ? 'Processing…' : step === 'select' ? `Pay ${fmt(amount)} via ${method === 'momo' ? 'MTN MoMo' : 'Orange Money'}` : 'Confirm payment'}
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Milestone review ───────────────────────────────────────────────────────────
export function MilestoneReviewScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { projects, approveMilestone, devUserId } = useApp()
  const { show: showToast } = useToast()
  const project = projects.find((p) => p.id === id)
    ?? projects.find((p) => p.milestones.some((m) => m.status === 'under_review'))
    ?? projects[0]
  const milestone = project.milestones.find((m) => m.status === 'under_review') ?? project.milestones[0]
  const [decision, setDecision] = useState<'approve' | 'dispute' | null>(null)
  const [approving, setApproving] = useState(false)

  // Real, human, on-site verifier report — not every milestone has one
  // (only ones an admin assigned a verifier to), so the section below only
  // renders when a task actually exists and has a submitted report.
  const { data: verificationTasks = [] } = useVerificationTasksQuery({ targetType: 'milestone', targetId: milestone.id })
  const verifierReport = verificationTasks.find((t) => t.status === 'submitted')

  // The backend is the source of truth for multi-sig: it auto-registers
  // whoever decides as an approver on their first decision and only
  // releases once every required identity (owner + co-signer) has approved
  // — see projectController.decideApproval. This just displays that real
  // state, synthesizing a "pending" row for a required identity that hasn't
  // acted yet so the list isn't empty before anyone has decided.
  const requiresMultiSig = milestone.requiresCosigner || project.requiresMultiSig
  const requiredIdentities = requiresMultiSig
    ? [
        { userId: project.recipientId, userName: project.recipient },
        ...(project.coSignerId ? [{ userId: project.coSignerId, userName: project.coSignerName ?? 'Co-signer' }] : []),
      ]
    : []
  const approvers: Approver[] = requiredIdentities.map((req) => {
    const real = milestone.approvers.find((a) => a.userId === req.userId)
    return { name: req.userId === devUserId ? 'You' : req.userName, status: real?.status === 'approved' ? 'approved' : 'pending' }
  })
  const myApprovalDone = milestone.approvers.find((a) => a.userId === devUserId)?.status === 'approved'

  const { data: videoSessions = [] } = useVideoSessionsQuery(project.id, milestone.id)
  // Most recent non-cancelled session, if any — a milestone can be
  // re-requested after a cancellation.
  const videoCall = videoSessions.find((s) => s.status !== 'cancelled')

  const handleApprove = async () => {
    setApproving(true)
    try {
      const result = await approveMilestone(project.id, milestone.id)
      if (result.releasedEscrow) {
        setDecision('approve')
      } else {
        showToast({ title: 'Your approval is recorded', description: 'Waiting on the other required approver before funds release.', tone: 'success' })
      }
    } catch (err) {
      showToast({ title: 'Approval failed', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setApproving(false)
    }
  }

  if (decision === 'approve') {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.forest }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Milestone approved</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            {fmt(milestone.amount)} has been released from escrow to {project.recipient}. The next milestone is now active.
          </p>
          <PillButton onClick={() => nav(`/funder/project/${project.id}`)} fullWidth>View project</PillButton>
        </div>
      </AppShell>
    )
  }

  if (decision === 'dispute') {
    return <DisputeForm projectId={project.id} milestoneId={milestone.id} onBack={() => setDecision(null)} onDone={() => nav('/home')} />
  }

  return (
    <AppShell noNav>
      <Header title="Milestone Review" subtitle={project.title} back />

      <div className="px-5 py-5 space-y-5 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {/* Milestone info */}
        <div className="rounded-2xl border p-4" style={{ borderColor: C.amber, background: 'var(--status-warning-bg)' }}>
          <div style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="text-[10px] uppercase tracking-widest mb-1">Awaiting your review</div>
          <div style={{ fontFamily: FONT.serif }} className="font-bold">{milestone.title}</div>
          <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs mt-0.5">{fmt(milestone.amount)} to be released upon approval</div>
        </div>

        {/* Multi-signature approval status */}
        {requiresMultiSig && (
          <div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Requires multiple approvers</div>
            <ApprovalStatusList approvers={approvers} />
          </div>
        )}

        {/* Live video verification */}
        {milestone.requiresVideo && (
          <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Live video verification</div>
            {!videoCall ? (
              <>
                <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed mb-3">
                  Want to see the site in real time before deciding? Request a live video call.
                </p>
                <button
                  onClick={() => nav(`/funder/video-verification/${project.id}/${milestone.id}`)}
                  className="inline-flex w-full items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-dashed text-sm font-semibold"
                  style={{ borderColor: 'var(--status-info-text)', color: 'var(--status-info-text)', fontFamily: FONT.sans }}
                >
                  <AppIcon name="video" size={16} /> Request live video check
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--status-info-bg)' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2" y="4" width="10" height="8" rx="1.5" stroke="var(--status-info-text)" strokeWidth="1.3" />
                    <path d="M12 7L16 5V11L12 9" stroke="var(--status-info-text)" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">
                    {videoCall.status === 'scheduled' ? `Call scheduled — ${new Date(videoCall.scheduledFor!).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                      : videoCall.status === 'completed' ? 'Call completed'
                      : 'Call requested'}
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">
                    {videoCall.status === 'scheduled' ? videoCall.meetingUrl : videoCall.status === 'completed' ? 'Verification complete' : 'Awaiting scheduling'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Proof photos */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Submitted photo evidence</div>
          {milestone.evidence.length === 0 ? (
            <div style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs italic">No photo evidence submitted yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {milestone.evidence.map((e, i) => (
                <div key={e.id} className="relative rounded-xl overflow-hidden aspect-video">
                  <img src={e.fileUrl} alt={`Proof ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1" style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.7)' }} className="text-[9px]">Photo {i + 1}</div>
                  </div>
                  {e.duplicateFlag && (
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded" style={{ background: 'var(--status-error-bg)' }}>
                      <div style={{ fontFamily: FONT.mono, color: 'var(--status-error-text)' }} className="text-[8px] font-semibold">Flagged</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Geotag — from whichever evidence entry actually has one */}
        {(() => {
          const withGeotag = milestone.evidence.find((e) => e.geotag)
          if (!withGeotag) return null
          const { lat, lng } = withGeotag.geotag!
          const locationLooksOff = withGeotag.locationMatch === false
          return (
            <div className="rounded-2xl border p-4" style={{ borderColor: locationLooksOff ? 'var(--status-error-bg)' : C.parchmentDark, background: C.white }}>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Geo verification</div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: locationLooksOff ? 'var(--status-error-bg)' : 'var(--status-info-bg)' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2C6.2 2 4 4.2 4 7C4 11 9 16 9 16C9 16 14 11 14 7C14 4.2 11.8 2 9 2Z" stroke={locationLooksOff ? 'var(--status-error-text)' : 'var(--status-info-text)'} strokeWidth="1.3" />
                    <circle cx="9" cy="7" r="2" stroke={locationLooksOff ? 'var(--status-error-text)' : 'var(--status-info-text)'} strokeWidth="1.2" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{locationLooksOff ? "Location doesn't match project site" : 'Location confirmed'}</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs mt-0.5">{lat.toFixed(5)}, {lng.toFixed(5)} — {project.location}</div>
                  {withGeotag.capturedAt && (
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">
                      Submitted: {new Date(withGeotag.capturedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Independent verifier report — only shown when a verifier was actually assigned and has filed a report */}
        {verifierReport && (
          <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Independent verifier report</div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: verifierReport.confirmedMatch === false ? 'var(--status-error-text)' : C.forest }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ fontFamily: FONT.sans, color: verifierReport.confirmedMatch === false ? 'var(--status-error-text)' : C.forest }} className="text-xs font-semibold">
                {verifierReport.confirmedMatch === false ? "Site visit did not confirm the evidence" : 'Site visit confirmed by an independent verifier'}
              </span>
            </div>
            {verifierReport.reportText && (
              <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">"{verifierReport.reportText}"</p>
            )}
          </div>
        )}

        {/* Recipient notes — real text from the submission, when the recipient left any */}
        {milestone.evidence.some((e) => e.notes) && (
          <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-1">Recipient notes</div>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm italic">
              "{milestone.evidence.find((e) => e.notes)?.notes}"
            </p>
          </div>
        )}
      </div>

      <div className="px-5 pb-8 pt-4 border-t space-y-3 backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        {requiresMultiSig && myApprovalDone ? (
          <div className="rounded-xl border p-3 text-center" style={{ background: C.parchment, borderColor: C.parchmentDark }}>
            <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">Your sign-off is recorded — waiting on the other approvers before funds release.</span>
          </div>
        ) : (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="w-full py-4 rounded-xl font-bold text-sm disabled:opacity-60"
            style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
          >
            {approving ? 'Releasing…' : requiresMultiSig ? `Add your approval (${approvers.filter((a) => a.status === 'approved').length}/${approvers.length})` : `Approve — release ${fmt(milestone.amount)}`}
          </button>
        )}
        <button
          onClick={() => setDecision('dispute')}
          className="w-full py-3.5 rounded-xl font-semibold text-sm border"
          style={{ borderColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', background: 'var(--status-error-bg)', fontFamily: FONT.sans }}
        >
          Raise a dispute
        </button>
      </div>
    </AppShell>
  )
}

// ── Live video verification scheduling ─────────────────────────────────────────
export function VideoVerificationScheduleScreen() {
  const nav = useNavigate()
  const { projectId, milestoneId } = useParams()
  const { projects } = useApp()
  const { show: showToast } = useToast()
  const foundProject = projects.find((p) => p.id === projectId)
  if (projectId && !foundProject) {
    return (
      <AppShell noNav>
        <Header title="Video Verification" back />
        <div className="px-5 py-5">
          <EmptyState icon="video" title="Project not found" description="This project may have been removed, or the link is incorrect." />
        </div>
      </AppShell>
    )
  }
  const project = foundProject ?? projects[0]
  const milestone = project.milestones.find((m) => m.id === milestoneId) ?? project.milestones[0]

  const { data: sessions = [], isLoading } = useVideoSessionsQuery(project.id, milestone.id)
  const existing = sessions.find((s) => s.status !== 'cancelled')
  const requestSession = useRequestVideoSessionMutation()
  const scheduleSession = useScheduleVideoSessionMutation()

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const requestedRef = useRef(false)

  useEffect(() => {
    if (!isLoading && !existing && !requestedRef.current) {
      requestedRef.current = true
      requestSession.mutate(
        { projectId: project.id, milestoneId: milestone.id },
        { onError: (err) => showToast({ title: 'Failed to request video check', description: apiErrorMessage(err, 'Please try again'), tone: 'error' }) }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, existing])

  const confirm = async () => {
    if (!date || !time || !meetingUrl || !existing) return
    try {
      await scheduleSession.mutateAsync({
        sessionId: existing.id,
        scheduledFor: new Date(`${date}T${time}`).toISOString(),
        meetingUrl,
      })
    } catch (err) {
      showToast({ title: 'Failed to schedule call', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  if (existing?.status === 'scheduled') {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--status-info-bg)' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="4" y="8" width="20" height="16" rx="2" stroke="var(--status-info-text)" strokeWidth="2" />
              <path d="M24 14L32 10V22L24 18" stroke="var(--status-info-text)" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Call scheduled</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-2">
            A live video verification call for <strong style={{ color: C.ink }}>{milestone.title}</strong> is scheduled for {new Date(existing.scheduledFor!).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
          </p>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs mb-8 break-all">{existing.meetingUrl}</p>
          <PillButton onClick={() => nav(`/funder/review/${project.id}`)} fullWidth>Back to milestone review</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Schedule Live Video Check" subtitle={milestone.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-xl border p-3" style={{ background: 'var(--status-info-bg)', borderColor: 'var(--status-info-text)' }}>
          <p style={{ fontFamily: FONT.sans, color: 'var(--status-info-text)' }} className="text-xs leading-relaxed">
            A live video call lets you walk the site with the recipient in real time — useful for high-value or complex milestones before releasing funds. Coordinate a time with them directly, then record it here along with a meeting link (Meet, Zoom, WhatsApp video, etc.).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
          </div>
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
          </div>
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Meeting link</label>
          <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/..."
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={confirm} fullWidth disabled={!date || !time || !meetingUrl || !existing || scheduleSession.isPending}>
          {scheduleSession.isPending ? 'Scheduling…' : 'Confirm call time'}
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Dispute form (embedded) ────────────────────────────────────────────────────
function DisputeForm({ projectId, milestoneId, onBack, onDone }: { projectId: string; milestoneId: string; onBack: () => void; onDone: () => void }) {
  const { disputeMilestone } = useApp()
  const [type, setType] = useState('')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const types = ['Proof does not match milestone', 'Wrong location / geotag', 'Work appears incomplete', 'Photos appear staged or old', 'Other']

  const { show: showToast } = useToast()
  const submit = async () => {
    try {
      await disputeMilestone(projectId, milestoneId, notes ? `${type}: ${notes}` : type || 'Dispute raised from app')
      setConfirming(false)
      setSubmitted(true)
    } catch (err) {
      setConfirming(false)
      showToast({ title: 'Failed to raise dispute', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  if (submitted) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--status-error-bg)' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 8V20" stroke="var(--status-error-text)" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="18" cy="26" r="2" fill="var(--status-error-text)" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Dispute raised</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            Your dispute has been submitted. Our team will review the evidence and contact both parties within 48 hours. Funds remain in escrow.
          </p>
          <PillButton onClick={onDone} fullWidth>Return to dashboard</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Raise a Dispute" back onBack={onBack} />

      <div className="px-5 py-5 space-y-5 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        <div className="rounded-xl border p-3" style={{ background: 'var(--status-error-bg)', borderColor: 'var(--status-error-bg)' }}>
          <p style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }} className="text-xs leading-relaxed">
            Funds will remain in escrow while the dispute is under review. Our team contacts both parties within 48 hours.
          </p>
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Issue type</label>
          <div className="space-y-2">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all"
                style={{ borderColor: type === t ? 'var(--status-error-text)' : C.parchmentDark, background: type === t ? 'var(--status-error-bg)' : C.white }}
              >
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: type === t ? 'var(--status-error-text)' : C.inkSubtle }}>
                  {type === t && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--status-error-text)' }} />}
                </div>
                <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm">{t}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Your notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
            placeholder="Describe what is wrong with the submitted proof..."
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }} />
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={() => setConfirming(true)} fullWidth disabled={!type}>
          Submit dispute
        </PillButton>
      </div>

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={submit}
        title="Raise this dispute?"
        description="Funds for this milestone stay frozen in escrow while our team reviews the evidence and contacts both parties — this cannot be undone from your side once submitted."
        confirmLabel="Raise dispute"
        danger
      />
    </AppShell>
  )
}

// ── Dispute screen — deep-linkable wrapper ─────────────────────────────────────
export function DisputeScreen() {
  const nav = useNavigate()
  const { id, milestoneId } = useParams()
  const { projects } = useApp()
  const project = projects.find((p) => p.id === id) ?? projects.find((p) => p.milestones.some((m) => m.status === 'under_review')) ?? projects[0]
  const milestone = project.milestones.find((m) => m.id === milestoneId) ?? project.milestones.find((m) => m.status === 'under_review') ?? project.milestones[0]
  return <DisputeForm projectId={project.id} milestoneId={milestone.id} onBack={() => nav(-1)} onDone={() => nav('/home')} />
}

// ── Transaction history ────────────────────────────────────────────────────────
// From a funder's own perspective: 'fund' is money they sent into escrow
// (an outflow), 'release'/'fee_deduction' is money that left escrow for the
// recipient/contractor (also not theirs), 'refund' is money that came back.
const TX_LABEL: Record<Transaction['type'], string> = {
  fund: 'Funds locked in escrow',
  release: 'Milestone released to recipient',
  refund: 'Refunded to you',
  fee_deduction: 'Platform fee',
}
const TX_IS_INFLOW: Record<Transaction['type'], boolean> = {
  fund: false, release: false, refund: true, fee_deduction: false,
}

export function TransactionHistoryScreen() {
  const { data: transactions = [], isLoading } = useTransactionsQuery()
  const total = transactions.reduce((s, t) => s + (TX_IS_INFLOW[t.type] ? t.amount : -t.amount), 0)

  return (
    <AppShell>
      <Header title="Transaction History" back tone="dark" background={C.forest}>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-widest">Net in escrow / invested</div>
          <div style={{ fontFamily: FONT.serif }} className="text-3xl font-bold text-white mt-1">{fmt(Math.abs(total))}</div>
        </div>
      </Header>

      {!isLoading && transactions.length === 0 && (
        <div className="px-5 py-4"><EmptyState icon="wallet" title="No transactions yet" description="Funding, releases, and refunds for your projects will show up here." /></div>
      )}

      <StaggerList className="px-5 py-4 space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
        {transactions.map((tx) => {
          const inflow = TX_IS_INFLOW[tx.type]
          return (
            <StaggerItem key={tx.id}>
              <Card variant="elevated">
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: inflow ? 'var(--status-success-bg)' : 'var(--status-info-bg)' }}>
                    {inflow ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 5L6 5L6 9" stroke="var(--status-success-text)" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M2 5L6 9L14 4" stroke="var(--status-success-text)" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 12V4M5 7L8 4L11 7" stroke="var(--status-info-text)" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{TX_LABEL[tx.type]} — {tx.projectTitle}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">{tx.date}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div style={{ fontFamily: FONT.mono, color: inflow ? 'var(--status-success-text)' : C.forest }} className="text-sm font-bold">
                      {inflow ? '+' : '−'}{fmt(tx.amount)}
                    </div>
                    <StatusBadge status={tx.status} />
                  </div>
                </div>
              </Card>
            </StaggerItem>
          )
        })}
      </StaggerList>
    </AppShell>
  )
}

// ── Contractor directory ─────────────────────────────────────────────────────
// Comparing and awarding *bids on a specific tender* is TenderBidsScreen's
// job (real Bid records, real accept/reject) — this screen is the separate,
// general "browse the contractor marketplace" surface, backed by the real
// /contractor-profiles directory rather than a per-tender bid list.
export function BidComparisonScreen() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useContractorProfilesInfiniteQuery()
  const contractors = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <AppShell noNav>
      <Header title="Browse Contractors" subtitle={`${contractors.length} contractors`} back />

      <div className="px-5 py-4 space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
        {contractors.map((c) => (
          <div
            key={c.id}
            className="w-full rounded-2xl border-2 p-4 text-left transition-all"
            style={{ borderColor: C.parchmentDark, background: C.white, boxShadow: C.shadowSm }}
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ background: C.forest, fontFamily: FONT.serif }}>
                {c.initials}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div style={{ fontFamily: FONT.sans }} className="font-semibold text-sm">{c.name}</div>
                  {c.verified && (
                    <div className="flex items-center gap-1" style={{ color: C.forest }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1L9 3V7L6 9.5L3 7V3L6 1Z" fill={C.forest} />
                        <path d="M4 5.5L5.5 7L8 4.5" stroke="white" strokeWidth="1" strokeLinecap="round" />
                      </svg>
                      <span style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[9px]">Verified</span>
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mt-0.5">{c.trade} · {c.location}</div>
                <Stars rating={c.rating} />
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">{c.jobs} completed jobs</div>
              </div>
            </div>
            <Link
              to={`/contractor/availability/${c.id}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-3 flex items-center gap-1.5 text-xs font-semibold"
              style={{ fontFamily: FONT.sans, color: C.forest }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2" width="9" height="8.5" rx="1" stroke={C.forest} strokeWidth="1.1" /><path d="M1.5 4.5H10.5" stroke={C.forest} strokeWidth="1.1" /></svg>
              View availability calendar →
            </Link>
          </div>
        ))}
      </div>
      {hasNextPage && (
        <div className="px-5 pb-4 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-5 py-2.5 rounded-full text-sm font-semibold border"
            style={{ borderColor: C.parchmentDark, color: C.ink, fontFamily: FONT.sans, opacity: isFetchingNextPage ? 0.6 : 1 }}
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </AppShell>
  )
}

