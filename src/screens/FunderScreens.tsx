import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { useApp, fmt, type Milestone, type Project } from '../context'
import { C, FONT, AppShell, Card, StatusBadge, ProgressBar, Stars, PillButton, Header, StepIndicator, MomoOmPicker } from '../components/MobileLayout'
import { ActivityTimeline, type TimelineEvent } from '../components/ActivityTimeline'
import { ApprovalStatusList } from '../components/ApprovalStatusList'
import { CurrencyConverterWidget } from '../components/CurrencyConverterWidget'
import { KycGateBanner, useKycGate } from '../components/KycGateBanner'
import { useVerification, type Approver } from '../verification'
import { useFeeCalculation } from '../feeConfig'

interface DraftMilestone { id: number; title: string; amount: string; description: string; requiresMultiApproval?: boolean }

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
  const { projects } = useApp()
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
      <Header title="Discover Projects" back>
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
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap font-semibold transition-all"
              style={{ fontFamily: FONT.mono, background: filter === c ? C.forest : C.parchment, color: filter === c ? C.white : C.inkMuted }}
            >
              {c}
            </button>
          ))}
        </div>
      </Header>

      <div className="px-5 py-4 space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold mb-1">No projects found</div>
            <div style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">Try a different search term or category.</div>
          </div>
        ) : filtered.map((p) => {
          const pct = Math.round((p.raised / p.totalAmount) * 100)
          return (
            <Card key={p.id} onClick={() => nav(`/funder/project/${p.id}`)}>
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
          )
        })}
      </div>
    </AppShell>
  )
}

// ── Project detail ────────────────────────────────────────────────────────────
export function ProjectDetailScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { projects } = useApp()
  const p = projects.find((x) => x.id === id) ?? projects[0]
  const pct = Math.round((p.raised / p.totalAmount) * 100)

  return (
    <AppShell noNav>
      {/* Hero image */}
      <div className="relative h-52 sm:h-64 lg:h-80">
        <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,27,20,0.8), transparent 50%)' }} />
        <button onClick={() => nav(-1)} className="absolute top-6 left-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
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
                  background: m.status === 'released' ? '#F0FDF4' : m.status === 'under_review' ? '#FFF7E6' : C.white,
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
        <PillButton onClick={() => nav('/messages/c1')} variant="ghost" fullWidth>Message recipient</PillButton>

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
        {p.status === 'active' && (
          <PillButton onClick={() => nav('/funder/fund', { state: { projectId: p.id } })} fullWidth>Add funds to escrow</PillButton>
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
  const anchor = projects.find((p) => p.id === id) ?? projects[0]
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
            <Card key={label}>
              <div className="p-3 text-center">
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold">{value}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            </Card>
          ))}
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Project history</p>
          <div className="space-y-3">
            {recipientProjects.map((p) => (
              <Card key={p.id} onClick={() => nav(`/funder/project/${p.id}`)}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{p.title}</div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{p.location}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <PillButton onClick={() => nav('/funder/rate-recipient')} variant="secondary" fullWidth>Rate this recipient</PillButton>
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
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, category: c })}
                    className="px-3 py-1.5 rounded-full text-xs transition-all"
                    style={{ background: form.category === c ? C.forest : C.parchment, color: form.category === c ? C.white : C.inkMuted, fontFamily: FONT.mono }}>
                    {c}
                  </button>
                ))}
              </div>
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

      <div className="px-5 pb-8 pt-4 border-t" style={{ borderColor: C.parchmentDark, background: C.white }}>
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

  const addMilestone = () => {
    setMilestones((ms) => [...ms, { id: Date.now(), title: '', amount: '', description: '' }])
  }

  const update = (id: number, field: string, val: string) => {
    setMilestones((ms) => ms.map((m) => (m.id === id ? { ...m, [field]: val } : m)))
  }

  const toggleMultiApproval = (id: number) => {
    setMilestones((ms) => ms.map((m) => (m.id === id ? { ...m, requiresMultiApproval: !m.requiresMultiApproval } : m)))
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
        <div className="rounded-2xl border p-4" style={{ background: '#F0FDF4', borderColor: '#86EFAC' }}>
          <p style={{ fontFamily: FONT.sans, color: '#15803D' }} className="text-xs leading-relaxed">
            Each milestone locks a portion of the escrow. Funds for each stage are released only when photo/video proof is submitted and independently verified.
          </p>
        </div>

        {milestones.map((m, i) => (
          <div key={m.id} className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: C.forest, fontFamily: FONT.mono }}>{i + 1}</div>
              {milestones.length > 1 && (
                <button onClick={() => setMilestones((ms) => ms.filter((x) => x.id !== m.id))} style={{ color: '#EF4444', fontFamily: FONT.mono }} className="text-xs">Remove</button>
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
      </div>

      <div className="px-5 pb-8 pt-4 border-t" style={{ borderColor: C.parchmentDark, background: C.white }}>
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
  const { projects, addProject, fundProject } = useApp()
  const { setMultiSigApprovers } = useVerification()
  const fees = useFeeCalculation()
  const state = (location.state as { draft?: DraftProject; projectId?: string } | null) ?? {}
  const draft = state.draft
  const existing = state.projectId ? projects.find((p) => p.id === state.projectId) : undefined
  const fallback = projects[0]

  const [method, setMethod] = useState<'momo' | 'om'>('momo')
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select')
  const [pin, setPin] = useState('')
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [foreignCurrency, setForeignCurrency] = useState(false)

  const amount = draft
    ? (draft.milestones && draft.milestones.length > 0
        ? draft.milestones.reduce((s, m) => s + (Number(m.amount) || 0), 0)
        : draft.totalAmount)
    : existing
      ? Math.max(0, existing.totalAmount - existing.raised)
      : 1400000
  const title = draft?.title ?? existing?.title ?? fallback.title
  const { blocked: kycBlocked } = useKycGate(amount)

  const confirmPayment = () => {
    if (draft) {
      const milestones: Milestone[] = (draft.milestones ?? []).map((m, i) => ({
        id: `m${i + 1}`,
        title: m.title || `Milestone ${i + 1}`,
        amount: Number(m.amount) || 0,
        status: 'pending',
        proof: false,
      }))
      const created = addProject({
        title: draft.title,
        category: draft.category || 'General',
        location: draft.location,
        totalAmount: draft.totalAmount || amount,
        raised: amount,
        status: 'active',
        recipient: 'Awaiting recipient',
        recipientRating: 0,
        milestones,
        image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=220&fit=crop&auto=format',
        description: draft.description,
        daysLeft: 90,
      })
      ;(draft.milestones ?? []).forEach((dm, i) => {
        if (dm.requiresMultiApproval) {
          const defaultApprovers: Approver[] = [
            { name: 'You (Funder)', status: 'pending' },
            { name: 'Community Co-signer', status: 'pending' },
            { name: 'Independent Verifier', status: 'pending' },
          ]
          setMultiSigApprovers(`${created.id}:${milestones[i].id}`, defaultApprovers)
        }
      })
      setCreatedId(created.id)
    } else if (existing) {
      fundProject(existing.id, amount)
    }
    setStep('success')
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
            {fmt(amount)} is now held in escrow for <strong>{title}</strong>.
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
        <label className="flex items-center justify-between rounded-xl border p-3 cursor-pointer" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">Fund in a different currency</span>
          <div
            onClick={() => setForeignCurrency(!foreignCurrency)}
            className={`w-11 h-6 rounded-full transition-all cursor-pointer ${foreignCurrency ? 'bg-[var(--color-forest)]' : 'bg-[var(--color-parchment-dark)]'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow m-0.5 transition-all ${foreignCurrency ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </label>
        {foreignCurrency && (
          <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <CurrencyConverterWidget defaultAmount={Math.round(amount / fees.config.foreignCurrencies[0].xafRate)} />
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-3 leading-relaxed">
              Send enough to cover {fmt(amount)} plus the conversion fee shown above. Your MoMo/Orange Money charge is always confirmed in XAF.
            </p>
          </div>
        )}

        {/* Escrow info */}
        <div className="rounded-xl border p-3" style={{ background: '#F0FDF4', borderColor: '#86EFAC' }}>
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] uppercase tracking-widest mb-1">Escrow protection</div>
          <p style={{ fontFamily: FONT.sans, color: '#15803D' }} className="text-xs leading-relaxed">
            This payment goes into a secured escrow account — not to the recipient. Funds are only released once you approve verified milestone evidence.
          </p>
        </div>

        <KycGateBanner amount={amount} />
      </div>

      <div className="px-5 pb-8 pt-4 border-t" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={() => step === 'select' ? setStep('confirm') : confirmPayment()} fullWidth disabled={kycBlocked}>
          {step === 'select' ? `Pay ${fmt(amount)} via ${method === 'momo' ? 'MTN MoMo' : 'Orange Money'}` : 'Confirm payment'}
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Milestone review ───────────────────────────────────────────────────────────
export function MilestoneReviewScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { projects, approveMilestone } = useApp()
  const { multiSigApprovers, approveAsApprover, videoCallRequests } = useVerification()
  const project = projects.find((p) => p.id === id)
    ?? projects.find((p) => p.milestones.some((m) => m.status === 'under_review'))
    ?? projects[0]
  const milestone = project.milestones.find((m) => m.status === 'under_review') ?? project.milestones[0]
  const [decision, setDecision] = useState<'approve' | 'dispute' | null>(null)

  const sigKey = `${project.id}:${milestone.id}`
  const approvers = multiSigApprovers[sigKey]
  const requiresMultiSig = !!approvers
  const myApprovalDone = approvers?.find((a) => a.name === 'You (Funder)')?.status === 'approved'
  const allApproved = approvers ? approvers.every((a) => a.status === 'approved') : true

  const videoKey = `${project.id}:${milestone.id}`
  const videoCall = videoCallRequests[videoKey]

  const handleApprove = () => {
    if (requiresMultiSig && !allApproved) {
      const updated = approveAsApprover(sigKey, 'You (Funder)')
      if (updated.every((a) => a.status === 'approved')) {
        approveMilestone(project.id, milestone.id)
        setDecision('approve')
      }
      // otherwise stay on screen — the approvers list re-renders with your sign-off recorded
      return
    }
    approveMilestone(project.id, milestone.id)
    setDecision('approve')
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
        <div className="rounded-2xl border p-4" style={{ borderColor: C.amber, background: '#FFF7E6' }}>
          <div style={{ fontFamily: FONT.mono, color: '#92400E' }} className="text-[10px] uppercase tracking-widest mb-1">Awaiting your review</div>
          <div style={{ fontFamily: FONT.serif }} className="font-bold">{milestone.title}</div>
          <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs mt-0.5">{fmt(milestone.amount)} to be released upon approval</div>
        </div>

        {/* Multi-signature approval status */}
        {requiresMultiSig && (
          <div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Requires multiple approvers</div>
            <ApprovalStatusList approvers={approvers!} />
          </div>
        )}

        {/* Live video verification */}
        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Live video verification</div>
          {!videoCall || videoCall.status === 'none' ? (
            <>
              <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed mb-3">
                Want to see the site in real time before deciding? Request a live video call with the recipient.
              </p>
              <button
                onClick={() => nav(`/funder/video-verification/${project.id}/${milestone.id}`)}
                className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-semibold"
                style={{ borderColor: '#3B82F6', color: '#3B82F6', fontFamily: FONT.sans }}
              >
                📹 Request live video check
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="4" width="10" height="8" rx="1.5" stroke="#3B82F6" strokeWidth="1.3" />
                  <path d="M12 7L16 5V11L12 9" stroke="#3B82F6" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">
                  {videoCall.status === 'scheduled' ? `Call scheduled — ${videoCall.scheduledFor}` : 'Call requested'}
                </div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">
                  {videoCall.status === 'scheduled' ? 'Join link will be sent before the call' : 'Waiting for the recipient to confirm a time'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Proof photos */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Submitted photo evidence</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&h=200&fit=crop&auto=format',
              'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=300&h=200&fit=crop&auto=format',
            ].map((src, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-video">
                <img src={src} alt={`Proof ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1" style={{ background: 'rgba(0,0,0,0.6)' }}>
                  <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.7)' }} className="text-[9px]">Photo {i + 1}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geotag */}
        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Geo verification</div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2C6.2 2 4 4.2 4 7C4 11 9 16 9 16C9 16 14 11 14 7C14 4.2 11.8 2 9 2Z" stroke="#3B82F6" strokeWidth="1.3" />
                <circle cx="9" cy="7" r="2" stroke="#3B82F6" strokeWidth="1.2" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">Location confirmed</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs mt-0.5">5°56'42"N 10°9'26"E — {project.location}</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">Submitted: 19 Jul 2025, 14:23 WAT</div>
            </div>
          </div>
        </div>

        {/* Verifier report */}
        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Independent verifier report</div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: C.forest }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold">Site visit confirmed by local agent</span>
          </div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">
            "Work matches submitted photos and site conditions. Milestone criteria satisfied."
          </p>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] mt-2">Agent: Njikam P. · Verified 18 Jul 2025</div>
        </div>

        {/* Recipient notes */}
        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-1">Recipient notes</div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm italic">
            "Work completed on schedule. Ready for the next stage once approved."
          </p>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t space-y-3 sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        {requiresMultiSig && myApprovalDone ? (
          <div className="rounded-xl border p-3 text-center" style={{ background: C.parchment, borderColor: C.parchmentDark }}>
            <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">Your sign-off is recorded — waiting on the other approvers before funds release.</span>
          </div>
        ) : (
          <button
            onClick={handleApprove}
            className="w-full py-4 rounded-xl font-bold text-sm"
            style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}
          >
            {requiresMultiSig ? `✓ Add your approval (${(approvers!.filter((a) => a.status === 'approved').length)}/${approvers!.length})` : `✓ Approve — release ${fmt(milestone.amount)}`}
          </button>
        )}
        <button
          onClick={() => setDecision('dispute')}
          className="w-full py-3.5 rounded-xl font-semibold text-sm border"
          style={{ borderColor: '#FECACA', color: '#DC2626', background: '#FEF2F2', fontFamily: FONT.sans }}
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
  const { videoCallRequests, requestVideoCall, scheduleVideoCall } = useVerification()
  const project = projects.find((p) => p.id === projectId) ?? projects[0]
  const milestone = project.milestones.find((m) => m.id === milestoneId) ?? project.milestones[0]
  const key = `${project.id}:${milestone.id}`
  const existing = videoCallRequests[key]

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [scheduled, setScheduled] = useState(existing?.status === 'scheduled')

  useEffect(() => {
    if (!existing) requestVideoCall(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confirm = () => {
    if (!date || !time) return
    scheduleVideoCall(key, `${date} at ${time}`)
    setScheduled(true)
  }

  if (scheduled) {
    const when = existing?.scheduledFor ?? `${date} at ${time}`
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: '#EFF6FF' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="4" y="8" width="20" height="16" rx="2" stroke="#3B82F6" strokeWidth="2" />
              <path d="M24 14L32 10V22L24 18" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Call scheduled</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            A live video verification call for <strong style={{ color: C.ink }}>{milestone.title}</strong> is scheduled for {when}. You and the recipient will both receive a join link.
          </p>
          <PillButton onClick={() => nav(`/funder/review/${project.id}`)} fullWidth>Back to milestone review</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Schedule Live Video Check" subtitle={milestone.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-xl border p-3" style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}>
          <p style={{ fontFamily: FONT.sans, color: '#1E40AF' }} className="text-xs leading-relaxed">
            A live video call lets you walk the site with the recipient in real time — useful for high-value or complex milestones before releasing funds.
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
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={confirm} fullWidth disabled={!date || !time}>Confirm call time</PillButton>
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
  const types = ['Proof does not match milestone', 'Wrong location / geotag', 'Work appears incomplete', 'Photos appear staged or old', 'Other']

  const submit = () => {
    disputeMilestone(projectId, milestoneId)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: '#FEE2E2' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 8V20" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="18" cy="26" r="2" fill="#DC2626" />
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
        <div className="rounded-xl border p-3" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
          <p style={{ fontFamily: FONT.sans, color: '#991B1B' }} className="text-xs leading-relaxed">
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
                style={{ borderColor: type === t ? '#DC2626' : C.parchmentDark, background: type === t ? '#FEF2F2' : C.white }}
              >
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: type === t ? '#DC2626' : C.inkSubtle }}>
                  {type === t && <div className="w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />}
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

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={submit} fullWidth disabled={!type}>
          Submit dispute
        </PillButton>
      </div>
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
const TRANSACTIONS = [
  { id: 'tx1', type: 'escrow_in', desc: 'Funds locked — Borehole Bamenda', amount: 1400000, date: '19 Jul 2025', ref: 'DL-2025-07-48291', status: 'completed' },
  { id: 'tx2', type: 'milestone_release', desc: 'Milestone 1 released — Site survey', amount: -400000, date: '28 Jun 2025', ref: 'DL-2025-06-31042', status: 'completed' },
  { id: 'tx3', type: 'escrow_in', desc: 'Funds locked — Maroua school roof', amount: 600000, date: '12 May 2025', ref: 'DL-2025-05-19823', status: 'completed' },
  { id: 'tx4', type: 'milestone_release', desc: 'Milestone 2 released — Structural', amount: -800000, date: '30 Apr 2025', ref: 'DL-2025-04-88210', status: 'completed' },
  { id: 'tx5', type: 'escrow_in', desc: 'Funds locked — Maroua school roof', amount: 400000, date: '2 Apr 2025', ref: 'DL-2025-04-11029', status: 'completed' },
]

export function TransactionHistoryScreen() {
  const total = TRANSACTIONS.reduce((s, t) => s + t.amount, 0)

  return (
    <AppShell>
      <Header title="Transaction History" back tone="dark" background={C.forest}>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-widest">Total in escrow / invested</div>
          <div style={{ fontFamily: FONT.serif }} className="text-3xl font-bold text-white mt-1">{fmt(Math.abs(total))}</div>
        </div>
      </Header>

      <div className="px-5 py-4 space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
        {TRANSACTIONS.map((tx) => (
          <Card key={tx.id}>
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: tx.amount > 0 ? '#EFF6FF' : '#F0FDF4' }}>
                {tx.amount > 0 ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 12V4M5 7L8 4L11 7" stroke="#3B82F6" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 5L6 5L6 9" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M2 5L6 9L14 4" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{tx.desc}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">{tx.ref} · {tx.date}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div style={{ fontFamily: FONT.mono, color: tx.amount > 0 ? '#3B82F6' : C.forest }} className="text-sm font-bold">
                  {tx.amount > 0 ? '+' : ''}{fmt(Math.abs(tx.amount))}
                </div>
                <StatusBadge status={tx.status} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  )
}

// ── Contractor comparison (for project owners) ─────────────────────────────────
export function BidComparisonScreen() {
  const nav = useNavigate()
  const { contractors } = useApp()
  const [selected, setSelected] = useState<string | null>(null)
  const [awarded, setAwarded] = useState(false)

  if (awarded) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.amber }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 8L21 15H28L22 19L24 26L18 22L12 26L14 19L8 15H15L18 8Z" stroke={C.forestDark} strokeWidth="2" fill={C.forestDark} />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Contract awarded</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            {contractors.find((c) => c.id === selected)?.name} has been awarded the contract. A digital contract has been generated and sent to both parties.
          </p>
          <PillButton onClick={() => nav('/funder/contract-tracking')} fullWidth>Track this contract</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Compare Bids" subtitle={`${contractors.length} bids received`} back />

      <div className="px-5 py-4 space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
        {contractors.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelected(c.id)}
            className="w-full rounded-2xl border-2 p-4 text-left transition-all cursor-pointer"
            style={{ borderColor: selected === c.id ? C.forest : C.parchmentDark, background: selected === c.id ? '#F0FDF4' : C.white }}
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
            <div className="flex items-center gap-6 mt-3 pt-3 border-t" style={{ borderColor: C.parchmentDark }}>
              <div>
                <div style={{ fontFamily: FONT.serif }} className="font-bold text-base">{c.price}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider">Quoted price</div>
              </div>
              <div>
                <div style={{ fontFamily: FONT.serif }} className="font-bold text-base">{c.timeline}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider">Timeline</div>
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

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={() => setAwarded(true)} fullWidth disabled={!selected}>
          Award contract to selected
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Contract tracking (project-owner view of an awarded contract) ──────────────
export function ContractTrackingScreen() {
  const nav = useNavigate()
  const { jobs } = useApp()
  const job = jobs[0]
  const milestones = [
    { title: 'Site preparation & equipment delivery', amount: 300000, status: 'released' as const },
    { title: 'Primary pump installation', amount: 540000, status: 'under_review' as const },
    { title: 'Testing & commissioning', amount: 360000, status: 'pending' as const },
  ]
  const paid = milestones.filter((m) => m.status === 'released').reduce((s, m) => s + m.amount, 0)

  return (
    <AppShell>
      <Header title="Contract Tracking" subtitle={job.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Contract value', value: fmt(job.budget) },
            { label: 'Paid so far', value: fmt(paid) },
          ].map(({ label, value }) => (
            <Card key={label}>
              <div className="p-3">
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest mb-0.5">{label}</div>
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold">{value}</div>
              </div>
            </Card>
          ))}
        </div>

        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Milestones</div>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl border"
                style={{
                  borderColor: m.status === 'under_review' ? C.amber : C.parchmentDark,
                  background: m.status === 'released' ? '#F0FDF4' : m.status === 'under_review' ? '#FFF7E6' : C.white,
                }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: m.status === 'released' ? C.forest : m.status === 'under_review' ? C.amber : C.parchmentDark }}>
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
                    <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{m.title}</span>
                    <StatusBadge status={m.status} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px] mt-0.5">{fmt(m.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Activity</div>
          <ActivityTimeline events={[
            { id: 'awarded', label: 'Contract awarded', detail: fmt(job.budget), status: 'done' },
            ...milestones.map((m, i): TimelineEvent => ({
              id: `ct-${i}`,
              label: `${m.title}${m.status === 'released' ? ' — released' : m.status === 'under_review' ? ' — submitted for review' : ' — pending'}`,
              detail: fmt(m.amount),
              status: m.status === 'released' ? 'done' : m.status === 'under_review' ? 'current' : 'upcoming',
            })),
          ]} />
        </div>

        {milestones.some((m) => m.status === 'under_review') && (
          <PillButton onClick={() => nav('/funder/review')} fullWidth>Review pending milestone proof</PillButton>
        )}
      </div>
    </AppShell>
  )
}
