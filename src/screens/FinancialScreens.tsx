import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { useFunding, type RecurringFrequency, type RecurringEndType } from '../funding'
import { C, FONT, AppShell, Card, StatusBadge, ProgressBar, PillButton, Header } from '../components/MobileLayout'
import { ContactPicker, type PickedContact } from '../components/ContactPicker'
import { CurrencyConverterWidget } from '../components/CurrencyConverterWidget'
import { ChipGroup } from '../components/Chip'
import { EmptyState } from '../components/EmptyState'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { ConfirmDialog } from '../components/Modal'

// ── Group / pooled funding ───────────────────────────────────────────────────────
export function PooledFundingScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { projects } = useApp()
  const { contributors } = useFunding()
  const project = projects.find((p) => p.id === id) ?? projects[0]
  const list = contributors[project.id] ?? []
  const pct = Math.round((project.raised / project.totalAmount) * 100)
  const shareLink = `mboatrust.app/#/funder/project/${project.id}`

  return (
    <AppShell>
      <Header title="Group Funding" subtitle={project.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
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

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Contributors ({list.length})</p>
          {list.length === 0 ? (
            <EmptyState icon="🤝" title="No contributors yet" description="Be the first, or invite someone." illustration="tilt" />
          ) : (
            <StaggerList className="space-y-2">
              {list.map((c) => {
                const share = Math.round((c.amount / project.totalAmount) * 100)
                return (
                  <StaggerItem key={c.id}>
                    <Card>
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: C.forest, fontFamily: FONT.serif }}>
                            {c.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold truncate">{c.name}{c.isYou ? ' (You)' : ''}</span>
                              <span style={{ fontFamily: FONT.serif, color: C.forest }} className="text-sm font-bold whitespace-nowrap">{fmt(c.amount)}</span>
                            </div>
                            <div className="mt-1.5"><ProgressBar pct={share} /></div>
                            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] mt-1">{share}% of goal · {c.date}</div>
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
const SUGGESTED_COFUNDERS = [
  { name: 'Théodore K.', phone: '+237 677 222 010', role: 'Family member — Toronto' },
  { name: 'Rosine A.', phone: '+237 677 222 020', role: 'Friend — Paris' },
  { name: 'Patrick Ndifor', phone: '+237 677 222 030', role: 'Community association' },
]

export function InviteCoFunderScreen() {
  const nav = useNavigate()
  const { projectId } = useParams()
  const { projects } = useApp()
  const project = projects.find((p) => p.id === projectId) ?? projects[0]
  const [contact, setContact] = useState<PickedContact | null>(null)
  const [invited, setInvited] = useState<string | null>(null)

  if (invited) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.forest }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Invitation sent</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            {invited} has been invited to co-fund <strong style={{ color: C.ink }}>{project.title}</strong>. They'll receive a link to join and contribute.
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
            Invite family, friends, or your diaspora association to pool funds toward this project together. Each contribution is tracked separately.
          </p>
        </div>
        <ContactPicker suggestions={SUGGESTED_COFUNDERS} onChange={setContact} />
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={() => contact && setInvited(contact.name)} fullWidth disabled={!contact}>Send invitation</PillButton>
      </div>
    </AppShell>
  )
}

// ── Recurring contribution setup ────────────────────────────────────────────────
export function RecurringContributionSetupScreen() {
  const nav = useNavigate()
  const { projectId } = useParams()
  const { projects } = useApp()
  const { addRecurring } = useFunding()
  const project = projects.find((p) => p.id === projectId) ?? projects[0]

  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [endType, setEndType] = useState<RecurringEndType>('ongoing')
  const [endDate, setEndDate] = useState('')
  const [occurrences, setOccurrences] = useState('12')
  const [created, setCreated] = useState(false)

  const canSubmit = Number(amount) > 0 && (endType !== 'until_date' || !!endDate) && (endType !== 'occurrences' || Number(occurrences) > 0)

  const submit = () => {
    if (!canSubmit) return
    addRecurring({
      projectId: project.id,
      projectTitle: project.title,
      amount: Number(amount),
      frequency,
      endType,
      endDate: endType === 'until_date' ? endDate : undefined,
      occurrences: endType === 'occurrences' ? Number(occurrences) : undefined,
    })
    setCreated(true)
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
            {fmt(Number(amount))} will be contributed to <strong style={{ color: C.ink }}>{project.title}</strong> every {frequency === 'monthly' ? 'month' : frequency === 'weekly' ? 'week' : 'quarter'}.
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
          <ChipGroup options={['weekly', 'monthly', 'quarterly']} value={frequency} onChange={(v) => setFrequency(v as RecurringFrequency)} />
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Ends</label>
          <div className="space-y-2">
            {([
              { v: 'ongoing', label: 'Ongoing — until I cancel' },
              { v: 'until_date', label: 'On a specific date' },
              { v: 'occurrences', label: 'After a number of contributions' },
            ] as const).map((opt) => (
              <button key={opt.v} onClick={() => setEndType(opt.v)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all"
                style={{ borderColor: endType === opt.v ? C.forest : C.parchmentDark, background: endType === opt.v ? 'var(--status-success-bg)' : C.white }}>
                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: endType === opt.v ? C.forest : C.inkSubtle }}>
                  {endType === opt.v && <div className="w-2 h-2 rounded-full" style={{ background: C.forest }} />}
                </div>
                <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {endType === 'until_date' && (
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">End date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
          </div>
        )}
        {endType === 'occurrences' && (
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Number of contributions</label>
            <input type="number" value={occurrences} onChange={(e) => setOccurrences(e.target.value)}
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
          </div>
        )}

        <div className="rounded-xl border p-3" style={{ background: 'var(--status-success-bg)', borderColor: C.forestLight }}>
          <p style={{ fontFamily: FONT.sans, color: 'var(--status-success-text)' }} className="text-xs leading-relaxed">
            Each contribution is charged via your linked MoMo/Orange Money account and added to escrow automatically.
          </p>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={submit} fullWidth disabled={!canSubmit}>Set up recurring contribution</PillButton>
      </div>
    </AppShell>
  )
}

// ── Manage recurring contributions ─────────────────────────────────────────────
export function ManageRecurringScreen() {
  const nav = useNavigate()
  const { recurringContributions, pauseRecurring, resumeRecurring, cancelRecurring } = useFunding()
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const cancelTarget = recurringContributions.find((r) => r.id === cancelingId)

  return (
    <AppShell>
      <Header
        title="Recurring Contributions"
        back
        action={<button onClick={() => nav('/funder/browse')} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold">+ New</button>}
      />

      {recurringContributions.length === 0 ? (
        <div className="px-5 py-4">
          <EmptyState icon="🔁" title="No recurring contributions yet" description="Set one up from any project's funding page." illustration="tilt" />
        </div>
      ) : (
        <StaggerList className="px-5 py-4 space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
          {recurringContributions.map((r) => (
            <StaggerItem key={r.id}>
              <Card>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{r.projectTitle}</div>
                    <StatusBadge status={r.status === 'active' ? 'approved' : r.status === 'paused' ? 'pending' : 'rejected'} />
                  </div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-2">{fmt(r.amount)} · {r.frequency}</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px] mb-3">
                    {r.status === 'active' ? `Next charge: ${r.nextChargeDate}` : r.status === 'paused' ? 'Paused' : 'Cancelled'}
                    {r.endType === 'until_date' && r.endDate && ` · Ends ${r.endDate}`}
                    {r.endType === 'occurrences' && r.occurrences && ` · ${r.occurrences} total`}
                  </div>
                  {r.status !== 'cancelled' && (
                    <div className="flex gap-2 pt-3 border-t" style={{ borderColor: C.parchmentDark }}>
                      {r.status === 'active' ? (
                        <button onClick={() => pauseRecurring(r.id)} className="flex-1 py-2 rounded-lg text-xs font-semibold border" style={{ borderColor: C.parchmentDark, color: C.inkMuted, fontFamily: FONT.sans }}>Pause</button>
                      ) : (
                        <button onClick={() => resumeRecurring(r.id)} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}>Resume</button>
                      )}
                      <button onClick={() => setCancelingId(r.id)} className="flex-1 py-2 rounded-lg text-xs font-semibold border" style={{ borderColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}>Cancel</button>
                    </div>
                  )}
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onCancel={() => setCancelingId(null)}
        onConfirm={() => { if (cancelingId) cancelRecurring(cancelingId); setCancelingId(null) }}
        title="Cancel this recurring contribution?"
        description={cancelTarget ? `You'll stop automatically contributing ${fmt(cancelTarget.amount)} ${cancelTarget.frequency} to ${cancelTarget.projectTitle}. You can always set up a new one later.` : undefined}
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
