import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { usePooledContributionsQuery, useInviteCoFunderMutation, useContributeMutation, useCancelRecurringMutation, usePauseRecurringMutation, useResumeRecurringMutation } from '../api/pooledFunding'
import { useUserSearchQuery } from '../api/users'
import { C, FONT, AppShell, Card, StatusBadge, ProgressBar, PillButton, Header, MomoOmPicker } from '../components/MobileLayout'
import { CurrencyConverterWidget } from '../components/CurrencyConverterWidget'
import { EmptyState } from '../components/EmptyState'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { SkeletonList } from '../components/Skeleton'
import { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'

function frequencyLabel(days: number | null): string {
  if (days === 7) return 'week'
  if (days === 30) return 'month'
  if (days === 90) return 'quarter'
  return `${days ?? '?'} days`
}

// ── Group / pooled funding ───────────────────────────────────────────────────────
export function PooledFundingScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { projects, devUserId } = useApp()
  const project = projects.find((p) => p.id === id) ?? projects[0]
  const { data: list = [], isLoading: listLoading } = usePooledContributionsQuery({ projectId: project.id })
  const pct = Math.round((project.raised / project.totalAmount) * 100)
  const shareLink = `mboatrust.app/#/funder/project/${project.id}`

  return (
    <AppShell>
      <Header title="Group Funding" subtitle={project.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <Card>
          <div className="p-4">
            <div className="flex justify-between mb-2">
              <div>
                <div style={{ fontFamily: FONT.serif }} className="text-xl font-bold">{fmt(project.raised)}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">raised of {fmt(project.totalAmount)}</div>
              </div>
              <div className="text-right">
                <div style={{ fontFamily: FONT.serif, color: C.forest }} className="text-xl font-bold">{pct}%</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">funded</div>
              </div>
            </div>
            <ProgressBar pct={pct} />
          </div>
        </Card>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Contributors ({list.length})</p>
          {listLoading ? (
            <SkeletonList rows={3} />
          ) : list.length === 0 ? (
            <EmptyState icon="handshake" title="No contributors yet" description="Be the first, or invite someone." illustration="tilt" />
          ) : (
            <StaggerList className="space-y-2">
              {list.map((c) => {
                const share = Math.round((c.amount / project.totalAmount) * 100)
                const isYou = c.contributorId === devUserId
                return (
                  <StaggerItem key={c.id}>
                    <Card>
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: C.forest, fontFamily: FONT.serif }}>
                            {c.contributorName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold truncate">{c.contributorName}{isYou ? ' (You)' : ''}</span>
                              <span style={{ fontFamily: FONT.serif, color: C.forest }} className="text-sm font-bold whitespace-nowrap">{fmt(c.amount)}</span>
                            </div>
                            {c.status === 'collected' ? (
                              <>
                                <div className="mt-1.5"><ProgressBar pct={share} /></div>
                                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] mt-1">{share}% of goal · {c.date}{c.isRecurring ? ` · every ${frequencyLabel(c.recurrenceIntervalDays)}` : ''}</div>
                              </>
                            ) : (
                              <div className="mt-1 flex items-center gap-2">
                                <StatusBadge status={c.status} />
                                <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px]">{c.status === 'pending' ? 'Invited, not yet paid' : c.date}</span>
                              </div>
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
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.parchment }}>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Share to grow this fund</p>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: C.white, border: `1px solid ${C.parchmentDark}` }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="2" y="2" width="12" height="12" fill={C.ink} /><rect x="26" y="2" width="12" height="12" fill={C.ink} /><rect x="2" y="26" width="12" height="12" fill={C.ink} />
                <rect x="18" y="2" width="4" height="4" fill={C.ink} /><rect x="18" y="10" width="4" height="4" fill={C.ink} /><rect x="18" y="18" width="4" height="4" fill={C.ink} />
                <rect x="26" y="18" width="4" height="4" fill={C.ink} /><rect x="34" y="18" width="4" height="4" fill={C.ink} /><rect x="18" y="26" width="4" height="4" fill={C.ink} />
                <rect x="26" y="34" width="4" height="4" fill={C.ink} /><rect x="34" y="26" width="4" height="4" fill={C.ink} /><rect x="34" y="34" width="4" height="4" fill={C.ink} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: FONT.mono, color: C.ink }} className="text-xs break-all">{shareLink}</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] mt-1">Anyone with this link (or QR) can view and contribute to this project.</div>
            </div>
          </div>
        </div>

        <PillButton onClick={() => nav(`/funder/invite-cofunder/${project.id}`)} fullWidth>Invite a co-funder</PillButton>
      </div>
    </AppShell>
  )
}

// ── Invite co-funder ────────────────────────────────────────────────────────────
// Like adding a co-signer, this requires an existing registered account —
// the backend has no way to invite someone who hasn't signed up (see
// pooledFundingController.invite's contributorId requirement).
export function InviteCoFunderScreen() {
  const nav = useNavigate()
  const { projectId } = useParams()
  const { projects } = useApp()
  const { show: showToast } = useToast()
  const project = projects.find((p) => p.id === projectId) ?? projects[0]
  const inviteCoFunder = useInviteCoFunderMutation()

  const [query, setQuery] = useState('')
  const { data: results = [], isFetching } = useUserSearchQuery(query)
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)
  const [amount, setAmount] = useState('')
  const [invited, setInvited] = useState<string | null>(null)

  const invite = async () => {
    if (!selected || !Number(amount)) return
    try {
      await inviteCoFunder.mutateAsync({ projectId: project.id, contributorId: selected.id, amount: Number(amount) })
      setInvited(selected.name)
    } catch (err) {
      showToast({ title: 'Failed to send invitation', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  if (invited) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.forest }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Invitation sent</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            {invited} has been invited to co-fund <strong style={{ color: C.ink }}>{project.title}</strong>. They'll see the pledge waiting for them next time they sign in.
          </p>
          <PillButton onClick={() => nav(`/funder/project/${project.id}/funding`)} fullWidth>Back to group funding</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Invite a Co-funder" subtitle={project.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-xl border p-3" style={{ background: 'var(--status-info-bg)', borderColor: 'var(--status-info-text)' }}>
          <p style={{ fontFamily: FONT.sans, color: 'var(--status-info-text)' }} className="text-xs leading-relaxed">
            Invite family, friends, or your diaspora association to pool funds toward this project together. They must already have a Mboa Trust account — search by name, phone, or email.
          </p>
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Search for a co-funder</label>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null) }}
            placeholder="Name, phone, or email"
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
          />
        </div>

        {!selected && query.trim().length >= 2 && (
          <div className="space-y-2">
            {isFetching && <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">Searching…</p>}
            {!isFetching && results.length === 0 && (
              <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">No matching account found. They'll need to create one first.</p>
            )}
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected({ id: u.id, name: u.fullName })}
                className="w-full text-left rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: C.parchmentDark, background: C.white }}
              >
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{u.fullName}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">{u.phoneNumber || u.email}</div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <>
            <div className="rounded-xl border p-3 flex items-center justify-between" style={{ borderColor: C.forestLight, background: 'var(--status-success-bg)' }}>
              <span style={{ fontFamily: FONT.sans, color: 'var(--status-success-text)' }} className="text-sm font-semibold">{selected.name}</span>
              <button onClick={() => setSelected(null)} style={{ fontFamily: FONT.mono, color: 'var(--status-success-text)' }} className="text-xs underline">Change</button>
            </div>
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Pledge amount (XAF)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100000"
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
            </div>
          </>
        )}
      </div>

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={invite} fullWidth disabled={!selected || !Number(amount) || inviteCoFunder.isPending}>{inviteCoFunder.isPending ? 'Sending…' : 'Send invitation'}</PillButton>
      </div>
    </AppShell>
  )
}

// ── Recurring contribution setup ────────────────────────────────────────────────
// Setting this up charges the first contribution immediately (real money,
// same as a one-off deposit) and schedules the rest — the backend has no
// "ends on a date / after N contributions" concept, only ongoing-until-
// cancelled (see PooledContribution.isRecurring), so that's the only option.
const FREQUENCY_DAYS: Record<'weekly' | 'monthly' | 'quarterly', number> = { weekly: 7, monthly: 30, quarterly: 90 }

export function RecurringContributionSetupScreen() {
  const nav = useNavigate()
  const { projectId } = useParams()
  const { projects, phone } = useApp()
  const { show: showToast } = useToast()
  const project = projects.find((p) => p.id === projectId) ?? projects[0]
  const contribute = useContributeMutation()

  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly')
  const [method, setMethod] = useState<'momo' | 'om'>('momo')
  const [created, setCreated] = useState(false)

  const canSubmit = Number(amount) > 0

  const submit = async () => {
    if (!canSubmit) return
    try {
      await contribute.mutateAsync({
        projectId: project.id,
        amount: Number(amount),
        isRecurring: true,
        recurrenceIntervalDays: FREQUENCY_DAYS[frequency],
        paymentProvider: method === 'om' ? 'orange_money' : 'mtn_momo',
        payerPhoneNumber: phone || '+237677234891',
      })
      setCreated(true)
    } catch (err) {
      showToast({ title: 'Failed to set up recurring contribution', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  if (created) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.forest }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Recurring contribution set up</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            {fmt(Number(amount))} was charged now and will repeat every {frequency === 'monthly' ? 'month' : frequency === 'weekly' ? 'week' : 'quarter'} to <strong style={{ color: C.ink }}>{project.title}</strong>, until you pause or cancel it.
          </p>
          <PillButton onClick={() => nav('/funder/recurring')} fullWidth>Manage recurring contributions</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Set Up Recurring Contribution" subtitle={project.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Amount per contribution (XAF)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50000"
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Frequency</label>
          <div className="grid grid-cols-3 gap-2">
            {(['weekly', 'monthly', 'quarterly'] as const).map((f) => (
              <button key={f} onClick={() => setFrequency(f)}
                className="py-3 rounded-xl text-sm font-semibold capitalize transition-all border-2"
                style={{ borderColor: frequency === f ? C.forest : C.parchmentDark, background: frequency === f ? 'var(--status-success-bg)' : C.white, color: frequency === f ? C.forest : C.inkMuted, fontFamily: FONT.sans }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Payment method</label>
          <MomoOmPicker method={method} onChange={setMethod} />
        </div>

        <div className="rounded-xl border p-3" style={{ background: 'var(--status-success-bg)', borderColor: C.forestLight }}>
          <p style={{ fontFamily: FONT.sans, color: 'var(--status-success-text)' }} className="text-xs leading-relaxed">
            The first contribution is charged now. Every contribution after that repeats automatically via the same account and is added to escrow, until you pause or cancel it.
          </p>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={submit} fullWidth disabled={!canSubmit || contribute.isPending}>{contribute.isPending ? 'Charging…' : 'Set up recurring contribution'}</PillButton>
      </div>
    </AppShell>
  )
}

// ── Manage recurring contributions ─────────────────────────────────────────────
export function ManageRecurringScreen() {
  const nav = useNavigate()
  const { devUserId } = useApp()
  const { show: showToast } = useToast()
  const { data: allContributions = [] } = usePooledContributionsQuery({ contributorId: devUserId ?? undefined })
  // A cancelled pledge flips isRecurring back to false server-side (see
  // pooledFundingController.cancelRecurring) — filtering on it alone is
  // enough to drop cancelled ones from this list.
  const recurring = allContributions.filter((c) => c.isRecurring)
  const pauseRecurring = usePauseRecurringMutation()
  const resumeRecurring = useResumeRecurringMutation()
  const cancelRecurring = useCancelRecurringMutation()
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [actingOn, setActingOn] = useState<string | null>(null)
  const cancelTarget = recurring.find((r) => r.id === cancelingId)

  const act = async (mutation: ReturnType<typeof usePauseRecurringMutation>, id: string, verb: string) => {
    setActingOn(id)
    try {
      await mutation.mutateAsync(id)
    } catch (err) {
      showToast({ title: `Failed to ${verb}`, description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setActingOn(null)
    }
  }

  return (
    <AppShell>
      <Header
        title="Recurring Contributions"
        back
        action={<button onClick={() => nav('/funder/browse')} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold">+ New</button>}
      />

      {recurring.length === 0 ? (
        <div className="px-5 py-4">
          <EmptyState icon="refresh" title="No recurring contributions yet" description="Set one up from any project's funding page." illustration="tilt" />
        </div>
      ) : (
        <StaggerList className="px-5 py-4 space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
          {recurring.map((r) => (
            <StaggerItem key={r.id}>
              <Card>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{r.projectTitle}</div>
                    <StatusBadge status={r.paused ? 'pending' : 'approved'} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-2">{fmt(r.amount)} · every {frequencyLabel(r.recurrenceIntervalDays)}</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px] mb-3">
                    {r.paused ? 'Paused' : r.nextChargeAt ? `Next charge: ${new Date(r.nextChargeAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                  </div>
                  <div className="flex gap-2 pt-3 border-t" style={{ borderColor: C.parchmentDark }}>
                    {r.paused ? (
                      <button disabled={actingOn === r.id} onClick={() => act(resumeRecurring, r.id, 'resume')} className="flex-1 py-2 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}>Resume</button>
                    ) : (
                      <button disabled={actingOn === r.id} onClick={() => act(pauseRecurring, r.id, 'pause')} className="flex-1 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50" style={{ borderColor: C.parchmentDark, color: C.inkMuted, fontFamily: FONT.sans }}>Pause</button>
                    )}
                    <button disabled={actingOn === r.id} onClick={() => setCancelingId(r.id)} className="flex-1 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50" style={{ borderColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}>Cancel</button>
                  </div>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onCancel={() => setCancelingId(null)}
        onConfirm={async () => {
          if (cancelingId) await act(cancelRecurring, cancelingId, 'cancel')
          setCancelingId(null)
        }}
        title="Cancel this recurring contribution?"
        description={cancelTarget ? `You'll stop automatically contributing ${fmt(cancelTarget.amount)} every ${frequencyLabel(cancelTarget.recurrenceIntervalDays)} to ${cancelTarget.projectTitle}. You can always set up a new one later.` : undefined}
        confirmLabel="Cancel contribution"
        danger
      />
    </AppShell>
  )
}

// ── Standalone currency converter ──────────────────────────────────────────────
export function CurrencyConverterScreen() {
  return (
    <AppShell>
      <Header title="Currency Converter" back />
      <div className="px-5 py-5 sm:mx-auto sm:max-w-2xl">
        <CurrencyConverterWidget />
      </div>
    </AppShell>
  )
}
