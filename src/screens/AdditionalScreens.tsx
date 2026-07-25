import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { C, FONT, AppShell, Card, StatusBadge, PillButton, Header, StepIndicator, DashboardShell, DashboardHero } from '../components/MobileLayout'
import { useVerification, type VerifierTask } from '../verification'
import { useMarketplace } from '../marketplace'
import { useCompliance } from '../compliance'
import { RiskBadge } from '../components/RiskBadge'
import { LandFlagBadge } from '../components/LandFlagBadge'

// ── Contractor onboarding ─────────────────────────────────────────────────────
export function ContractorOnboardingScreen() {
  const nav = useNavigate()
  const { name, addContractor } = useApp()
  const [step, setStep] = useState<'verify' | 'skills' | 'portfolio' | 'done'>('verify')
  const [idUploaded, setIdUploaded] = useState(false)
  const [skills, setSkills] = useState<string[]>([])
  const [portfolioCount, setPortfolioCount] = useState(0)

  const TRADES = ['Civil & Masonry', 'Plumbing & Water', 'Electrical', 'Roofing', 'Carpentry', 'Painting', 'Excavation', 'Solar Installation']
  const STEP_ORDER = ['verify', 'skills', 'portfolio'] as const

  const toggleSkill = (s: string) => {
    setSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  const goBack = () => {
    if (step === 'verify') nav(-1)
    else setStep(step === 'skills' ? 'verify' : 'skills')
  }

  const finish = () => {
    const displayName = name || 'New Contractor'
    addContractor({
      name: displayName,
      trade: skills[0] ?? 'General Contracting',
      location: 'Cameroon',
      rating: 0,
      jobs: 0,
      initials: displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
      verified: false,
      price: '—',
      timeline: '—',
    })
    setStep('done')
  }

  if (step === 'done') {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.forest }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Contractor profile ready</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-2">
            Your profile is under review. Verification typically takes 24–48 hours.
          </p>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            Once verified, you can bid on open jobs and receive escrow-protected payments.
          </p>
          <PillButton onClick={() => nav('/home')} fullWidth>Go to dashboard</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Contractor Setup" back onBack={goBack}>
        <StepIndicator steps={['Verify', 'Skills', 'Portfolio']} current={STEP_ORDER.indexOf(step)} />
      </Header>

      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {step === 'verify' && (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              Upload a valid government ID to verify your identity. This is required before you can bid on jobs.
            </p>
            <button
              onClick={() => setIdUploaded(true)}
              className="w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-3 transition-all"
              style={{ borderColor: idUploaded ? C.forest : C.parchmentDark, background: idUploaded ? '#F0FDF4' : C.white }}
            >
              {idUploaded ? (
                <>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: C.forest }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M4 11L9 16L18 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: FONT.sans, color: C.forest }} className="text-sm font-semibold">ID uploaded</span>
                </>
              ) : (
                <>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect x="4" y="8" width="24" height="16" rx="2" stroke={C.inkSubtle} strokeWidth="1.5" />
                    <circle cx="12" cy="16" r="3" stroke={C.inkSubtle} strokeWidth="1.3" />
                    <line x1="18" y1="13" x2="25" y2="13" stroke={C.inkSubtle} strokeWidth="1.2" />
                    <line x1="18" y1="17" x2="23" y2="17" stroke={C.inkSubtle} strokeWidth="1.2" />
                  </svg>
                  <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">Tap to upload ID document</span>
                  <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">JPG, PNG or PDF</span>
                </>
              )}
            </button>
          </>
        )}

        {step === 'skills' && (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              Select your trades and specializations. This helps project owners find you for relevant jobs.
            </p>
            <div className="flex flex-wrap gap-2">
              {TRADES.map((t) => (
                <button key={t} onClick={() => toggleSkill(t)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold transition-all border-2"
                  style={{ borderColor: skills.includes(t) ? C.forest : C.parchmentDark, background: skills.includes(t) ? '#F0FDF4' : C.white, color: skills.includes(t) ? C.forest : C.inkMuted, fontFamily: FONT.sans }}>
                  {skills.includes(t) ? '✓ ' : ''}{t}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'portfolio' && (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              Upload photos of your past work. A strong portfolio helps you win more bids.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <button key={i} onClick={() => setPortfolioCount((n) => Math.max(n, i + 1))}
                  className="aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center transition-all"
                  style={{ borderColor: portfolioCount > i ? C.forest : C.parchmentDark, background: portfolioCount > i ? '#F0FDF4' : C.white }}>
                  {portfolioCount > i ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="5" width="18" height="14" rx="2" stroke={C.forest} strokeWidth="1.5" />
                      <circle cx="9" cy="11" r="2" stroke={C.forest} strokeWidth="1.2" />
                      <path d="M3 16L8 12L12 15L17 10L21 14" stroke={C.forest} strokeWidth="1.2" />
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 8V16M8 12H16" stroke={C.inkSubtle} strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={() => {
          if (step === 'verify') setStep('skills')
          else if (step === 'skills') setStep('portfolio')
          else finish()
        }} fullWidth disabled={step === 'verify' && !idUploaded}>
          {step === 'portfolio' ? 'Complete setup' : 'Continue'}
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Post a job / tender screen ────────────────────────────────────────────────
export function PostJobScreen() {
  const nav = useNavigate()
  const { addJob } = useApp()
  const [form, setForm] = useState({ title: '', description: '', category: '', budget: '', deadline: '', milestones: '3' })
  const [submitted, setSubmitted] = useState(false)
  const categories = ['Water & Sanitation', 'Education', 'Healthcare', 'Infrastructure', 'Agriculture', 'Housing']

  const canSubmit = form.title.trim() !== '' && form.category !== '' && Number(form.budget) > 0

  const submit = () => {
    addJob({
      title: form.title,
      category: form.category || 'General',
      location: 'Cameroon',
      budget: Number(form.budget) || 0,
      deadline: form.deadline || 'TBD',
      bids: 0,
      milestones: Math.max(1, Number(form.milestones) || 1),
      posted: 'Just now',
      description: form.description,
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: '#EFF6FF' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="6" y="6" width="24" height="24" rx="3" stroke="#3B82F6" strokeWidth="2" />
              <path d="M12 18L16 22L24 14" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Job posted</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            Your job is now visible to verified contractors. You will receive bids within 48 hours.
          </p>
          <PillButton onClick={() => nav('/funder/contractors')} fullWidth>View bids as they come in</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Post a Job" back />

      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Job title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Water pump installation — Ngaoundéré"
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
            rows={4} placeholder="Describe the work needed, requirements, and any specific instructions..."
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none focus:border-[var(--color-forest)] transition-colors"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Budget (XAF)</label>
            <input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}
              placeholder="e.g. 1200000"
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
          </div>
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Deadline</label>
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
          </div>
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Number of milestones</label>
          <input type="number" min={1} max={10} value={form.milestones} onChange={(e) => setForm({ ...form, milestones: e.target.value })}
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
        </div>

        <div className="rounded-xl p-3 border" style={{ background: '#F0FDF4', borderColor: '#86EFAC' }}>
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] uppercase tracking-widest mb-1">Escrow protection</div>
          <p style={{ fontFamily: FONT.sans, color: '#15803D' }} className="text-xs leading-relaxed">
            The full budget is held in escrow before work begins. Contractors are paid per milestone after proof is verified.
          </p>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={submit} fullWidth disabled={!canSubmit}>Publish job</PillButton>
      </div>
    </AppShell>
  )
}

// ── Contract summary (auto-generated digital contract) ────────────────────────
export function ContractSummaryScreen() {
  const nav = useNavigate()
  const { contractors, jobs } = useApp()
  const contractor = contractors[0]
  const job = jobs[0]

  const milestones = [
    { title: 'Site preparation & equipment delivery', amount: Math.round(job.budget * 0.25) },
    { title: 'Primary installation work', amount: Math.round(job.budget * 0.45) },
    { title: 'Testing, commissioning & handover', amount: Math.round(job.budget * 0.30) },
  ]

  return (
    <AppShell noNav>
      <Header title="Contract Summary" back />

      <div className="px-5 py-5 space-y-5 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        <div className="text-center py-4">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em] mb-2">Digital Contract</div>
          <div style={{ fontFamily: FONT.mono, color: C.ink }} className="text-sm font-medium">DL-CTR-2025-0091</div>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Parties</div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: C.forest, fontFamily: FONT.serif }}>E</div>
              <div>
                <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">Emmanuel Njang</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">Project owner / Funder</div>
              </div>
            </div>
            <div className="h-px" style={{ background: C.parchmentDark }} />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: C.steel, fontFamily: FONT.serif }}>{contractor.initials}</div>
              <div>
                <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{contractor.name}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">Contractor</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Scope of work</div>
          <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold mb-1">{job.title}</div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">{job.description}</p>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Payment schedule</div>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: C.parchment }}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: C.forest, fontFamily: FONT.mono }}>{i + 1}</div>
                  <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-xs">{m.title}</span>
                </div>
                <span style={{ fontFamily: FONT.mono, color: C.ink }} className="text-xs font-bold">{fmt(m.amount)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t" style={{ borderColor: C.parchmentDark }}>
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs uppercase tracking-wider">Total contract value</span>
            <span style={{ fontFamily: FONT.serif, color: C.forest }} className="text-lg font-bold">{fmt(job.budget)}</span>
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Terms</div>
          <ul className="space-y-2">
            {[
              'Payment is milestone-based via escrow release',
              'Contractor must submit photo/video proof per milestone',
              'An independent verifier confirms work before funder approval',
              'Disputes are resolved within 48 hours by the platform team',
              'Platform fee of 3% applies on released payments',
              `Deadline: ${job.deadline}`,
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] mt-0.5">●</span>
                <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center py-4">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Both parties have agreed to these terms</div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-1">Signed digitally on Mboa Trust</div>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={() => nav('/contractor/contract')} fullWidth>View active contract</PillButton>
      </div>
    </AppShell>
  )
}

// ── Rate contractor screen ────────────────────────────────────────────────────
export function RateContractorScreen() {
  const nav = useNavigate()
  const { contractors, addRating } = useApp()
  const contractor = contractors[0]
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = () => {
    addRating({ targetType: 'contractor', targetName: contractor.name, rating, comment, from: 'Emmanuel Njang', date: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.amber }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 6L22 14H30L24 19L26 27L18 22L10 27L12 19L6 14H14L18 6Z" fill={C.forestDark} />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Thank you for rating</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            Your review will be visible on {contractor.name}'s profile and helps other project owners.
          </p>
          <PillButton onClick={() => nav('/home')} fullWidth>Return to dashboard</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Rate Contractor" back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3" style={{ background: C.forest, fontFamily: FONT.serif }}>
            {contractor.initials}
          </div>
          <div style={{ fontFamily: FONT.sans }} className="font-semibold">{contractor.name}</div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mt-0.5">{contractor.trade} · {contractor.location}</div>
        </div>

        <div className="text-center">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Your rating</div>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} onClick={() => setRating(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill={(hover || rating) >= i ? C.amber : C.parchmentDark}>
                  <path d="M16 4L19.5 12.2H28L21.2 17.4L23.5 25.8L16 20.8L8.5 25.8L10.8 17.4L4 12.2H12.5L16 4Z" />
                </svg>
              </button>
            ))}
          </div>
          {rating > 0 && (
            <div style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mt-2">
              {rating >= 4 ? 'Excellent contractor!' : rating >= 3 ? 'Good work' : 'Needs improvement'}
            </div>
          )}
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Your review (optional)</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4}
            placeholder="How was the quality of work, communication, and adherence to timeline?"
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={submit} fullWidth disabled={rating === 0}>
          Submit rating
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Land schedule verification visit ──────────────────────────────────────────
export function LandScheduleVisitScreen() {
  const nav = useNavigate()
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [scheduled, setScheduled] = useState(false)

  if (scheduled) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: '#EFF6FF' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="6" y="8" width="24" height="22" rx="2" stroke="#3B82F6" strokeWidth="2" />
              <line x1="6" y1="14" x2="30" y2="14" stroke="#3B82F6" strokeWidth="1.5" />
              <line x1="12" y1="6" x2="12" y2="10" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="24" y1="6" x2="24" y2="10" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Visit scheduled</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            A local verifier will inspect the site on {date || 'the selected date'}. You will receive a verification report within 72 hours of the visit.
          </p>
          <PillButton onClick={() => nav('/land/browse')} fullWidth>Back to listings</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Schedule Verification Visit" back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-xl p-4 border" style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}>
          <div style={{ fontFamily: FONT.mono, color: '#1D4ED8' }} className="text-[10px] uppercase tracking-widest mb-1">What is a verification visit?</div>
          <p style={{ fontFamily: FONT.sans, color: '#1E40AF' }} className="text-xs leading-relaxed">
            A local agent visits the plot to confirm that the site matches the listing, boundaries are correct, and there are no visible disputes or encroachments.
          </p>
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Preferred date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Notes for the verifier (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Any specific concerns or areas to focus on?"
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
        </div>

        <div className="rounded-xl p-3 border" style={{ background: C.parchment, borderColor: C.parchmentDark }}>
          <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
            <span>Verification fee</span><span style={{ color: C.ink }}>XAF 15,000</span>
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
            <span>Report turnaround</span><span style={{ color: C.ink }}>72 hours</span>
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={() => setScheduled(true)} fullWidth disabled={!date}>
          Schedule visit
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Verifier registration / onboarding ─────────────────────────────────────────
export function VerifierRegistrationScreen() {
  const nav = useNavigate()
  const { registerVerifier } = useVerification()
  const [step, setStep] = useState<'info' | 'id'>('info')
  const [form, setForm] = useState({ name: '', phone: '', region: '' })
  const [idUploaded, setIdUploaded] = useState(false)

  const finish = () => {
    registerVerifier({ name: form.name || 'New Verifier', phone: form.phone, region: form.region || 'Cameroon', idUploaded })
    nav('/verifier/dashboard')
  }

  return (
    <AppShell noNav>
      <Header title="Become a Verifier" back>
        <StepIndicator steps={['Profile', 'ID verification']} current={step === 'info' ? 0 : 1} />
      </Header>

      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {step === 'info' ? (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              Verifiers visit project and land sites in person to confirm that submitted evidence matches reality. You'll be assigned tasks near your region.
            </p>
            {[
              { key: 'name', label: 'Full name', placeholder: 'e.g. Njikam Paul' },
              { key: 'phone', label: 'Phone number', placeholder: '+237 6XX XXX XXX' },
              { key: 'region', label: 'Region you cover', placeholder: 'e.g. North West Region' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                  style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
                />
              </div>
            ))}
            <PillButton onClick={() => setStep('id')} fullWidth disabled={!form.name.trim() || !form.phone.trim()}>Next: ID verification</PillButton>
          </>
        ) : (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              Upload a government-issued ID. Verifiers must be identity-verified before receiving assignments.
            </p>
            <button
              onClick={() => setIdUploaded(true)}
              className="w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-3 transition-all"
              style={{ borderColor: idUploaded ? C.forest : C.parchmentDark, background: idUploaded ? '#F0FDF4' : C.white }}
            >
              {idUploaded ? (
                <>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: C.forest }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M4 11L9 16L18 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: FONT.sans, color: C.forest }} className="text-sm font-semibold">ID uploaded</span>
                </>
              ) : (
                <>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect x="4" y="8" width="24" height="16" rx="2" stroke={C.inkSubtle} strokeWidth="1.5" />
                    <circle cx="12" cy="16" r="3" stroke={C.inkSubtle} strokeWidth="1.3" />
                    <line x1="18" y1="13" x2="25" y2="13" stroke={C.inkSubtle} strokeWidth="1.2" />
                    <line x1="18" y1="17" x2="23" y2="17" stroke={C.inkSubtle} strokeWidth="1.2" />
                  </svg>
                  <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">Tap to upload ID document</span>
                  <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">JPG, PNG or PDF</span>
                </>
              )}
            </button>
            <PillButton onClick={finish} fullWidth disabled={!idUploaded}>Complete registration</PillButton>
          </>
        )}
      </div>
    </AppShell>
  )
}

// ── Local verifier / agent dashboard ──────────────────────────────────────────
export function VerifierDashboard() {
  const nav = useNavigate()
  const { verifierTasks, verifierProfile } = useVerification()
  const [view, setView] = useState<'list' | 'map'>('list')

  if (!verifierProfile) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <div className="mb-4 text-4xl">🧭</div>
          <div style={{ fontFamily: FONT.serif }} className="mb-2 text-lg font-bold">Register as a verifier</div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mb-6 max-w-sm text-sm">Complete a short profile to start receiving verification assignments.</p>
          <PillButton onClick={() => nav('/verifier/register')}>Get started</PillButton>
        </div>
      </AppShell>
    )
  }

  const pending = verifierTasks.filter((t) => t.status === 'pending')
  const inProgress = verifierTasks.filter((t) => t.status === 'in_progress')
  const submitted = verifierTasks.filter((t) => t.status === 'submitted')
  const active = [...inProgress, ...pending]
  const mapPins = active.slice(0, 4)
  const pinPositions = [{ x: '30%', y: '35%' }, { x: '58%', y: '55%' }, { x: '40%', y: '72%' }, { x: '72%', y: '32%' }]

  return (
    <AppShell>
      <DashboardShell>
        <DashboardHero
          eyebrow="Local Verifier"
          title={verifierProfile.name}
          background={`linear-gradient(135deg, ${C.moss} 0%, ${C.forest} 100%)`}
          stats={[
            { label: 'Pending', value: String(pending.length) },
            { label: 'In progress', value: String(inProgress.length) },
            { label: 'Rating', value: verifierProfile.rating > 0 ? `${verifierProfile.rating.toFixed(1)} ★` : '—' },
          ]}
          action={
            <button onClick={() => nav('/verifier/profile')} className="rounded-full px-4 py-2.5 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
              View profile →
            </button>
          }
        />

        <div className="mt-6 flex items-center justify-between">
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">Assignments</p>
          <div className="flex overflow-hidden rounded-lg border" style={{ borderColor: C.parchmentDark }}>
            {(['list', 'map'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className="px-3 py-1.5 text-xs font-semibold transition-all"
                style={{ background: view === v ? C.forest : C.white, color: view === v ? C.white : C.inkMuted, fontFamily: FONT.mono }}>
                {v === 'list' ? '☰' : '⊕'} {v}
              </button>
            ))}
          </div>
        </div>

        {view === 'map' ? (
          <div className="relative mt-4 overflow-hidden rounded-2xl" style={{ minHeight: '320px', background: '#E8F0E9' }}>
            <img src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=400&fit=crop&auto=format" alt="Map" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'rgba(15,27,20,0.35)' }} />
            {mapPins.map((t, i) => (
              <button key={t.id} onClick={() => nav(`/verifier/task/${t.id}`)} className="absolute flex flex-col items-center" style={{ left: pinPositions[i].x, top: pinPositions[i].y, transform: 'translate(-50%, -100%)' }}>
                <div className="mb-1 rounded-full px-2 py-1 text-[10px] font-bold" style={{ background: t.status === 'in_progress' ? C.amber : C.forest, color: C.white, fontFamily: FONT.mono }}>
                  {t.type === 'land' ? '🏡' : '🏗️'}
                </div>
                <div className="h-2 w-2 rounded-full" style={{ background: t.status === 'in_progress' ? C.amber : C.forest }} />
              </button>
            ))}
            {mapPins.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span style={{ fontFamily: FONT.sans, color: 'white' }} className="text-sm">No active assignments to show on the map.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div>
                <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Active assignments</p>
                <div className="space-y-3">
                  {active.length === 0 && <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No assignments right now.</div></Card>}
                  {active.map((t) => <VerifierTaskCard key={t.id} task={t} onOpen={() => nav(`/verifier/task/${t.id}`)} />)}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Submitted</p>
                <div className="space-y-3">
                  {submitted.map((t) => <VerifierTaskCard key={t.id} task={t} onOpen={() => nav(`/verifier/task/${t.id}`)} muted />)}
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardShell>
    </AppShell>
  )
}

function VerifierTaskCard({ task, onOpen, muted }: { task: VerifierTask; onOpen: () => void; muted?: boolean }) {
  return (
    <Card onClick={onOpen} className={muted ? 'opacity-70' : ''}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{task.projectTitle}</div>
          <StatusBadge status={task.status} />
        </div>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-2">
          {task.type === 'land' ? 'Land site inspection' : `Milestone · ${task.milestoneTitle}`} · {task.location}
        </div>
        <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px]">Due: {task.dueDate}</div>
      </div>
    </Card>
  )
}

// ── Verifier task detail ────────────────────────────────────────────────────────
export function VerifierTaskDetailScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { verifierTasks, startTask } = useVerification()
  const task = verifierTasks.find((t) => t.id === id) ?? verifierTasks[0]

  const checklist = task.type === 'land'
    ? ['Plot boundaries match the survey plan', 'No visible encroachments or disputes', 'Access road and neighbouring plots confirmed']
    : ['Work matches the submitted photo/video proof', 'Location GPS confirmed on-site', 'Materials and quality are adequate']

  const begin = () => {
    startTask(task.id)
    nav(`/verifier/report/${task.id}`)
  }

  return (
    <AppShell noNav>
      <Header title="Verification Task" subtitle={task.projectTitle} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-1">
                {task.type === 'land' ? 'Land site inspection' : 'Milestone verification'}
              </div>
              <div style={{ fontFamily: FONT.serif }} className="font-bold">{task.projectTitle}</div>
              {task.milestoneTitle && <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs mt-0.5">{task.milestoneTitle}</div>}
            </div>
            <StatusBadge status={task.status} />
          </div>
          <div className="mt-3 flex justify-between border-t pt-3" style={{ borderColor: C.parchmentDark }}>
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs">{task.location}</span>
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs">Due {task.dueDate}</span>
          </div>
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">What to check on site</p>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item} className="flex items-start gap-2.5 rounded-xl border p-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0">
                  <circle cx="7" cy="7" r="6" stroke={C.forest} strokeWidth="1.2" />
                </svg>
                <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {task.report && (
          <div className="rounded-xl border p-4" style={{ background: '#F0FDF4', borderColor: '#86EFAC' }}>
            <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] uppercase tracking-widest mb-1">Already submitted</div>
            <p style={{ fontFamily: FONT.sans, color: '#15803D' }} className="text-xs leading-relaxed">{task.report.notes}</p>
          </div>
        )}
      </div>

      {task.status !== 'submitted' && (
        <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <PillButton onClick={begin} fullWidth>{task.status === 'in_progress' ? 'Continue verification' : 'Start verification'}</PillButton>
        </div>
      )}
    </AppShell>
  )
}

// ── Verifier report submission ────────────────────────────────────────────────
const VERIFIER_SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&h=200&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=300&h=200&fit=crop&auto=format',
]

export function VerifierReportScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { verifierTasks, submitTaskReport } = useVerification()
  const task = verifierTasks.find((t) => t.id === id) ?? verifierTasks.find((t) => t.status !== 'submitted') ?? verifierTasks[0]

  const [photos, setPhotos] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [decision, setDecision] = useState<'match' | 'mismatch' | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const addPhoto = () => {
    const next = VERIFIER_SAMPLE_PHOTOS[photos.length % VERIFIER_SAMPLE_PHOTOS.length]
    setPhotos((p) => (p.includes(next) ? [...p, `${next}&v=${p.length}`] : [...p, next]))
  }

  const submit = () => {
    if (!decision) return
    submitTaskReport(task.id, { match: decision === 'match', notes, photos: photos.length })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: decision === 'match' ? C.forest : '#DC2626' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              {decision === 'match' ? (
                <path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              ) : (
                <path d="M12 12L24 24M24 12L12 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              )}
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Report submitted</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            {decision === 'match'
              ? 'Your verification confirms the evidence matches what you observed on site. The funder will receive it for review.'
              : 'Your report flags a mismatch. This will be surfaced to the funder and platform team for review.'}
          </p>
          <PillButton onClick={() => nav('/verifier/dashboard')} fullWidth>Back to dashboard</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Verification Report" subtitle={task.projectTitle} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-1">Assignment</div>
          <div style={{ fontFamily: FONT.sans }} className="font-semibold">{task.projectTitle}</div>
          {task.milestoneTitle && <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs mt-0.5">{task.milestoneTitle}</div>}
        </div>

        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">On-site photo evidence</div>
          {photos.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {photos.map((src, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-video">
                    <img src={src} alt={`Site photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="white" strokeWidth="1.3" /></svg>
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addPhoto} className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium" style={{ borderColor: C.forest, color: C.forest, fontFamily: FONT.sans }}>
                + Add another photo
              </button>
            </div>
          ) : (
            <button onClick={addPhoto} className="w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-3 transition-all active:scale-95" style={{ borderColor: C.parchmentDark, background: C.white }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.parchment }}>
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <rect x="2" y="6" width="22" height="16" rx="2" stroke={C.inkSubtle} strokeWidth="1.4" />
                  <circle cx="13" cy="14" r="4" stroke={C.inkSubtle} strokeWidth="1.3" />
                  <path d="M8 6V4C8 3.4 8.4 3 9 3H17C17.6 3 18 3.4 18 4V6" stroke={C.inkSubtle} strokeWidth="1.3" />
                </svg>
              </div>
              <div className="text-center">
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">Take photo on site</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5 uppercase tracking-wider">Min. 1 photo required</div>
              </div>
            </button>
          )}
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Your assessment</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDecision('match')}
              className="py-4 rounded-xl border-2 text-sm font-bold transition-all"
              style={{ borderColor: decision === 'match' ? C.forest : C.parchmentDark, background: decision === 'match' ? '#F0FDF4' : C.white, color: decision === 'match' ? C.forest : C.inkMuted, fontFamily: FONT.sans }}
            >
              ✓ Confirms match
            </button>
            <button
              onClick={() => setDecision('mismatch')}
              className="py-4 rounded-xl border-2 text-sm font-bold transition-all"
              style={{ borderColor: decision === 'mismatch' ? '#DC2626' : C.parchmentDark, background: decision === 'mismatch' ? '#FEF2F2' : C.white, color: decision === 'mismatch' ? '#DC2626' : C.inkMuted, fontFamily: FONT.sans }}
            >
              ⚑ Flag mismatch
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Detailed report</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5}
            placeholder="Describe what you observed on site — boundary markers, access, condition of work, any concerns..."
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={submit} fullWidth disabled={!decision || photos.length === 0}>Submit verification report</PillButton>
      </div>
    </AppShell>
  )
}

// ── Verifier profile / reputation ──────────────────────────────────────────────
export function VerifierProfileScreen() {
  const { verifierProfile, verifierTasks } = useVerification()
  const submittedTasks = verifierTasks.filter((t) => t.status === 'submitted')

  if (!verifierProfile) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">You haven't registered as a verifier yet.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="Verifier Profile" back tone="dark" background={C.forest}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: 'rgba(255,255,255,0.15)', fontFamily: FONT.serif }}>
            {verifierProfile.name[0]}
          </div>
          <div>
            <div style={{ fontFamily: FONT.serif }} className="text-xl font-bold text-white">{verifierProfile.name}</div>
            <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-wider mt-0.5">{verifierProfile.region}</div>
          </div>
        </div>
      </Header>

      <div className="px-5 py-5 space-y-4 sm:mx-auto sm:max-w-2xl">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Completed', value: String(verifierProfile.completedTasks) },
            { label: 'Rating', value: verifierProfile.rating > 0 ? verifierProfile.rating.toFixed(1) : '—' },
            { label: 'ID status', value: verifierProfile.idUploaded ? 'Verified' : 'Pending' },
          ].map(({ label, value }) => (
            <Card key={label}>
              <div className="p-3 text-center">
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">{value}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            </Card>
          ))}
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Recent reports</p>
          <div className="space-y-3">
            {submittedTasks.length === 0 && (
              <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No reports submitted yet.</div></Card>
            )}
            {submittedTasks.map((t) => (
              <Card key={t.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{t.projectTitle}</div>
                    <StatusBadge status={t.report?.match ? 'approved' : 'flagged'} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">
                    {t.milestoneTitle ?? 'Land inspection'} · {t.report?.submittedAt}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// ── Admin panel ───────────────────────────────────────────────────────────────
export function AdminPanelScreen() {
  const nav = useNavigate()
  const { contractors } = useApp()
  const { certifications, decideCertification } = useMarketplace()
  const { kycCases, decideKyc } = useCompliance()
  const [tab, setTab] = useState<'overview' | 'verifications' | 'disputes' | 'users'>('overview')
  const pendingCertifications = certifications.filter((c) => c.status === 'pending')
  const pendingKyc = kycCases.filter((k) => k.status === 'pending')

  const stats = [
    { label: 'Total users', value: '2,847', change: '+12%' },
    { label: 'Active projects', value: '186', change: '+8%' },
    { label: 'Escrow held', value: 'XAF 42M', change: '+15%' },
    { label: 'Disputes open', value: '7', change: '-2' },
  ]

  const [pendingVerifications, setPendingVerifications] = useState([
    { type: 'User ID', name: 'Roland Mbongo', date: '20 Jul 2025', status: 'pending' as 'pending' | 'approved' | 'rejected' },
    { type: 'Land docs', name: 'Bonabéri Plot 500m²', date: '19 Jul 2025', status: 'pending' as 'pending' | 'approved' | 'rejected' },
    { type: 'User ID', name: 'Germaine Fotso', date: '19 Jul 2025', status: 'pending' as 'pending' | 'approved' | 'rejected' },
  ])

  const decide = (name: string, status: 'approved' | 'rejected') => {
    setPendingVerifications((vs) => vs.map((v) => v.name === name ? { ...v, status } : v))
  }

  const disputes = [
    { project: 'Borehole — Bamenda North', issue: 'Proof does not match', status: 'pending', date: '18 Jul 2025' },
    { project: 'Clinic renovation — Limbe', issue: 'Incomplete work', status: 'in_review', date: '15 Jul 2025' },
  ]

  const openVerifications = pendingVerifications.filter((v) => v.status === 'pending')

  return (
    <AppShell>
      <Header title="Admin Panel" back>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['overview', 'verifications', 'disputes', 'users'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap font-semibold transition-all capitalize"
              style={{ fontFamily: FONT.mono, background: tab === t ? C.forest : C.parchment, color: tab === t ? C.white : C.inkMuted }}>
              {t}
            </button>
          ))}
        </div>
      </Header>

      <div className="px-5 py-4 sm:mx-auto sm:max-w-3xl">
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ label, value, change }) => (
                <Card key={label}>
                  <div className="p-3">
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest">{label}</div>
                    <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-xl font-bold mt-1">{value}</div>
                    <div style={{ fontFamily: FONT.mono, color: change.startsWith('+') ? C.forest : '#DC2626' }} className="text-[10px] mt-0.5">{change} this month</div>
                  </div>
                </Card>
              ))}
            </div>

            <Card onClick={() => nav('/admin/fraud-analytics')}>
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#FEE2E2' }}>
                  <span className="text-lg">⚠️</span>
                </div>
                <div className="flex-1">
                  <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">Fraud & dispute analytics</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">Flagged patterns across the platform</div>
                </div>
                <span style={{ color: C.inkSubtle }}>→</span>
              </div>
            </Card>

            <div>
              <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Recent activity</p>
              {[
                { icon: '✅', text: 'Milestone 2 released — Borehole Bamenda', time: '2h ago' },
                { icon: '📋', text: 'New bid received — Ngaoundéré pump', time: '5h ago' },
                { icon: '🔒', text: 'XAF 1.2M escrowed — Clinic Limbe', time: '1 day ago' },
                { icon: '👤', text: 'New user registered — Roland Mbongo', time: '1 day ago' },
                { icon: '🏡', text: 'Land listing submitted — Bonabéri', time: '2 days ago' },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b last:border-0" style={{ borderColor: C.parchmentDark }}>
                  <span className="text-lg">{a.icon}</span>
                  <div className="flex-1">
                    <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-xs">{a.text}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'verifications' && (
          <div className="space-y-3">
            <div className="rounded-xl p-3 border" style={{ background: '#FFF7E6', borderColor: '#F5DCA0' }}>
              <div style={{ fontFamily: FONT.mono, color: '#92400E' }} className="text-[10px] uppercase tracking-widest">{openVerifications.length + pendingCertifications.length + pendingKyc.length} pending verifications</div>
            </div>
            {pendingKyc.map((k) => (
              <Card key={k.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div style={{ fontFamily: FONT.sans }} className="font-semibold text-sm">{k.userName}</div>
                    <StatusBadge status="pending" />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">KYC / ID verification · Submitted {k.submittedDate}</div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => decideKyc(k.id, 'verified')} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}>Approve</button>
                    <button onClick={() => decideKyc(k.id, 'rejected', 'ID document did not pass review.')} className="px-3 py-1.5 rounded-lg text-xs font-semibold border" style={{ borderColor: '#FECACA', color: '#DC2626', fontFamily: FONT.sans }}>Reject</button>
                  </div>
                </div>
              </Card>
            ))}
            {pendingVerifications.map((v, i) => (
              <Card key={i}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div style={{ fontFamily: FONT.sans }} className="font-semibold text-sm">{v.name}</div>
                    <StatusBadge status={v.status === 'pending' ? 'pending' : v.status === 'approved' ? 'verified' : 'rejected'} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{v.type} · Submitted {v.date}</div>
                  {v.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => decide(v.name, 'approved')} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}>Approve</button>
                      <button onClick={() => decide(v.name, 'rejected')} className="px-3 py-1.5 rounded-lg text-xs font-semibold border" style={{ borderColor: '#FECACA', color: '#DC2626', fontFamily: FONT.sans }}>Reject</button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {certifications.map((c) => (
              <Card key={c.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div style={{ fontFamily: FONT.sans }} className="font-semibold text-sm">{c.name}</div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">Contractor certification · {c.issuer} · Submitted {c.dateUploaded}</div>
                  {c.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => decideCertification(c.id, 'verified')} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}>Approve</button>
                      <button onClick={() => decideCertification(c.id, 'rejected')} className="px-3 py-1.5 rounded-lg text-xs font-semibold border" style={{ borderColor: '#FECACA', color: '#DC2626', fontFamily: FONT.sans }}>Reject</button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === 'disputes' && (
          <div className="space-y-3">
            {disputes.map((d, i) => (
              <Card key={i}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div style={{ fontFamily: FONT.sans }} className="font-semibold text-sm">{d.project}</div>
                    <StatusBadge status={d.status === 'pending' ? 'pending' : 'under_review'} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-2">{d.issue} · {d.date}</div>
                </div>
              </Card>
            ))}
            {disputes.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">✅</div>
                <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold">No open disputes</div>
              </div>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-3">
            {contractors.map((c) => (
              <Card key={c.id}>
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: C.forest, fontFamily: FONT.serif }}>{c.initials}</div>
                  <div className="flex-1">
                    <div style={{ fontFamily: FONT.sans }} className="font-semibold text-sm">{c.name}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{c.trade} · {c.location}</div>
                  </div>
                  <StatusBadge status={c.verified ? 'verified' : 'unverified'} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

// ── Dispute resolution / support screen ───────────────────────────────────────
export function DisputeResolutionScreen() {
  const [disputes, setDisputes] = useState([
    { id: 'd1', project: 'Borehole — Bamenda North', funder: 'Marie-Claire N.', recipient: 'Emmanuel Njang', issue: 'Proof does not match milestone', status: 'open', date: '18 Jul 2025', funds: 1400000 },
    { id: 'd2', project: 'Clinic renovation — Limbe', funder: 'Théodore K.', recipient: 'Dr. Ngole Mbah', issue: 'Work appears incomplete', status: 'in_review', date: '15 Jul 2025', funds: 2000000 },
  ])
  const [contacted, setContacted] = useState<string[]>([])

  const resolve = (id: string) => setDisputes((ds) => ds.filter((d) => d.id !== id))
  const contact = (id: string) => setContacted((c) => [...c, id])

  return (
    <AppShell>
      <Header title="Dispute Resolution" subtitle={`${disputes.length} active disputes`} back />

      <div className="px-5 py-4 space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 sm:mx-auto sm:max-w-4xl">
        {disputes.map((d) => (
          <Card key={d.id}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{d.project}</div>
                <StatusBadge status={d.status === 'open' ? 'pending' : 'under_review'} />
              </div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-3">{d.issue}</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
                  <span>Funder</span><span style={{ color: C.ink }}>{d.funder}</span>
                </div>
                <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
                  <span>Recipient</span><span style={{ color: C.ink }}>{d.recipient}</span>
                </div>
                <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
                  <span>Funds in escrow</span><span style={{ color: C.ink }}>{fmt(d.funds)}</span>
                </div>
                <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
                  <span>Filed</span><span style={{ color: C.ink }}>{d.date}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: C.parchmentDark }}>
                <button onClick={() => resolve(d.id)} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}>Resolve</button>
                <button onClick={() => contact(d.id)} disabled={contacted.includes(d.id)} className="flex-1 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50" style={{ borderColor: C.parchmentDark, color: C.inkMuted, fontFamily: FONT.sans }}>
                  {contacted.includes(d.id) ? 'Contacted ✓' : 'Contact parties'}
                </button>
              </div>
            </div>
          </Card>
        ))}
        {disputes.length === 0 && (
          <div className="col-span-full text-center py-16">
            <div className="text-4xl mb-4">✅</div>
            <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold">No open disputes</div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

// ── Admin fraud & dispute analytics ─────────────────────────────────────────────
interface FlaggedCase {
  label: string
  sub: string
  onOpen?: () => void
  compactBadge?: ReactNode
}

interface FlaggedPattern {
  id: string
  icon: string
  title: string
  description: string
  cases: FlaggedCase[]
}

export function AdminFraudAnalyticsScreen() {
  const nav = useNavigate()
  const { landListings, projects } = useApp()
  const { evidenceMeta, disputeHistory } = useVerification()
  const { kycCases } = useCompliance()
  const [activePatternId, setActivePatternId] = useState<string | null>(null)

  const duplicateListings = landListings.filter((l) => l.duplicateOfListingId)
  const disputedListings = landListings.filter((l) => l.disputed)
  const flaggedEvidence = Object.entries(evidenceMeta).filter(([, m]) => m.flagged)
  const openDisputes = disputeHistory.filter((d) => d.outcome === 'Open')
  const kycIssues = kycCases.filter((k) => k.status === 'rejected' || k.status === 'pending')

  const patterns: FlaggedPattern[] = [
    {
      id: 'duplicate-land', icon: '🏡', title: 'Duplicate land listings',
      description: 'Listings that closely match another listing already on the platform.',
      cases: duplicateListings.map((l) => ({
        label: l.title, sub: `Matches ${landListings.find((o) => o.id === l.duplicateOfListingId)?.title ?? 'another listing'}`,
        onOpen: () => nav(`/land/listing/${l.id}`), compactBadge: <LandFlagBadge listing={l} compact />,
      })),
    },
    {
      id: 'disputed-land', icon: '⚖️', title: 'Disputed land listings',
      description: 'Listings under an active ownership or boundary dispute.',
      cases: disputedListings.map((l) => ({
        label: l.title, sub: l.disputeReason ?? 'Disputed ownership claim',
        onOpen: () => nav(`/land/listing/${l.id}`), compactBadge: <LandFlagBadge listing={l} compact />,
      })),
    },
    {
      id: 'evidence', icon: '📸', title: 'Evidence integrity flags',
      description: 'Submitted proof photos flagged for GPS, timestamp, or duplicate-image mismatches.',
      cases: flaggedEvidence.map(([key, m]) => {
        const [projectId] = key.split(':')
        const project = projects.find((p) => p.id === projectId)
        return { label: project?.title ?? key, sub: m.flagReason ?? 'Evidence flagged for review', onOpen: () => nav(`/funder/project/${projectId}`) }
      }),
    },
    {
      id: 'disputes', icon: '🚩', title: 'Open milestone disputes',
      description: 'Funder-raised disputes awaiting platform resolution.',
      cases: openDisputes.map((d) => ({ label: d.project, sub: `${d.issue} — raised by ${d.raisedBy}`, onOpen: () => nav('/admin/disputes') })),
    },
    {
      id: 'kyc', icon: '🪪', title: 'Identity verification issues',
      description: 'Users with a rejected or unresolved KYC/AML submission.',
      cases: kycIssues.map((k) => ({ label: k.userName, sub: k.status === 'rejected' ? (k.rejectionReason ?? 'Rejected') : `Pending review · Submitted ${k.submittedDate}` })),
    },
  ]

  const activePattern = patterns.find((p) => p.id === activePatternId) ?? null

  return (
    <AppShell>
      <Header title="Fraud & Dispute Analytics" subtitle="Flagged patterns across the platform" back />

      <div className="px-5 py-5 space-y-3 sm:mx-auto sm:max-w-3xl">
        <div className="grid gap-3 sm:grid-cols-2">
          {patterns.map((p) => (
            <Card key={p.id} onClick={() => setActivePatternId(activePatternId === p.id ? null : p.id)} className={activePatternId === p.id ? 'ring-2' : ''}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xl">{p.icon}</span>
                  <RiskBadge level={p.cases.length > 0 ? 'flagged' : 'good_standing'} />
                </div>
                <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{p.title}</div>
                <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-1 leading-relaxed">{p.description}</p>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mt-3">{p.cases.length} flagged case{p.cases.length === 1 ? '' : 's'}</div>
              </div>
            </Card>
          ))}
        </div>

        {activePattern && (
          <div className="pt-2">
            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">{activePattern.title} — case detail</p>
            <div className="space-y-2">
              {activePattern.cases.length === 0 && (
                <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No flagged cases in this category right now.</div></Card>
              )}
              {activePattern.cases.map((c, i) => (
                <Card key={i} onClick={c.onOpen}>
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold truncate">{c.label}</div>
                      <div style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-0.5 leading-relaxed">{c.sub}</div>
                    </div>
                    {c.compactBadge}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
