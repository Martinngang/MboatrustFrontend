import { useState, type ReactNode } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { C, FONT, AppShell, Card, StatusBadge, PillButton, Header, StepIndicator, DashboardShell, DashboardHero } from '../components/MobileLayout'
import { useVerification, type VerifierTask } from '../verification'
import { RiskBadge } from '../components/RiskBadge'
import { LandFlagBadge } from '../components/LandFlagBadge'
import { ChipGroup } from '../components/Chip'
import { Tabs } from '../components/Tabs'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'
import { api, apiErrorMessage } from '../api/client'
import { useUpsertMyContractorProfileMutation } from '../api/contractors'
import { useBidsQuery } from '../api/tenders'
import { useCreateRatingMutation, useRatingSummaryQuery } from '../api/reputation'
import { useAllCertificationsQuery, useDecideCertificationMutation } from '../api/certifications'
import { useVerifierApplicationsQuery, useDecideVerifierApplicationMutation } from '../api/verifierProfiles'
import { useContractsQuery, useCompleteContractMutation, useTerminateContractMutation } from '../api/contracts'
import { useProjectQuery } from '../api/projects'
import { useVisitRequestsQuery, useRequestVisitMutation, useConfirmVisitMutation, useCancelVisitMutation } from '../api/landVisits'
import { useDisputesQuery, useResolveDisputeMutation, useRiskFlagsQuery, useRiskFlagSummaryQuery, type BackendDispute, useVerificationTasksQuery, useStartVerificationTaskMutation, useSubmitVerificationReportMutation, type BackendVerificationTask } from '../api/reputation'
import { usePlatformStatsQuery, useAdminUsersQuery, useDeactivateUserMutation, useReactivateUserMutation } from '../api/admin'
import { AppIcon, type IconName } from '../components/icons'
import { EmptyState } from '../components/EmptyState'

function mapVerificationTask(t: BackendVerificationTask): VerifierTask {
  return {
    id: t._id,
    type: t.targetType === 'land_listing' ? 'land' : 'milestone',
    projectId: t.target?.projectId ?? t.targetId,
    projectTitle: t.target?.title ?? 'Assignment',
    milestoneTitle: t.target?.milestoneTitle,
    location: t.target?.location ?? 'Unknown location',
    // No due-date field on VerificationTask — shows when it was assigned
    // rather than fabricating a deadline the backend doesn't track.
    dueDate: `Assigned ${new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
    status: t.status === 'assigned' ? 'pending' : t.status,
    report: t.confirmedMatch !== null ? { match: !!t.confirmedMatch, notes: t.reportText, photos: t.reportPhotos.length, submittedAt: '' } : undefined,
  }
}

// ── Contractor onboarding ─────────────────────────────────────────────────────
export function ContractorOnboardingScreen() {
  const nav = useNavigate()
  const { show: showToast } = useToast()
  const upsertProfile = useUpsertMyContractorProfileMutation()
  const [step, setStep] = useState<'verify' | 'skills' | 'portfolio' | 'done'>('verify')
  const [idUploaded, setIdUploaded] = useState(false)
  const [skills, setSkills] = useState<string[]>([])
  const [portfolioCount, setPortfolioCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const TRADES = ['Civil & Masonry', 'Plumbing & Water', 'Electrical', 'Roofing', 'Carpentry', 'Painting', 'Excavation', 'Solar Installation']
  const STEP_ORDER = ['verify', 'skills', 'portfolio'] as const

  const toggleSkill = (s: string) => {
    setSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  const goBack = () => {
    if (step === 'verify') nav(-1)
    else setStep(step === 'skills' ? 'verify' : 'skills')
  }

  const finish = async () => {
    setSubmitting(true)
    try {
      // A funder/recipient picked at signup can still become a contractor
      // later — make sure the role is actually on their account before
      // upsertMine's role check (contractor-only) would otherwise 403.
      await api.post('/users/me/roles', { roleType: 'contractor' })
      await upsertProfile.mutateAsync({ categories: skills })
      setStep('done')
    } catch (err) {
      showToast({ title: 'Failed to save contractor profile', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setSubmitting(false)
    }
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
              style={{ borderColor: idUploaded ? C.forest : C.parchmentDark, background: idUploaded ? 'var(--status-success-bg)' : C.white }}
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
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all border-2"
                  style={{ borderColor: skills.includes(t) ? C.forest : C.parchmentDark, background: skills.includes(t) ? 'var(--status-success-bg)' : C.white, color: skills.includes(t) ? C.forest : C.inkMuted, fontFamily: FONT.sans }}>
                  {skills.includes(t) && <AppIcon name="check" size={12} strokeWidth={2.25} />}{t}
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
                  style={{ borderColor: portfolioCount > i ? C.forest : C.parchmentDark, background: portfolioCount > i ? 'var(--status-success-bg)' : C.white }}>
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

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={() => {
          if (step === 'verify') setStep('skills')
          else if (step === 'skills') setStep('portfolio')
          else finish()
        }} fullWidth disabled={(step === 'verify' && !idUploaded) || submitting}>
          {step === 'portfolio' ? (submitting ? 'Saving…' : 'Complete setup') : 'Continue'}
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Post a job / tender screen ────────────────────────────────────────────────
export function PostJobScreen() {
  const nav = useNavigate()
  const { addJob } = useApp()
  const { show: showToast } = useToast()
  const [form, setForm] = useState({ title: '', description: '', category: '', budget: '', deadline: '', milestones: '3' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createdJobId, setCreatedJobId] = useState<string | null>(null)
  const categories = ['Water & Sanitation', 'Education', 'Healthcare', 'Infrastructure', 'Agriculture', 'Housing']

  const canSubmit = form.title.trim() !== '' && form.category !== '' && Number(form.budget) > 0

  const submit = async () => {
    setSubmitting(true)
    try {
      const created = await addJob({
        title: form.title,
        category: form.category || 'General',
        location: 'Cameroon',
        budget: Number(form.budget) || 0,
        deadline: form.deadline || 'TBD',
        bids: 0,
        milestones: Math.max(1, Number(form.milestones) || 1),
        posted: 'Just now',
        description: form.description,
        status: 'open',
      })
      setCreatedJobId(created.id)
      setSubmitted(true)
    } catch (err) {
      showToast({ title: 'Failed to post job', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
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
              <rect x="6" y="6" width="24" height="24" rx="3" stroke="var(--status-info-text)" strokeWidth="2" />
              <path d="M12 18L16 22L24 14" stroke="var(--status-info-text)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Job posted</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            Your job is now visible to verified contractors. You will receive bids within 48 hours.
          </p>
          <PillButton onClick={() => nav(createdJobId ? `/funder/tender/${createdJobId}/bids` : '/funder/contractors')} fullWidth>View bids as they come in</PillButton>
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
          <ChipGroup options={categories} value={form.category} onChange={(v) => setForm({ ...form, category: v as string })} />
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

        <div className="rounded-xl p-3 border" style={{ background: 'var(--status-success-bg)', borderColor: C.forestLight }}>
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] uppercase tracking-widest mb-1">Escrow protection</div>
          <p style={{ fontFamily: FONT.sans, color: 'var(--status-success-text)' }} className="text-xs leading-relaxed">
            The full budget is held in escrow before work begins. Contractors are paid per milestone after proof is verified.
          </p>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={submit} fullWidth disabled={!canSubmit || submitting}>{submitting ? 'Publishing…' : 'Publish job'}</PillButton>
      </div>
    </AppShell>
  )
}

// ── Contract summary (auto-generated digital contract) ────────────────────────
export function ContractSummaryScreen() {
  const { bidId } = useParams()
  const { show: showToast } = useToast()
  const { data: contracts, isLoading: contractLoading } = useContractsQuery({ bidId })
  const contract = contracts?.[0]
  const { data: project, isLoading: projectLoading } = useProjectQuery(contract?.projectId)
  const { data: bids } = useBidsQuery({ projectId: contract?.projectId })
  const bid = bids?.find((b) => b.id === bidId)
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
    return <AppShell noNav><div className="px-5 py-8 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>Loading contract…</div></AppShell>
  }
  if (!contract || !project) {
    return (
      <AppShell noNav>
        <Header title="Contract Summary" back />
        <div className="px-5 py-4"><EmptyState icon="receipt" title="No contract found" description="This bid doesn't have an awarded contract." /></div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Contract Summary" back />

      <div className="px-5 py-5 space-y-5 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        <div className="text-center py-4">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em] mb-2">Digital Contract</div>
          <div style={{ fontFamily: FONT.mono, color: C.ink }} className="text-sm font-medium">{contract.id.slice(-8).toUpperCase()}</div>
          <div className="mt-2"><StatusBadge status={contract.status} /></div>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Parties</div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: C.forest, fontFamily: FONT.serif }}>{project.recipient[0]}</div>
              <div>
                <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{project.recipient}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">Project owner / Funder</div>
              </div>
            </div>
            <div className="h-px" style={{ background: C.parchmentDark }} />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: C.steel, fontFamily: FONT.serif }}>{(bid?.contractorName ?? '?')[0]}</div>
              <div>
                <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{bid?.contractorName ?? 'Contractor'}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">Contractor</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Scope of work</div>
          <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold mb-1">{project.title}</div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">{project.description}</p>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Payment schedule</div>
          <div className="space-y-2">
            {project.milestones.map((m, i) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: C.parchment }}>
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
            <span style={{ fontFamily: FONT.serif, color: C.forest }} className="text-lg font-bold">{fmt(contract.totalAmount)}</span>
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Generated contract text</div>
          <pre style={{ fontFamily: FONT.mono, color: C.inkMuted, whiteSpace: 'pre-wrap' }} className="text-[11px] leading-relaxed">{contract.generatedDocumentText}</pre>
        </div>

        <div className="text-center py-4">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Generated on acceptance · {contract.createdAt}</div>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl space-y-2" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        {contract.status === 'active' && (
          <div className="flex gap-2">
            <button
              onClick={() => act('complete')}
              disabled={acting !== null}
              className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
            >
              {acting === 'complete' ? 'Marking…' : 'Mark completed'}
            </button>
            <button
              onClick={() => act('terminate')}
              disabled={acting !== null}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border disabled:opacity-50"
              style={{ borderColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
            >
              {acting === 'terminate' ? 'Terminating…' : 'Terminate'}
            </button>
          </div>
        )}
        {contract.generatedDocumentUrl && (
          <a href={contract.generatedDocumentUrl} target="_blank" rel="noreferrer" className="block text-center text-xs font-semibold" style={{ fontFamily: FONT.sans, color: C.forest }}>
            Download contract document →
          </a>
        )}
      </div>
    </AppShell>
  )
}

// ── Rate contractor screen ────────────────────────────────────────────────────
export function RateContractorScreen() {
  const nav = useNavigate()
  const { jobId } = useParams()
  const { contractors } = useApp()
  const { show: showToast } = useToast()
  const { data: bids = [] } = useBidsQuery({ projectId: jobId })
  const acceptedBid = bids.find((b) => b.status === 'accepted')
  const contractor = contractors.find((c) => c.id === acceptedBid?.contractorId) ?? contractors[0]
  const createRating = useCreateRatingMutation()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = async () => {
    if (!acceptedBid?.contractorId || !jobId) {
      showToast({ title: 'Cannot rate this contractor', description: 'No awarded bid was found for this tender.', tone: 'error' })
      return
    }
    try {
      await createRating.mutateAsync({ toUserId: acceptedBid.contractorId, projectId: jobId, score: rating, comment, roleContext: 'contractor' })
      setSubmitted(true)
    } catch (err) {
      showToast({ title: 'Failed to submit rating', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
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

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={submit} fullWidth disabled={rating === 0 || createRating.isPending}>
          {createRating.isPending ? 'Submitting…' : 'Submit rating'}
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Land schedule verification visit ──────────────────────────────────────────
// A buyer proposes one or more dates to visit the plot in person; the
// seller picks one to confirm (see api/landVisits.ts /
// visitRequestController) — a real scheduling handshake between the two
// real parties, not an official verifier inspection (that's the separate
// VerificationTask system used elsewhere for admin-assigned site checks).
export function LandScheduleVisitScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { landListings, devUserId } = useApp()
  const { show: showToast } = useToast()
  const listing = landListings.find((l) => l.id === id) ?? landListings[0]
  const isSeller = Boolean(devUserId && listing.sellerId && devUserId === listing.sellerId)

  const { data: visits = [] } = useVisitRequestsQuery({ listingId: listing.id })
  const requestVisit = useRequestVisitMutation()
  const confirmVisit = useConfirmVisitMutation()
  const cancelVisit = useCancelVisitMutation()

  const [dates, setDates] = useState<string[]>([''])
  const [notes, setNotes] = useState('')
  const [scheduled, setScheduled] = useState(false)
  const [actingOn, setActingOn] = useState<string | null>(null)
  const [confirmDateFor, setConfirmDateFor] = useState<string | null>(null)
  const [confirmDate, setConfirmDate] = useState('')

  const validDates = dates.filter((d) => d.trim())

  const submit = async () => {
    if (validDates.length === 0) return
    try {
      await requestVisit.mutateAsync({ listingId: listing.id, proposedDates: validDates, notes })
      setScheduled(true)
    } catch (err) {
      showToast({ title: 'Failed to request visit', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  const doConfirm = async (visitId: string) => {
    if (!confirmDate) return
    setActingOn(visitId)
    try {
      await confirmVisit.mutateAsync({ visitId, confirmedDate: confirmDate })
      setConfirmDateFor(null)
    } catch (err) {
      showToast({ title: 'Failed to confirm visit', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setActingOn(null)
    }
  }

  const doCancel = async (visitId: string) => {
    setActingOn(visitId)
    try {
      await cancelVisit.mutateAsync(visitId)
    } catch (err) {
      showToast({ title: 'Failed to cancel visit', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setActingOn(null)
    }
  }

  if (scheduled) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--status-info-bg)' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="6" y="8" width="24" height="22" rx="2" stroke="var(--status-info-text)" strokeWidth="2" />
              <line x1="6" y1="14" x2="30" y2="14" stroke="var(--status-info-text)" strokeWidth="1.5" />
              <line x1="12" y1="6" x2="12" y2="10" stroke="var(--status-info-text)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="24" y1="6" x2="24" y2="10" stroke="var(--status-info-text)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Visit requested</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            {listing.seller} has been notified of your proposed dates and will confirm one that works.
          </p>
          <PillButton onClick={() => nav(`/land/listing/${listing.id}`)} fullWidth>Back to listing</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title={isSeller ? 'Visit Requests' : 'Schedule a Visit'} subtitle={listing.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        {visits.length > 0 && (
          <div>
            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">{isSeller ? 'Requested visits' : 'Your visit requests'}</p>
            <div className="space-y-2">
              {visits.map((v) => (
                <Card key={v.id}>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{isSeller ? v.requestedByName : 'You'}</span>
                      <StatusBadge status={v.status} />
                    </div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">
                      {v.status === 'confirmed' && v.confirmedDate
                        ? `Confirmed: ${new Date(v.confirmedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : `Proposed: ${v.proposedDates.map((d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })).join(', ')}`}
                    </div>
                    {v.notes && <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-1">{v.notes}</p>}

                    {isSeller && v.status === 'requested' && (
                      confirmDateFor === v.id ? (
                        <div className="flex gap-2 mt-2">
                          <input type="date" value={confirmDate} onChange={(e) => setConfirmDate(e.target.value)}
                            className="flex-1 border-2 rounded-lg px-3 py-2 outline-none text-sm"
                            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
                          <PillButton onClick={() => doConfirm(v.id)} disabled={actingOn === v.id || !confirmDate}>Confirm</PillButton>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-2">
                          <PillButton onClick={() => { setConfirmDateFor(v.id); setConfirmDate(v.proposedDates[0]?.slice(0, 10) ?? '') }} disabled={actingOn === v.id}>Pick a date</PillButton>
                          <PillButton onClick={() => doCancel(v.id)} variant="ghost" disabled={actingOn === v.id}>Decline</PillButton>
                        </div>
                      )
                    )}
                    {!isSeller && ['requested', 'confirmed'].includes(v.status) && (
                      <div className="mt-2">
                        <PillButton onClick={() => doCancel(v.id)} variant="ghost" disabled={actingOn === v.id}>{actingOn === v.id ? '…' : 'Cancel'}</PillButton>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!isSeller && (
          <>
            <div className="rounded-xl p-4 border" style={{ background: 'var(--status-info-bg)', borderColor: 'var(--status-info-text)' }}>
              <p style={{ fontFamily: FONT.sans, color: 'var(--status-info-text)' }} className="text-xs leading-relaxed">
                Propose one or more dates to visit this plot in person. {listing.seller} will confirm whichever works for them.
              </p>
            </div>

            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Proposed dates</label>
              <div className="space-y-2">
                {dates.map((d, i) => (
                  <input key={i} type="date" value={d} onChange={(e) => setDates((ds) => ds.map((x, j) => (j === i ? e.target.value : x)))}
                    className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                    style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
                ))}
              </div>
              <button onClick={() => setDates((ds) => [...ds, ''])} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold mt-2">+ Add another date option</button>
            </div>

            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Notes (optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                placeholder="Anything the seller should know?"
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none"
                style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
            </div>
          </>
        )}
      </div>

      {!isSeller && (
        <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
          <PillButton onClick={submit} fullWidth disabled={validDates.length === 0 || requestVisit.isPending}>
            {requestVisit.isPending ? 'Sending…' : 'Request visit'}
          </PillButton>
        </div>
      )}
    </AppShell>
  )
}

// ── Verifier registration / onboarding ─────────────────────────────────────────
export function VerifierRegistrationScreen() {
  const nav = useNavigate()
  const { registerVerifier } = useVerification()
  const [step, setStep] = useState<'info' | 'id'>('info')
  const [form, setForm] = useState({ specialty: '', region: '', bio: '' })
  const [idFile, setIdFile] = useState<File | null>(null)

  const finish = () => {
    registerVerifier({
      specialties: form.specialty.trim() ? [form.specialty.trim()] : [],
      regions: form.region.trim() ? [form.region.trim()] : [],
      bio: form.bio.trim(),
      file: idFile,
    })
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
              Verifiers visit project and land sites in person to confirm that submitted evidence matches reality. This starts a real application — an admin reviews it before you're granted the verifier role and start receiving assignments.
            </p>
            {[
              { key: 'specialty', label: 'What do you verify?', placeholder: 'e.g. Water & Sanitation, Electrical' },
              { key: 'region', label: 'Region you cover', placeholder: 'e.g. North West Region' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">{label}</label>
                <input
                  value={form[key as 'specialty' | 'region']}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                  style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
                />
              </div>
            ))}
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Relevant experience (optional)</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                placeholder="e.g. 5 years as a site engineer, familiar with borehole and roofing inspections"
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
              />
            </div>
            <PillButton onClick={() => setStep('id')} fullWidth disabled={!form.specialty.trim() || !form.region.trim()}>Next: ID verification</PillButton>
          </>
        ) : (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              Upload a government-issued ID. Verifiers must be identity-verified before an admin can approve their application.
            </p>
            <label
              className="w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-3 transition-all cursor-pointer"
              style={{ borderColor: idFile ? C.forest : C.parchmentDark, background: idFile ? 'var(--status-success-bg)' : C.white }}
            >
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
              />
              {idFile ? (
                <>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: C.forest }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M4 11L9 16L18 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: FONT.sans, color: C.forest }} className="text-sm font-semibold">{idFile.name}</span>
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
            </label>
            <PillButton onClick={finish} fullWidth disabled={!idFile}>Complete registration</PillButton>
          </>
        )}
      </div>
    </AppShell>
  )
}

// ── Local verifier / agent dashboard ──────────────────────────────────────────
export function VerifierDashboard() {
  const nav = useNavigate()
  const { verifierProfile } = useVerification()
  const { devUserId, name } = useApp()
  const { data: rawTasks } = useVerificationTasksQuery(devUserId ? { verifierId: devUserId } : {})
  const { data: ratingSummary } = useRatingSummaryQuery(devUserId ?? undefined)
  const verifierTasks = (rawTasks ?? []).map(mapVerificationTask)
  const [view, setView] = useState<'list' | 'map'>('list')

  if (!verifierProfile || verifierProfile.applicationStatus !== 'approved') {
    const isPending = verifierProfile?.applicationStatus === 'pending'
    const isRejected = verifierProfile?.applicationStatus === 'rejected'
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: isRejected ? 'var(--status-error-bg)' : 'var(--status-info-bg)', color: isRejected ? 'var(--status-error-text)' : 'var(--status-info-text)' }}>
            <AppIcon name={isPending ? 'hourglass' : isRejected ? 'alert' : 'compass'} size={30} strokeWidth={1.5} />
          </div>
          <div style={{ fontFamily: FONT.serif }} className="mb-2 text-lg font-bold">
            {isPending ? 'Application under review' : isRejected ? "Application wasn't approved" : 'Register as a verifier'}
          </div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mb-6 max-w-sm text-sm">
            {isPending
              ? "An admin is reviewing your application. You'll start receiving assignments once approved."
              : isRejected
                ? 'You can update your application details and ID document, then resubmit for review.'
                : 'Complete a short application to start receiving verification assignments.'}
          </p>
          {!isPending && <PillButton onClick={() => nav('/verifier/register')}>{isRejected ? 'Resubmit application' : 'Get started'}</PillButton>}
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
          title={verifierProfile.userName || name}
          background={`linear-gradient(135deg, ${C.moss} 0%, ${C.forest} 100%)`}
          stats={[
            { label: 'Pending', value: String(pending.length) },
            { label: 'In progress', value: String(inProgress.length) },
            { label: 'Rating', value: ratingSummary && ratingSummary.count > 0 ? ratingSummary.average!.toFixed(1) : '—' },
          ]}
          action={
            <button onClick={() => nav('/verifier/profile')} className="rounded-full px-4 py-2.5 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
              View profile →
            </button>
          }
        />

        <div className="mt-6 flex items-center justify-between">
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-[0.3em]">Assignments</p>
          <div className="w-36">
            <Tabs
              tabs={[{ id: 'list', label: 'List', icon: 'menu' }, { id: 'map', label: 'Map', icon: 'mapPin' }]}
              value={view}
              onChange={(v) => setView(v as 'list' | 'map')}
              variant="pill"
            />
          </div>
        </div>

        {view === 'map' ? (
          <div className="relative mt-4 overflow-hidden rounded-2xl" style={{ minHeight: '320px', background: C.parchment }}>
            <img src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=400&fit=crop&auto=format" alt="Map" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'rgba(15,27,20,0.35)' }} />
            {mapPins.map((t, i) => (
              <button key={t.id} onClick={() => nav(`/verifier/task/${t.id}`)} className="absolute flex flex-col items-center" style={{ left: pinPositions[i].x, top: pinPositions[i].y, transform: 'translate(-50%, -100%)' }}>
                <div className="mb-1 flex items-center justify-center rounded-full p-1.5" style={{ background: t.status === 'in_progress' ? C.amber : C.forest, color: t.status === 'in_progress' ? C.forestDark : '#fff' }}>
                  <AppIcon name={t.type === 'land' ? 'home' : 'hardHat'} size={11} strokeWidth={2} />
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
                {active.length === 0 ? (
                  <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No assignments right now.</div></Card>
                ) : (
                  <StaggerList className="space-y-3">
                    {active.map((t) => <StaggerItem key={t.id}><VerifierTaskCard task={t} onOpen={() => nav(`/verifier/task/${t.id}`)} /></StaggerItem>)}
                  </StaggerList>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Submitted</p>
                <StaggerList className="space-y-3">
                  {submitted.map((t) => <StaggerItem key={t.id}><VerifierTaskCard task={t} onOpen={() => nav(`/verifier/task/${t.id}`)} muted /></StaggerItem>)}
                </StaggerList>
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
    <Card variant="interactive" onClick={onOpen} className={muted ? 'opacity-70' : ''}>
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
  const { devUserId } = useApp()
  const { show: showToast } = useToast()
  const { data: rawTasks } = useVerificationTasksQuery(devUserId ? { verifierId: devUserId } : {})
  const verifierTasks = (rawTasks ?? []).map(mapVerificationTask)
  const task = verifierTasks.find((t) => t.id === id) ?? verifierTasks[0]
  const startMutation = useStartVerificationTaskMutation()

  const checklist = task.type === 'land'
    ? ['Plot boundaries match the survey plan', 'No visible encroachments or disputes', 'Access road and neighbouring plots confirmed']
    : ['Work matches the submitted photo/video proof', 'Location GPS confirmed on-site', 'Materials and quality are adequate']

  const begin = async () => {
    try {
      await startMutation.mutateAsync(task.id)
      nav(`/verifier/report/${task.id}`)
    } catch (err) {
      showToast({ title: 'Failed to start task', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
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
          <div className="rounded-xl border p-4" style={{ background: 'var(--status-success-bg)', borderColor: 'var(--status-success-text)' }}>
            <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] uppercase tracking-widest mb-1">Already submitted</div>
            <p style={{ fontFamily: FONT.sans, color: 'var(--status-success-text)' }} className="text-xs leading-relaxed">{task.report.notes}</p>
          </div>
        )}
      </div>

      {task.status !== 'submitted' && (
        <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
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
  const { devUserId } = useApp()
  const { show: showToast } = useToast()
  const { data: rawTasks } = useVerificationTasksQuery(devUserId ? { verifierId: devUserId } : {})
  const verifierTasks = (rawTasks ?? []).map(mapVerificationTask)
  const task = verifierTasks.find((t) => t.id === id) ?? verifierTasks.find((t) => t.status !== 'submitted') ?? verifierTasks[0]
  const submitMutation = useSubmitVerificationReportMutation()

  const [photos, setPhotos] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [decision, setDecision] = useState<'match' | 'mismatch' | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const addPhoto = () => {
    const next = VERIFIER_SAMPLE_PHOTOS[photos.length % VERIFIER_SAMPLE_PHOTOS.length]
    setPhotos((p) => (p.includes(next) ? [...p, `${next}&v=${p.length}`] : [...p, next]))
  }

  const submit = async () => {
    if (!decision) return
    setSubmitting(true)
    try {
      await submitMutation.mutateAsync({ taskId: task.id, reportText: notes, reportPhotos: photos, confirmedMatch: decision === 'match' })
      setSubmitted(true)
    } catch (err) {
      showToast({ title: 'Failed to submit report', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: decision === 'match' ? C.forest : 'var(--status-error-text)' }}>
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
              className="inline-flex items-center justify-center gap-1.5 py-4 rounded-xl border-2 text-sm font-bold transition-all"
              style={{ borderColor: decision === 'match' ? C.forest : C.parchmentDark, background: decision === 'match' ? 'var(--status-success-bg)' : C.white, color: decision === 'match' ? C.forest : C.inkMuted, fontFamily: FONT.sans }}
            >
              <AppIcon name="check" size={16} strokeWidth={2.25} /> Confirms match
            </button>
            <button
              onClick={() => setDecision('mismatch')}
              className="inline-flex items-center justify-center gap-1.5 py-4 rounded-xl border-2 text-sm font-bold transition-all"
              style={{ borderColor: decision === 'mismatch' ? 'var(--status-error-text)' : C.parchmentDark, background: decision === 'mismatch' ? 'var(--status-error-bg)' : C.white, color: decision === 'mismatch' ? 'var(--status-error-text)' : C.inkMuted, fontFamily: FONT.sans }}
            >
              <AppIcon name="flag" size={16} strokeWidth={2.25} /> Flag mismatch
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

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={submit} fullWidth disabled={!decision || photos.length === 0 || submitting}>{submitting ? 'Submitting…' : 'Submit verification report'}</PillButton>
      </div>
    </AppShell>
  )
}

// ── Verifier profile / reputation ──────────────────────────────────────────────
export function VerifierProfileScreen() {
  const { name, devUserId } = useApp()
  const { verifierProfile } = useVerification()
  const { data: rawTasks } = useVerificationTasksQuery(devUserId ? { verifierId: devUserId } : {})
  const { data: ratingSummary } = useRatingSummaryQuery(devUserId ?? undefined)
  const submittedTasks = (rawTasks ?? []).map(mapVerificationTask).filter((t) => t.status === 'submitted')

  if (!verifierProfile) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">You haven't applied as a verifier yet.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="Verifier Profile" back tone="dark" background={C.forest}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: 'rgba(255,255,255,0.15)', fontFamily: FONT.serif }}>
            {(verifierProfile.userName || name || '?')[0]}
          </div>
          <div>
            <div style={{ fontFamily: FONT.serif }} className="text-xl font-bold text-white">{verifierProfile.userName || name}</div>
            <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-wider mt-0.5">{verifierProfile.regions.join(', ') || 'No region set'}</div>
          </div>
        </div>
      </Header>

      <div className="px-5 py-5 space-y-4 sm:mx-auto sm:max-w-2xl">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Completed', value: String(submittedTasks.length) },
            { label: 'Rating', value: ratingSummary && ratingSummary.count > 0 ? ratingSummary.average!.toFixed(1) : '—' },
            { label: 'Application', value: verifierProfile.applicationStatus === 'approved' ? 'Approved' : verifierProfile.applicationStatus === 'pending' ? 'Pending' : 'Rejected' },
          ].map(({ label, value }) => (
            <Card key={label}>
              <div className="p-3 text-center">
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">{value}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            </Card>
          ))}
        </div>

        {verifierProfile.specialties.length > 0 && (
          <div>
            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Specialties</p>
            <div className="flex flex-wrap gap-2">
              {verifierProfile.specialties.map((s) => (
                <span key={s} className="rounded-full px-3 py-1 text-xs" style={{ background: C.parchment, color: C.inkMuted, fontFamily: FONT.sans }}>{s}</span>
              ))}
            </div>
          </div>
        )}

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
  const { data: platformStats, isError: statsError } = usePlatformStatsQuery()
  const { data: certifications = [] } = useAllCertificationsQuery()
  const decideCertificationMutation = useDecideCertificationMutation()
  const decideCertification = (certId: string, status: 'verified' | 'rejected') => decideCertificationMutation.mutate({ certId, status })
  const { data: verifierApplications = [] } = useVerifierApplicationsQuery()
  const decideVerifierApplicationMutation = useDecideVerifierApplicationMutation()
  const decideVerifierApplication = (id: string, decision: 'approve' | 'reject') => decideVerifierApplicationMutation.mutate({ id, decision })
  const { data: openDisputes = [] } = useDisputesQuery({ status: 'open' })
  const [tab, setTab] = useState<'overview' | 'verifications' | 'disputes' | 'users'>('overview')
  const pendingCertifications = certifications.filter((c) => c.status === 'pending')
  const pendingVerifierApplications = verifierApplications.filter((v) => v.applicationStatus === 'pending')

  const [roleFilter, setRoleFilter] = useState<string>('all')
  const { data: usersData, isLoading: usersLoading } = useAdminUsersQuery({ role: roleFilter === 'all' ? undefined : roleFilter, limit: 50 })
  const deactivateUser = useDeactivateUserMutation()
  const reactivateUser = useReactivateUserMutation()

  const stats = [
    { label: 'Total users', value: platformStats ? String(platformStats.totalUsers) : '—' },
    { label: 'Active projects', value: platformStats ? String(platformStats.activeProjects) : '—' },
    { label: 'Escrow held', value: platformStats ? fmt(platformStats.totalEscrowHeld) : '—' },
    { label: 'Disputes open', value: platformStats ? String(platformStats.openDisputes) : '—' },
  ]

  if (statsError) {
    return (
      <AppShell>
        <Header title="Admin Panel" back />
        <div className="px-5 sm:mx-auto sm:max-w-md">
          <EmptyState
            icon="shield"
            title="Access denied"
            description="This area is restricted to platform admins. If you believe you should have access, contact an administrator."
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="Admin Panel" back>
        <Tabs
          tabs={[{ id: 'overview', label: 'Overview' }, { id: 'verifications', label: 'Verifications' }, { id: 'disputes', label: 'Disputes' }, { id: 'users', label: 'Users' }]}
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          variant="pill"
        />
      </Header>

      <div className="px-5 py-4 sm:mx-auto sm:max-w-3xl">
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ label, value }) => (
                <Card key={label}>
                  <div className="p-3">
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest">{label}</div>
                    <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-xl font-bold mt-1">{value}</div>
                  </div>
                </Card>
              ))}
            </div>

            <Card onClick={() => nav('/admin/fraud-analytics')}>
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)' }}>
                  <AppIcon name="alert" size={18} />
                </div>
                <div className="flex-1">
                  <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">Fraud & dispute analytics</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">Flagged patterns across the platform</div>
                </div>
                <span style={{ color: C.inkSubtle }}>→</span>
              </div>
            </Card>

            {platformStats && Object.keys(platformStats.usersByRole).length > 0 && (
              <div>
                <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Users by role</p>
                <div className="space-y-2">
                  {Object.entries(platformStats.usersByRole).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: C.parchmentDark }}>
                      <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-xs capitalize">{role.replace('_', ' ')}</span>
                      <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'verifications' && (
          <StaggerList className="space-y-3">
            <div className="rounded-xl p-3 border" style={{ background: 'var(--status-warning-bg)', borderColor: 'var(--status-warning-bg)' }}>
              <div style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="text-[10px] uppercase tracking-widest">{pendingVerifierApplications.length} pending verifier applications · {pendingCertifications.length} pending certifications</div>
            </div>

            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Verifier applications</p>
            {verifierApplications.map((v) => (
              <Card key={v.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div style={{ fontFamily: FONT.sans }} className="font-semibold text-sm">{v.userName ?? 'Applicant'}</div>
                    <StatusBadge status={v.applicationStatus === 'approved' ? 'verified' : v.applicationStatus === 'rejected' ? 'rejected' : 'pending'} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">
                    {v.specialties.join(', ') || 'No specialties'} · {v.regions.join(', ') || 'No region'}
                  </div>
                  {v.applicationStatus === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => decideVerifierApplication(v.id, 'approve')} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}>Approve</button>
                      <button onClick={() => decideVerifierApplication(v.id, 'reject')} className="px-3 py-1.5 rounded-lg text-xs font-semibold border" style={{ borderColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}>Reject</button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {verifierApplications.length === 0 && (
              <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No verifier applications yet.</div></Card>
            )}

            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest pt-2">Contractor certifications</p>
            {certifications.map((c) => (
              <Card key={c.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div style={{ fontFamily: FONT.sans }} className="font-semibold text-sm">{c.name}</div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{c.contractorName ?? 'Contractor'} · {c.issuer} · Submitted {c.dateUploaded}</div>
                  {c.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => decideCertification(c.id, 'verified')} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}>Approve</button>
                      <button onClick={() => decideCertification(c.id, 'rejected')} className="px-3 py-1.5 rounded-lg text-xs font-semibold border" style={{ borderColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}>Reject</button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {certifications.length === 0 && (
              <div className="text-center py-16">
                <div className="mb-4 flex justify-center" style={{ color: C.forest }}><AppIcon name="checkCircle" size={40} strokeWidth={1.5} /></div>
                <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold">No pending certifications</div>
              </div>
            )}
          </StaggerList>
        )}

        {tab === 'disputes' && (
          <StaggerList className="space-y-3">
            {openDisputes.map((d) => {
              const disp = disputeDisplay(d)
              return (
                <Card key={d._id} variant="interactive" onClick={() => nav('/admin/disputes')}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div style={{ fontFamily: FONT.sans }} className="font-semibold text-sm">{disp.project}</div>
                      <StatusBadge status="pending" />
                    </div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-2">{d.reason} · raised by {disp.raisedBy} · {disp.date}</div>
                  </div>
                </Card>
              )
            })}
            {openDisputes.length === 0 && (
              <div className="text-center py-16">
                <div className="mb-4 flex justify-center" style={{ color: C.forest }}><AppIcon name="checkCircle" size={40} strokeWidth={1.5} /></div>
                <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold">No open disputes</div>
              </div>
            )}
          </StaggerList>
        )}

        {tab === 'users' && (
          <StaggerList className="space-y-3">
            <ChipGroup
              options={['all', 'funder', 'recipient', 'contractor', 'land_seller', 'diaspora_group', 'admin']}
              value={roleFilter}
              onChange={(v) => setRoleFilter(v as string)}
            />
            {usersLoading && <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">Loading…</p>}
            {(usersData?.users ?? []).map((u) => (
              <Card key={u.id}>
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: C.forest, fontFamily: FONT.serif }}>{u.fullName[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: FONT.sans }} className="font-semibold text-sm truncate">{u.fullName}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider truncate">{u.roles.join(', ') || 'no role'} · {u.email || u.phoneNumber || '—'}</div>
                  </div>
                  <StatusBadge status={u.isActive ? 'verified' : 'rejected'} />
                  {u.isActive ? (
                    <button
                      onClick={() => deactivateUser.mutate(u.id)}
                      disabled={deactivateUser.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border flex-shrink-0"
                      style={{ borderColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                    >Deactivate</button>
                  ) : (
                    <button
                      onClick={() => reactivateUser.mutate(u.id)}
                      disabled={reactivateUser.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                      style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
                    >Reactivate</button>
                  )}
                </div>
              </Card>
            ))}
          </StaggerList>
        )}
      </div>
    </AppShell>
  )
}

// ── Dispute resolution / support screen ───────────────────────────────────────
function disputeDisplay(d: BackendDispute) {
  const project = typeof d.projectId === 'object' ? d.projectId : null
  const owner = project && typeof project.ownerId === 'object' ? project.ownerId.fullName : 'Unknown'
  const raisedBy = typeof d.raisedBy === 'object' ? d.raisedBy.fullName : 'Unknown'
  return {
    project: project?.title ?? 'Unknown project',
    owner,
    raisedBy,
    funds: project?.totalAmount ?? 0,
    date: new Date(d.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  }
}

export function DisputeResolutionScreen() {
  const { show: showToast } = useToast()
  const { data: disputes, isLoading } = useDisputesQuery({ status: 'open' })
  const resolveMutation = useResolveDisputeMutation()
  const [contacted, setContacted] = useState<string[]>([])
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const resolveTarget = disputes?.find((d) => d._id === resolvingId)

  const resolve = async (id: string) => {
    try {
      await resolveMutation.mutateAsync({ disputeId: id, status: 'resolved', resolutionNotes: 'Resolved by admin — evidence re-reviewed, milestone returned to review queue.' })
    } catch (err) {
      showToast({ title: 'Failed to resolve dispute', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }
  const contact = (id: string) => setContacted((c) => [...c, id])

  return (
    <AppShell>
      <Header title="Dispute Resolution" subtitle={isLoading ? 'Loading…' : `${disputes?.length ?? 0} active disputes`} back />

      <StaggerList className="px-5 py-4 space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 sm:mx-auto sm:max-w-4xl">
        {(disputes ?? []).map((d) => {
          const disp = disputeDisplay(d)
          return (
            <StaggerItem key={d._id}>
            <Card>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{disp.project}</div>
                  <StatusBadge status={d.status === 'open' ? 'pending' : 'under_review'} />
                </div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-3">{d.reason}</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
                    <span>Project owner</span><span style={{ color: C.ink }}>{disp.owner}</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
                    <span>Raised by</span><span style={{ color: C.ink }}>{disp.raisedBy}</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
                    <span>Funds in escrow</span><span style={{ color: C.ink }}>{fmt(disp.funds)}</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
                    <span>Filed</span><span style={{ color: C.ink }}>{disp.date}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: C.parchmentDark }}>
                  <button onClick={() => setResolvingId(d._id)} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}>Resolve</button>
                  <button onClick={() => contact(d._id)} disabled={contacted.includes(d._id)} className="flex-1 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50" style={{ borderColor: C.parchmentDark, color: C.inkMuted, fontFamily: FONT.sans }}>
                    {contacted.includes(d._id) ? 'Contacted' : 'Contact parties'}
                  </button>
                </div>
              </div>
            </Card>
            </StaggerItem>
          )
        })}
        {!isLoading && (disputes?.length ?? 0) === 0 && (
          <div className="col-span-full text-center py-16">
            <div className="mb-4 flex justify-center" style={{ color: C.forest }}><AppIcon name="checkCircle" size={40} strokeWidth={1.5} /></div>
            <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold">No open disputes</div>
          </div>
        )}
      </StaggerList>

      <ConfirmDialog
        open={!!resolveTarget}
        onCancel={() => setResolvingId(null)}
        onConfirm={() => { if (resolvingId) resolve(resolvingId); setResolvingId(null) }}
        title="Mark this dispute as resolved?"
        description={resolveTarget ? `This closes the dispute for ${disputeDisplay(resolveTarget).project} and returns the milestone to review. Make sure both parties have been informed of the outcome.` : undefined}
        confirmLabel="Resolve dispute"
      />
    </AppShell>
  )
}

// ── Admin fraud & dispute analytics ─────────────────────────────────────────────
interface FlaggedCase {
  label: string
  sub: string
  onOpen?: () => void
  compactBadge?: ReactNode
  /** Gemini's one-line "why this looks suspicious" — only present when the
   * AI second opinion actually ran and returned something (see
   * evidenceAnalysisService.getAiSecondOpinion). Rendered as a distinct
   * italic note, not folded into `sub`, so it reads as "the AI said" rather
   * than as another heuristic fact. */
  aiNote?: string | null
}

interface FlaggedPattern {
  id: string
  icon: IconName
  title: string
  description: string
  cases: FlaggedCase[]
}

export function AdminFraudAnalyticsScreen() {
  const nav = useNavigate()
  const { landListings } = useApp()
  const { data: pendingKycUsers, isError: pendingKycError } = useAdminUsersQuery({ kycStatus: 'pending', limit: 50 })
  const { data: rejectedKycUsers, isError: rejectedKycError } = useAdminUsersQuery({ kycStatus: 'rejected', limit: 50 })
  const { data: riskFlags, isError: riskFlagsError } = useRiskFlagsQuery()
  const { data: riskSummary } = useRiskFlagSummaryQuery()
  const { data: openDisputesData } = useDisputesQuery({ status: 'open' })
  const [activePatternId, setActivePatternId] = useState<string | null>(null)

  const duplicateListings = landListings.filter((l) => l.duplicateOfListingId)
  const disputedListings = landListings.filter((l) => l.disputed)
  const reusedEvidenceFlags = (riskFlags ?? []).filter((f) => f.flagType === 'reused_evidence')
  const multipleDisputeFlags = (riskFlags ?? []).filter((f) => f.flagType === 'multiple_disputes')
  const duplicateGeotagFlags = (riskFlags ?? []).filter((f) => f.flagType === 'duplicate_geotag')
  // ai_flagged is its own flagType, but reused_evidence/duplicate_geotag
  // flags can *also* carry an AI second opinion (aiRiskScore set) — this
  // pattern is specifically "the AI weighed in and rated it high-risk",
  // regardless of which heuristic flagged it first.
  const aiFlaggedFlags = (riskFlags ?? []).filter((f) => f.flagType === 'ai_flagged' || (f.aiRiskScore ?? 0) >= 70)
  const openDisputes = openDisputesData ?? []
  const kycIssues = [
    ...(rejectedKycUsers?.users ?? []).map((u) => ({ name: u.fullName, sub: 'Rejected' })),
    ...(pendingKycUsers?.users ?? []).map((u) => ({ name: u.fullName, sub: 'Pending review' })),
  ]

  // `projects` from useApp() is the funder dashboard's list — scoped to
  // projectType "funding" and capped at one page, so a fraud flag on a
  // tender/land_purchase project (or just outside that page) would always
  // resolve to "Unlinked project" here even though the project is real.
  // Fetching each flagged id directly (any type, no cap) fixes that — this
  // is an admin-wide view, it needs to see every project a flag points to.
  const flaggedProjectIds = [...new Set(
    [...reusedEvidenceFlags, ...duplicateGeotagFlags, ...aiFlaggedFlags]
      .map((f) => String(f.detail.projectId ?? ''))
      .filter(Boolean)
  )]
  const flaggedProjectQueries = useQueries({
    queries: flaggedProjectIds.map((id) => ({
      queryKey: ['project', id],
      queryFn: async () => (await api.get<{ data: { title: string } }>(`/projects/${id}`)).data.data,
      staleTime: 10_000,
    })),
  })
  const flaggedProjectById = new Map(flaggedProjectIds.map((id, i) => [id, flaggedProjectQueries[i].data]))

  const patterns: FlaggedPattern[] = [
    {
      id: 'duplicate-land', icon: 'home', title: 'Duplicate land listings',
      description: 'Listings that closely match another listing already on the platform.',
      cases: duplicateListings.map((l) => ({
        label: l.title, sub: `Matches ${landListings.find((o) => o.id === l.duplicateOfListingId)?.title ?? 'another listing'}`,
        onOpen: () => nav(`/land/listing/${l.id}`), compactBadge: <LandFlagBadge listing={l} compact />,
      })),
    },
    {
      id: 'disputed-land', icon: 'scale', title: 'Disputed land listings',
      description: 'Listings under an active ownership or boundary dispute.',
      cases: disputedListings.map((l) => ({
        label: l.title, sub: l.disputeReason ?? 'Disputed ownership claim',
        onOpen: () => nav(`/land/listing/${l.id}`), compactBadge: <LandFlagBadge listing={l} compact />,
      })),
    },
    {
      id: 'evidence', icon: 'camera', title: 'Reused evidence flags',
      description: 'Milestone proof photos whose file hash matches evidence already submitted elsewhere — a strong sign of reused, non-authentic proof.',
      cases: reusedEvidenceFlags.map((f) => {
        const projectId = String(f.detail.projectId ?? '')
        const project = flaggedProjectById.get(projectId)
        const aiSuffix = f.aiRiskScore != null ? ` · AI risk ${f.aiRiskScore}/100` : ''
        return {
          label: project?.title ?? 'Unlinked project',
          sub: `Flagged ${new Date(f.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}${aiSuffix}`,
          onOpen: project ? () => nav(`/funder/project/${projectId}`) : undefined,
          aiNote: f.aiRationale,
        }
      }),
    },
    {
      id: 'duplicate-geotag', icon: 'mapPin', title: 'Duplicate geotag flags',
      description: 'Milestone evidence whose GPS location doesn’t match the project site, or repeats a location already used elsewhere — a sign the photo wasn’t taken where it claims.',
      cases: duplicateGeotagFlags.map((f) => {
        const projectId = String(f.detail.projectId ?? '')
        const project = flaggedProjectById.get(projectId)
        const aiSuffix = f.aiRiskScore != null ? ` · AI risk ${f.aiRiskScore}/100` : ''
        return {
          label: project?.title ?? 'Unlinked project',
          sub: `Flagged ${new Date(f.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}${aiSuffix}`,
          onOpen: project ? () => nav(`/funder/project/${projectId}`) : undefined,
          aiNote: f.aiRationale,
        }
      }),
    },
    {
      id: 'ai-flagged', icon: 'sparkles', title: 'AI-flagged high risk',
      description: 'Evidence Gemini rated as high-risk on a second opinion, or flagged directly — review these first; the AI only weighs in when a heuristic already looked off.',
      cases: aiFlaggedFlags.map((f) => {
        const projectId = String(f.detail.projectId ?? '')
        const project = flaggedProjectById.get(projectId)
        return {
          label: project?.title ?? 'Unlinked project',
          sub: `${f.aiRiskScore != null ? `AI risk ${f.aiRiskScore}/100 · ` : ''}${f.severity} severity · ${new Date(f.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
          onOpen: project ? () => nav(`/funder/project/${projectId}`) : undefined,
          aiNote: f.aiRationale,
        }
      }),
    },
    {
      id: 'disputes', icon: 'flag', title: 'Open milestone disputes',
      description: 'Disputes raised against a project, awaiting platform resolution.',
      cases: openDisputes.map((d) => {
        const disp = disputeDisplay(d)
        return { label: disp.project, sub: `${d.reason} — raised by ${disp.raisedBy}`, onOpen: () => nav('/admin/disputes') }
      }),
    },
    {
      id: 'repeat-disputes', icon: 'alert', title: 'Repeat dispute pattern',
      description: 'Project owners who have accumulated enough disputes across their projects to be a pattern, not a one-off.',
      cases: multipleDisputeFlags.map((f) => ({
        label: typeof f.userId === 'object' ? f.userId.fullName : 'Unknown user',
        sub: `${f.detail.disputeCount ?? '?'} disputes · ${f.severity} severity`,
      })),
    },
    {
      id: 'kyc', icon: 'idCard', title: 'Identity verification issues',
      description: 'Users with a rejected or unresolved KYC/AML submission.',
      cases: kycIssues.map((k) => ({ label: k.name, sub: k.sub })),
    },
  ]

  const activePattern = patterns.find((p) => p.id === activePatternId) ?? null

  // Every underlying query here is admin-gated on the backend — without this,
  // a 403 on all of them just silently reads as "0 flagged cases / good
  // standing" everywhere, which is a false all-clear, not an honest reflection
  // of "you don't have access to see this."
  if (pendingKycError || rejectedKycError || riskFlagsError) {
    return (
      <AppShell>
        <Header title="Fraud & Dispute Analytics" back />
        <div className="px-5 sm:mx-auto sm:max-w-md">
          <EmptyState
            icon="shield"
            title="Access denied"
            description="This area is restricted to platform admins. If you believe you should have access, contact an administrator."
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="Fraud & Dispute Analytics" subtitle="Flagged patterns across the platform" back />

      <div className="px-5 py-5 space-y-3 sm:mx-auto sm:max-w-3xl">
        {riskSummary && riskSummary.aiFlaggedCount > 0 && (
          <Card variant="glass">
            <div className="p-4 flex items-center gap-4">
              <span style={{ color: C.forest }}><AppIcon name="sparkles" size={20} /></span>
              <div>
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">
                  Gemini has weighed in on {riskSummary.aiFlaggedCount} flagged item{riskSummary.aiFlaggedCount === 1 ? '' : 's'}
                </div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mt-0.5">
                  Average AI risk score: {riskSummary.avgAiRiskScore != null ? Math.round(riskSummary.avgAiRiskScore) : '—'}/100
                </div>
              </div>
            </div>
          </Card>
        )}
        <StaggerList className="grid gap-3 sm:grid-cols-2">
          {patterns.map((p) => (
            <StaggerItem key={p.id}>
            <Card variant="interactive" onClick={() => setActivePatternId(activePatternId === p.id ? null : p.id)} className={activePatternId === p.id ? 'ring-2' : ''}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span style={{ color: C.forest }}><AppIcon name={p.icon} size={20} /></span>
                  <RiskBadge level={p.cases.length > 0 ? 'flagged' : 'good_standing'} />
                </div>
                <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{p.title}</div>
                <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-1 leading-relaxed">{p.description}</p>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mt-3">{p.cases.length} flagged case{p.cases.length === 1 ? '' : 's'}</div>
              </div>
            </Card>
            </StaggerItem>
          ))}
        </StaggerList>

        {activePattern && (
          <div className="pt-2">
            <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">{activePattern.title} — case detail</p>
            {activePattern.cases.length === 0 ? (
              <Card><div className="p-4 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No flagged cases in this category right now.</div></Card>
            ) : (
              <StaggerList className="space-y-2">
                {activePattern.cases.map((c, i) => (
                  <StaggerItem key={i}>
                    <Card variant="interactive" onClick={c.onOpen}>
                      <div className="p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold truncate">{c.label}</div>
                          <div style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-0.5 leading-relaxed">{c.sub}</div>
                          {c.aiNote && (
                            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs italic mt-1.5 leading-relaxed">"{c.aiNote}"</p>
                          )}
                        </div>
                        {c.compactBadge}
                      </div>
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
