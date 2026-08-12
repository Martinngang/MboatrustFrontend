import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { useMyCertificationsQuery } from '../api/certifications'
import { C, FONT, AppShell, Card, StatusBadge, PillButton, Header, Stars } from '../components/MobileLayout'
import { ChipGroup } from '../components/Chip'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'
import { EmptyState } from '../components/EmptyState'
import { useRatingsQuery } from '../api/reputation'
import { useTransactionsQuery } from '../api/transactions'
import { useContractsQuery, useCompleteContractMutation, useTerminateContractMutation } from '../api/contracts'
import { useProjectQuery } from '../api/projects'

// ── Browse jobs ────────────────────────────────────────────────────────────────
export function BrowseJobsScreen() {
  const nav = useNavigate()
  const { jobs } = useApp()
  const [filter, setFilter] = useState('All')
  const [sortDesc, setSortDesc] = useState(true)
  const categories = ['All', 'Water & Sanitation', 'Education', 'Healthcare', 'Infrastructure']
  const filtered = (filter === 'All' ? jobs : jobs.filter((j) => j.category === filter))
    .slice()
    .sort((a, b) => sortDesc ? b.budget - a.budget : a.budget - b.budget)

  return (
    <AppShell>
      <Header
        title="Open Jobs"
        subtitle={`${filtered.length} available`}
        back
        action={
          <button onClick={() => nav('/contractor/bids')} style={{ fontFamily: FONT.sans, color: C.forest }} className="whitespace-nowrap text-sm font-semibold">
            My bids →
          </button>
        }
      >
        <div className="flex items-center gap-2 border rounded-xl px-3 py-2.5 mb-4" style={{ borderColor: C.parchmentDark, background: C.cream }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4" stroke={C.inkSubtle} strokeWidth="1.3" />
            <line x1="9" y1="9" x2="12" y2="12" stroke={C.inkSubtle} strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input placeholder="Search jobs, location..." className="flex-1 bg-transparent outline-none text-sm" style={{ fontFamily: FONT.sans, color: C.ink }} />
          <button onClick={() => setSortDesc((d) => !d)} className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ background: C.parchment, color: C.inkMuted, fontFamily: FONT.mono }}>
            Budget {sortDesc ? '↓' : '↑'}
          </button>
        </div>

        <div className="overflow-x-auto pb-1">
          <ChipGroup options={categories} value={filter} onChange={(v) => setFilter(v as string)} />
        </div>
      </Header>

      {filtered.length === 0 ? (
        <div className="px-5 py-4">
          <EmptyState
            icon="search"
            title="No jobs found"
            description="Try a different category, or check back soon for new tenders."
            illustration="tilt"
          />
        </div>
      ) : (
      <StaggerList className="px-5 py-4 space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
        {filtered.map((job) => (
          <StaggerItem key={job.id}>
            <Card variant="interactive" onClick={() => nav(`/contractor/job/${job.id}`)}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{job.title}</div>
                  <span style={{ fontFamily: FONT.mono, color: C.forest, background: 'var(--status-success-bg)' }} className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
                    {job.bids} bids
                  </span>
                </div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-3">{job.location} · {job.category}</div>
                <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed mb-3 line-clamp-2">{job.description}</p>
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: C.parchmentDark }}>
                  <div>
                    <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold">{fmt(job.budget)}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider">Budget</div>
                  </div>
                  <div className="text-right">
                    <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs">{job.milestones} milestones</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px]">Deadline {job.deadline}</div>
                  </div>
                </div>
              </div>
            </Card>
          </StaggerItem>
        ))}
      </StaggerList>
      )}
    </AppShell>
  )
}

// ── Job detail ─────────────────────────────────────────────────────────────────
export function JobDetailScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { jobs } = useApp()
  const job = jobs.find((j) => j.id === id) ?? jobs[0]
  const milestoneItems = [
    { title: 'Site preparation & equipment delivery', amount: Math.round(job.budget * 0.25) },
    { title: 'Primary installation work', amount: Math.round(job.budget * 0.45) },
    { title: 'Testing, commissioning & handover', amount: Math.round(job.budget * 0.30) },
  ].slice(0, job.milestones)

  return (
    <AppShell noNav>
      <Header title="Job Detail" back />

      <div className="px-5 py-5 space-y-5 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {/* Job header */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-1">{job.category} · {job.location}</div>
          <h2 style={{ fontFamily: FONT.serif }} className="text-xl font-bold mb-2">{job.title}</h2>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs">Posted {job.posted}</span>
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs">·</span>
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs">{job.bids} bids so far</span>
          </div>
        </div>

        {/* Budget + deadline */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest mb-1">Total budget</div>
            <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-xl font-bold">{fmt(job.budget)}</div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] mt-0.5">Escrow-protected</div>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest mb-1">Deadline</div>
            <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold">{job.deadline}</div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] mt-0.5">{job.milestones} milestones</div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Description</div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed">{job.description}</p>
        </div>

        {/* Milestone breakdown */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Payment milestones</div>
          <div className="space-y-2">
            {milestoneItems.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border" style={{ borderColor: C.parchmentDark, background: C.white }}>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: C.inkSubtle, fontFamily: FONT.mono }}>{i + 1}</div>
                  <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm">{m.title}</span>
                </div>
                <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs whitespace-nowrap">{fmt(m.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How payment works */}
        <div className="rounded-xl p-4 border" style={{ background: 'var(--status-success-bg)', borderColor: C.forestLight }}>
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] uppercase tracking-widest mb-1">Payment protection</div>
          <p style={{ fontFamily: FONT.sans, color: 'var(--status-success-text)' }} className="text-xs leading-relaxed">
            The full budget is held in escrow before work begins. You get paid for each milestone after submitting photo/video proof and approval. Zero chasing invoices.
          </p>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t space-y-3 sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={() => nav(`/contractor/bid/${job.id}`)} fullWidth>Submit a bid</PillButton>
        <PillButton onClick={() => nav('/funder/contractors')} variant="secondary" fullWidth>Compare with other contractors</PillButton>
      </div>
    </AppShell>
  )
}

// ── Submit bid ─────────────────────────────────────────────────────────────────
export function SubmitBidScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { jobs, addBid } = useApp()
  const { show: showToast } = useToast()
  const job = jobs.find((j) => j.id === id) ?? jobs[0]
  const [form, setForm] = useState({ price: '', timeline: '', materials: '', notes: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    try {
      await addBid({
        jobId: job.id,
        jobTitle: job.title,
        contractorName: 'Fon Ayuk Construction',
        price: Number(form.price) || Math.round(job.budget * 0.9),
        timeline: form.timeline || '6 weeks',
        materials: form.materials,
        notes: form.notes,
        status: 'pending',
        submitted: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      })
      setSubmitted(true)
    } catch (err) {
      showToast({ title: 'Failed to submit bid', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--status-info-bg)' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M10 12H26M10 17H22M10 22H18" stroke="var(--status-info-text)" strokeWidth="2" strokeLinecap="round" />
              <rect x="5" y="5" width="26" height="26" rx="3" stroke="var(--status-info-text)" strokeWidth="1.8" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Bid submitted</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            Your bid for <strong style={{ color: C.ink }}>{job.title}</strong> has been submitted. You will be notified if your bid is shortlisted or awarded.
          </p>
          <div className="w-full rounded-2xl border p-4 mb-6" style={{ borderColor: C.parchmentDark, background: C.parchment }}>
            <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
              <span>Your bid</span><span style={{ color: C.ink, fontWeight: 700 }}>{form.price ? fmt(Number(form.price)) : fmt(Math.round(job.budget * 0.9))}</span>
            </div>
            <div className="flex justify-between text-xs mt-1.5" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
              <span>Timeline</span><span style={{ color: C.ink }}>{form.timeline || '6 weeks'}</span>
            </div>
          </div>
          <PillButton onClick={() => nav('/contractor/bids')} fullWidth>View my bids</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Submit Bid" subtitle={job.title} back />

      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        <div className="rounded-xl border p-3" style={{ background: C.parchment, borderColor: C.parchmentDark }}>
          <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
            <span>Budget</span><span style={{ color: C.ink }}>{fmt(job.budget)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
            <span>Deadline</span><span style={{ color: C.ink }}>{job.deadline}</span>
          </div>
        </div>

        {[
          { key: 'price', label: 'Your quoted price (XAF)', placeholder: 'e.g. 850000', type: 'number' },
          { key: 'timeline', label: 'Proposed timeline', placeholder: 'e.g. 6 weeks', type: 'text' },
          { key: 'materials', label: 'Materials plan', placeholder: 'List key materials and sources...', type: 'textarea' },
          { key: 'notes', label: 'Why you are the right contractor', placeholder: 'Your experience, past similar work, team size...', type: 'textarea' },
        ].map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">{label}</label>
            {type === 'textarea' ? (
              <textarea value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                rows={3} placeholder={placeholder}
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none focus:border-[var(--color-forest)] transition-colors"
                style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
            ) : (
              <input type={type} value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
            )}
          </div>
        ))}

        <Link to="/tools/material-estimator" className="flex items-center gap-2 text-xs font-semibold" style={{ fontFamily: FONT.sans, color: C.forest }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L8.2 5.2H12.5L9 7.7L10.2 12L7 9.3L3.8 12L5 7.7L1.5 5.2H5.8L7 1Z" stroke={C.forest} strokeWidth="1.1" strokeLinejoin="round" /></svg>
          Not sure on pricing? Check the material cost estimator →
        </Link>

        <div className="rounded-xl p-4 border" style={{ background: 'var(--status-warning-bg)', borderColor: 'var(--status-warning-bg)' }}>
          <div style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="text-[10px] uppercase tracking-widest mb-1">Bid terms</div>
          <p style={{ fontFamily: FONT.sans, color: 'var(--status-warning-text)' }} className="text-xs leading-relaxed">
            Submitting a bid commits you to the proposed price and timeline if awarded. Payment is milestone-based via escrow. Platform fee of 3% applies.
          </p>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={submit} fullWidth disabled={!form.price || submitting}>{submitting ? 'Submitting…' : 'Submit bid'}</PillButton>
      </div>
    </AppShell>
  )
}

// ── My bids ────────────────────────────────────────────────────────────────────
export function MyBidsScreen() {
  const nav = useNavigate()
  const { bids, jobs } = useApp()

  const rows = bids.map((b) => ({ id: b.id, jobId: b.jobId, jobTitle: b.jobTitle, price: b.price, status: b.status, submitted: b.submitted }))

  return (
    <AppShell>
      <Header title="My Bids" back />

      {rows.length === 0 ? (
        <div className="px-5 py-4">
          <EmptyState
            icon="clipboard"
            title="No bids yet"
            description="Browse open jobs and submit a bid to see it here."
            action={<PillButton onClick={() => nav('/contractor/jobs')}>Browse jobs</PillButton>}
            illustration="tilt"
          />
        </div>
      ) : (
      <StaggerList className="px-5 py-4 space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
        {rows.map((bid, i) => {
          const job = jobs.find((j) => j.id === bid.jobId)
          return (
            <StaggerItem key={i}>
              <Card variant="interactive" onClick={() => job && nav(`/contractor/job/${job.id}`)}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{bid.jobTitle}</div>
                    <StatusBadge status={bid.status} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-3">{job?.location}</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ fontFamily: FONT.serif, color: C.ink }} className="font-bold">{fmt(bid.price)}</div>
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider">Your bid</div>
                    </div>
                    <div className="text-right">
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs">Submitted {bid.submitted}</div>
                      {bid.status === 'accepted' && (
                        <button onClick={(e) => { e.stopPropagation(); nav(`/contractor/contract/${bid.id}`) }}
                          className="text-xs font-semibold mt-1" style={{ color: C.forest, fontFamily: FONT.sans }}>
                          View contract →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </StaggerItem>
          )
        })}
      </StaggerList>
      )}
    </AppShell>
  )
}

// ── Active contract ────────────────────────────────────────────────────────────
export function ContractDetailScreen() {
  const nav = useNavigate()
  const { bidId } = useParams()
  const { show: showToast } = useToast()
  const { data: contracts, isLoading: contractLoading } = useContractsQuery({ bidId })
  const contract = contracts?.[0]
  const { data: project, isLoading: projectLoading } = useProjectQuery(contract?.projectId)
  const completeContract = useCompleteContractMutation()
  const terminateContract = useTerminateContractMutation()
  const [acting, setActing] = useState<'complete' | 'terminate' | null>(null)

  const act = async (action: 'complete' | 'terminate') => {
    if (!contract) return
    setActing(action)
    try {
      await (action === 'complete' ? completeContract : terminateContract).mutateAsync(contract.id)
      showToast({ title: action === 'complete' ? 'Contract marked completed' : 'Contract terminated', tone: action === 'complete' ? 'success' : 'error' })
    } catch (err) {
      showToast({ title: `Failed to ${action} contract`, description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setActing(null)
    }
  }

  if (contractLoading || projectLoading) {
    return <AppShell><div className="px-5 py-8 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>Loading contract…</div></AppShell>
  }
  if (!contract || !project) {
    return (
      <AppShell>
        <Header title="Contract" back />
        <div className="px-5 py-4"><EmptyState icon="receipt" title="No contract found" description="This bid doesn't have an awarded contract." /></div>
      </AppShell>
    )
  }

  const milestones = project.milestones
  const paid = milestones.filter((m) => m.status === 'released').reduce((s, m) => s + m.amount, 0)
  const underReview = milestones.find((m) => m.status === 'under_review')

  return (
    <AppShell>
      <Header title="Active Contract" subtitle={`Contract ${contract.id.slice(-8).toUpperCase()}`} back tone="dark" background={C.forest}>
        <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold text-white">{project.title}</div>
      </Header>

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Contract value', value: fmt(contract.totalAmount) },
            { label: 'Paid so far', value: fmt(paid) },
          ].map(({ label, value }) => (
            <Card key={label} variant="glass">
              <div className="p-3">
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest mb-0.5">{label}</div>
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold">{value}</div>
              </div>
            </Card>
          ))}
        </div>

        {contract.status !== 'active' && <StatusBadge status={contract.status} />}

        {/* Milestone tracker */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Milestones</div>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={m.id} className="flex items-start gap-3 p-4 rounded-xl border"
                style={{
                  borderColor: m.status === 'under_review' ? C.amber : C.parchmentDark,
                  background: m.status === 'released' ? 'var(--status-success-bg)' : m.status === 'under_review' ? 'var(--status-warning-bg)' : C.white,
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

        {/* CTA for pending milestone */}
        {underReview && (
          <div className="rounded-2xl border-2 p-4" style={{ background: 'var(--status-warning-bg)', borderColor: C.amber }}>
            <div style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="text-[10px] uppercase tracking-widest mb-2">Proof under review</div>
            <p style={{ fontFamily: FONT.sans, color: 'var(--status-warning-text)' }} className="text-xs mb-3">
              Your "{underReview.title}" proof is being reviewed.
            </p>
          </div>
        )}

        {contract.status === 'active' && (
          <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Contract status</div>
            <div className="flex gap-2">
              <button
                onClick={() => act('complete')}
                disabled={acting !== null}
                className="flex-1 py-2.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}
              >
                {acting === 'complete' ? 'Marking…' : 'Mark contract completed'}
              </button>
              <button
                onClick={() => act('terminate')}
                disabled={acting !== null}
                className="flex-1 py-2.5 rounded-lg text-xs font-semibold border disabled:opacity-50"
                style={{ borderColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
              >
                {acting === 'terminate' ? 'Terminating…' : 'Terminate contract'}
              </button>
            </div>
          </div>
        )}

        <PillButton onClick={() => nav(`/recipient/submit/${project.id}`)} fullWidth>Submit next milestone proof</PillButton>
      </div>
    </AppShell>
  )
}

// ── Earnings screen ────────────────────────────────────────────────────────────
export function EarningsScreen() {
  const nav = useNavigate()
  const { data: transactions = [], isLoading } = useTransactionsQuery()
  const earnings = transactions.filter((t) => t.type === 'release')
  const total = earnings.reduce((s, e) => s + e.amount, 0)

  return (
    <AppShell>
      <Header title="Earnings" back tone="dark" background={C.forest}>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-widest">Total earned</div>
          <div style={{ fontFamily: FONT.serif }} className="text-3xl font-bold text-white mt-1">{fmt(total)}</div>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.5)' }} className="text-[10px] mt-1">{earnings.length} milestone payments received</div>
        </div>
      </Header>

      <div className="px-5 py-4 space-y-3 sm:mx-auto sm:max-w-2xl">
        {!isLoading && earnings.length === 0 && (
          <EmptyState icon="wallet" title="No earnings yet" description="Payments for completed milestones will show up here." />
        )}
        <StaggerList className="space-y-3">
          {earnings.map((e) => (
            <StaggerItem key={e.id}>
              <Card variant="elevated">
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--status-success-bg)' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="2" width="12" height="12" rx="1" stroke={C.forest} strokeWidth="1.2" />
                      <path d="M8 5V11M5.5 8H10.5" stroke={C.forest} strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{e.projectTitle}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{e.status} · {e.date}</div>
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-sm font-bold">+{fmt(e.amount)}</div>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>

        <PillButton onClick={() => nav('/recipient/withdrawal')} fullWidth>Withdraw to MoMo / Orange Money</PillButton>
      </div>
    </AppShell>
  )
}

// ── Contractor profile ─────────────────────────────────────────────────────────
export function ContractorProfileScreen() {
  const nav = useNavigate()
  const { name, contractors, devUserId } = useApp()
  const self = contractors.find((c) => c.id === devUserId) ?? contractors[0]
  const { data: liveReviews = [] } = useRatingsQuery({ toUserId: self.id, roleContext: 'contractor' })
  const { data: myCertifications = [] } = useMyCertificationsQuery()

  return (
    <AppShell>
      <Header title="Contractor Profile" back tone="dark" background={C.forest}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ background: 'rgba(255,255,255,0.15)', fontFamily: FONT.serif }}>
            {self.initials}
          </div>
          <div>
            <div style={{ fontFamily: FONT.serif }} className="text-xl font-bold text-white">{name || self.name}</div>
            <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-wider mt-0.5">{self.trade} · {self.location}</div>
          </div>
        </div>
      </Header>

      <div className="px-5 py-5 space-y-4 sm:mx-auto sm:max-w-2xl">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Jobs completed', value: String(self.jobs) },
            { label: 'Rating', value: self.rating.toFixed(1) },
            { label: 'Status', value: self.verified ? 'Verified' : 'Pending' },
          ].map(({ label, value }) => (
            <Card key={label} variant="glass">
              <div className="p-3 text-center">
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">{value}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            </Card>
          ))}
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Client reviews</p>
          <div className="space-y-3">
            {liveReviews.length === 0 && (
              <Card>
                <div className="p-4 text-center">
                  <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">No reviews yet — complete a contract to receive your first rating.</p>
                </div>
              </Card>
            )}
            {liveReviews.map((r) => (
              <Card key={r.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{r.fromName}</div>
                    <Stars rating={r.score} />
                  </div>
                  <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed italic">"{r.comment}"</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Certifications</p>
            <button onClick={() => nav('/contractor/certifications/new')} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold">+ Add</button>
          </div>
          <div className="space-y-2">
            {myCertifications.length === 0 && (
              <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No certifications added yet.</div></Card>
            )}
            {myCertifications.map((c) => (
              <Card key={c.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{c.name}</div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{c.issuer} · {c.dateUploaded}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: 'Edit skills & portfolio', path: '/contractor/onboarding' },
            { label: 'Manage availability calendar', path: '/contractor/availability' },
            { label: 'Material cost estimator', path: '/tools/material-estimator' },
            { label: 'Earnings history', path: '/contractor/earnings' },
          ].map(({ label, path }) => (
            <button key={label} onClick={() => nav(path)}
              className="w-full flex items-center justify-between px-4 py-4 rounded-xl border text-left"
              style={{ background: C.white, borderColor: C.parchmentDark }}>
              <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">{label}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M4 3L9 7L4 11" stroke={C.inkSubtle} strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
