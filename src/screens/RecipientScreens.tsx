import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { useOfflineQueue } from '../offlineQueue'
import { C, FONT, AppShell, Card, Stars, StatusBadge, ProgressBar, PillButton, Header, MomoOmPicker, VerticalSteps } from '../components/MobileLayout'
import { Chip } from '../components/Chip'
import { EmptyState } from '../components/EmptyState'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'
import { useRatingSummaryQuery, useRatingsQuery, useCreateRatingMutation } from '../api/reputation'


// ── Milestone submission ───────────────────────────────────────────────────────
function filesToDataUrls(files: FileList): Promise<string[]> {
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        }),
    ),
  )
}

export function MilestoneSubmitScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { projects, submitMilestoneProof } = useApp()
  const { isOnline, queue, enqueue, syncNow, isSyncing } = useOfflineQueue()
  const { show: showToast } = useToast()
  const project = projects.find((p) => p.id === id) ?? projects.find((p) => p.milestones.some((m) => m.status === 'pending')) ?? projects[0]
  const milestone = project.milestones.find((m) => m.status === 'pending') ?? project.milestones.find((m) => m.status !== 'released') ?? project.milestones[0]
  const [step, setStep] = useState<'capture' | 'submitted' | 'queued'>('capture')
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [geo, setGeo] = useState<{ lat: number; lng: number; label: string } | null>(null)
  const [geoStatus, setGeoStatus] = useState<'locating' | 'ok' | 'unavailable'>('locating')

  // Real GPS — works fully offline, no network required to read device location.
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('unavailable')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setGeo({ lat: latitude, lng: longitude, label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` })
        setGeoStatus('ok')
      },
      () => setGeoStatus('unavailable'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [])

  // If this milestone already has an unsynced queue entry (e.g. captured offline,
  // navigated away, came back before it synced), show its status instead of a blank form.
  const existingQueued = queue.find((q) => q.projectId === project.id && q.milestoneId === milestone.id && q.status !== 'synced')

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const urls = await filesToDataUrls(files)
    setPhotos((p) => [...p, ...urls])
    setPhotoFiles((f) => [...f, ...Array.from(files)])
  }

  const submit = async () => {
    if (isOnline) {
      setSubmitting(true)
      try {
        await submitMilestoneProof(project.id, milestone.id, photoFiles, geo ? { lat: geo.lat, lng: geo.lng } : null, notes)
        setStep('submitted')
      } catch (err) {
        showToast({ title: 'Submission failed', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
      } finally {
        setSubmitting(false)
      }
      return
    }
    await enqueue({
      projectId: project.id,
      projectTitle: project.title,
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      photos,
      notes,
      geotag: geo,
    })
    setStep('queued')
  }

  if (step === 'submitted') {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--status-info-bg)' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 4V22M12 10L18 4L24 10" stroke="var(--status-info-text)" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M8 28H28" stroke="var(--status-info-text)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Proof submitted</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-2 leading-relaxed">
            Your milestone evidence is under review. An independent verifier will check the site and evidence within 72 hours.
          </p>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            Once verified and approved by the funder, <strong style={{ color: C.ink }}>{fmt(milestone.amount)}</strong> will be released to your account.
          </p>
          <div className="w-full rounded-2xl border p-4 mb-6" style={{ borderColor: C.parchmentDark, background: C.parchment }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Submission ID</div>
            <div style={{ fontFamily: FONT.mono, color: C.ink }} className="text-sm">SUB-2025-{Math.floor(Math.random() * 90000 + 10000)}</div>
          </div>
          <PillButton onClick={() => nav('/home')} fullWidth>Return to dashboard</PillButton>
        </div>
      </AppShell>
    )
  }

  if (step === 'queued' || existingQueued) {
    const item = existingQueued
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--status-warning-bg)' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="3" fill={C.amber} />
              <circle cx="18" cy="18" r="11" stroke={C.amber} strokeWidth="2" strokeDasharray="4 4" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Saved on this device</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-2 leading-relaxed">
            You're offline, so this evidence ({item?.photos.length ?? photos.length} photo{(item?.photos.length ?? photos.length) === 1 ? '' : 's'}, notes, and GPS location) is saved on this device.
          </p>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-6">
            It will upload automatically as soon as you're back online — nothing else to do.
          </p>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'var(--status-warning-bg)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.amber }} />
            <span style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="text-[9px] uppercase tracking-wider">Pending sync</span>
          </div>
          {isOnline && (
            <PillButton onClick={syncNow} fullWidth disabled={isSyncing}>{isSyncing ? 'Syncing…' : 'Try syncing now'}</PillButton>
          )}
          <div className="mt-3 w-full">
            <PillButton onClick={() => nav('/home')} variant="ghost" fullWidth>Return to dashboard</PillButton>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Submit Milestone Proof" subtitle={project.title} back />

      <div className="px-5 py-5 space-y-5 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {/* Milestone card */}
        <div className="rounded-2xl border-2 p-4" style={{ borderColor: C.forest, background: 'var(--status-success-bg)' }}>
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] uppercase tracking-widest mb-1">Submitting for</div>
          <div style={{ fontFamily: FONT.serif }} className="font-bold">{milestone.title}</div>
          <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs mt-0.5">{fmt(milestone.amount)} held in escrow</div>
        </div>

        {/* Photo upload */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Photo / video evidence</div>
          {photos.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {photos.map((src, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-video">
                    <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="white" strokeWidth="1.3" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <label
                className="block w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium text-center cursor-pointer"
                style={{ borderColor: C.forest, color: C.forest, fontFamily: FONT.sans }}
              >
                + Add another photo
                <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <label
                className="w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-3 transition-all active:scale-95 cursor-pointer"
                style={{ borderColor: C.parchmentDark, background: C.white }}
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.parchment }}>
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <rect x="2" y="6" width="22" height="16" rx="2" stroke={C.inkSubtle} strokeWidth="1.4" />
                    <circle cx="13" cy="14" r="4" stroke={C.inkSubtle} strokeWidth="1.3" />
                    <path d="M8 6V4C8 3.4 8.4 3 9 3H17C17.6 3 18 3.4 18 4V6" stroke={C.inkSubtle} strokeWidth="1.3" />
                  </svg>
                </div>
                <div className="text-center">
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">Take photo or upload</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5 uppercase tracking-wider">Min. 2 photos required · works offline</div>
                </div>
                <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
              </label>
            </div>
          )}
        </div>

        {/* Geotag display — real device GPS, no network required */}
        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Auto-geotag</div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--status-info-bg)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2C5.8 2 4 3.8 4 6C4 9.5 8 14 8 14C8 14 12 9.5 12 6C12 3.8 10.2 2 8 2Z" stroke="var(--status-info-text)" strokeWidth="1.3" />
                <circle cx="8" cy="6" r="1.5" fill="var(--status-info-text)" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-xs font-semibold">
                {geoStatus === 'locating' ? 'Locating…' : geoStatus === 'ok' ? 'GPS location attached' : 'Location unavailable'}
              </div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">
                {geoStatus === 'ok' && geo ? `${geo.label} · ${new Date().toLocaleDateString()}` : geoStatus === 'unavailable' ? 'Enable location access to attach GPS proof' : 'Waiting for a GPS fix…'}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Notes for the funder</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Describe what was completed, any challenges, or what happens next..."
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }}
          />
        </div>

        {/* What happens next */}
        <div className="rounded-xl p-4 border" style={{ background: 'var(--status-warning-bg)', borderColor: 'var(--status-warning-bg)' }}>
          <div style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="text-[10px] uppercase tracking-widest mb-2">After submission</div>
          <div className="space-y-2">
            {['A local verifier reviews the evidence on-site (72h)', 'The funder receives your proof for approval', 'Funds are released once approved'].map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: C.amber, fontFamily: FONT.mono }}>
                  <span className="text-[8px] font-bold" style={{ color: C.forestDark }}>{i + 1}</span>
                </div>
                <span style={{ fontFamily: FONT.sans, color: 'var(--status-warning-text)' }} className="text-xs">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        {!isOnline && photos.length > 0 && (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-center text-xs mb-3">You're offline — this will be saved on your device and sync automatically once you're back online.</p>
        )}
        <PillButton onClick={submit} fullWidth disabled={photos.length === 0 || submitting}>
          {submitting ? 'Submitting…' : photos.length === 0 ? 'Add at least one photo' : isOnline ? 'Submit milestone proof' : 'Save for sync'}
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Withdrawal screen ─────────────────────────────────────────────────────────
export function WithdrawalScreen() {
  const nav = useNavigate()
  const [method, setMethod] = useState<'momo' | 'om'>('momo')
  const [step, setStep] = useState<'select' | 'success'>('select')
  const available = 400000

  if (step === 'success') {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.forest }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Withdrawal initiated</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            {fmt(available)} will arrive in your {method === 'momo' ? 'MTN MoMo' : 'Orange Money'} account within 5–15 minutes.
          </p>
          <PillButton onClick={() => nav('/home')} fullWidth>Done</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Withdraw Funds" back />

      <div className="px-5 py-5 space-y-4 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl p-5 text-center" style={{ background: C.forestDark }}>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-xs uppercase tracking-widest mb-1">Available to withdraw</div>
          <div style={{ fontFamily: FONT.serif }} className="text-4xl font-bold text-white">{fmt(available)}</div>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.5)' }} className="text-[10px] mt-2 uppercase tracking-wider">From milestone 1 release</div>
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Withdraw to</label>
          <MomoOmPicker method={method} onChange={setMethod} />
        </div>

        <div className="border-2 rounded-xl px-4 py-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-1">Sending to</div>
          <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">+237 677 234 891</div>
        </div>

        <div className="rounded-xl p-3 border" style={{ background: C.parchment, borderColor: C.parchmentDark }}>
          <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
            <span>Amount</span><span style={{ color: C.ink }}>{fmt(available)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
            <span>Platform fee (1.5%)</span><span style={{ color: C.ink }}>{fmt(Math.round(available * 0.015))}</span>
          </div>
          <div className="flex justify-between text-xs mt-1 pt-1 border-t font-bold" style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, color: C.ink }}>
            <span>You receive</span><span>{fmt(Math.round(available * 0.985))}</span>
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={() => setStep('success')} fullWidth>Withdraw now</PillButton>
      </div>
    </AppShell>
  )
}

// ── My reputation screen ──────────────────────────────────────────────────────
export function ReputationScreen() {
  const { name, projects, devUserId } = useApp()
  const { data: summary } = useRatingSummaryQuery(devUserId ?? undefined)
  const { data: reviews = [] } = useRatingsQuery({ toUserId: devUserId ?? undefined, roleContext: 'recipient' })
  const projectsDone = projects.filter((p) => p.recipientId === devUserId && p.status === 'completed').length
  const avg = summary?.average ?? 0
  const initials = (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

  return (
    <AppShell>
      <Header title="My Reputation" back tone="dark" background={C.forest}>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: 'rgba(255,255,255,0.15)', fontFamily: FONT.serif, color: C.white }}>
            {initials}
          </div>
          <div>
            <div style={{ fontFamily: FONT.serif }} className="text-xl font-bold text-white">{name || 'You'}</div>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} width="14" height="14" viewBox="0 0 14 14" fill={i <= Math.round(avg) ? C.amber : 'rgba(255,255,255,0.25)'}>
                  <path d="M7 1L8.8 5.2H13L9.5 7.8L10.8 12L7 9.5L3.2 12L4.5 7.8L1 5.2H5.2L7 1Z" />
                </svg>
              ))}
              <span style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.8)' }} className="text-sm ml-1">{avg.toFixed(1)}</span>
            </div>
            <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] mt-0.5">{summary?.count ?? 0} reviews · {projectsDone} projects completed</div>
          </div>
        </div>
      </Header>

      <div className="px-5 py-5 space-y-4 sm:mx-auto sm:max-w-2xl">
        {/* Reviews */}
        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Funder reviews</p>
          {reviews.length === 0 && (
            <Card>
              <div className="p-4 text-center">
                <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">No reviews yet — complete a project to receive your first rating.</p>
              </div>
            </Card>
          )}
          <StaggerList className="space-y-3">
            {reviews.map((r) => (
              <StaggerItem key={r.id}>
                <Card variant="elevated">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{r.fromName}</div>
                        <Stars rating={r.score} />
                      </div>
                      <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{r.date}</span>
                    </div>
                    <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed italic">"{r.comment || '(No written review)'}"</p>
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

// ── Recipient projects list ───────────────────────────────────────────────────
export function RecipientProjectsScreen() {
  const nav = useNavigate()
  const { projects } = useApp()
  const { queue } = useOfflineQueue()
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? projects : projects.filter((p) => p.status === filter)

  return (
    <AppShell>
      <Header
        title="My Projects"
        back
        action={
          <button onClick={() => nav('/recipient/submit')} style={{ fontFamily: FONT.sans, color: C.forest }} className="whitespace-nowrap text-sm font-semibold">
            Submit proof →
          </button>
        }
      >
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'active', 'completed'].map((f) => (
            <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </Chip>
          ))}
        </div>
      </Header>

      <div className="px-5 py-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="No projects yet"
            description="Create a funding request or wait for a funder to assign you a project."
            illustration="tilt"
            action={<PillButton onClick={() => nav('/funder/create')}>Create a request</PillButton>}
          />
        ) : (
          <StaggerList className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
            {filtered.map((p) => {
              const pct = Math.round((p.raised / p.totalAmount) * 100)
              const released = p.milestones.filter((m) => m.status === 'released')
              const pendingSync = queue.some((q) => q.projectId === p.id && q.status !== 'synced')
              return (
                <StaggerItem key={p.id}>
                  <Card variant="interactive" onClick={() => nav(`/funder/project/${p.id}`)}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{p.title}</div>
                        {pendingSync ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-1" style={{ background: 'var(--status-warning-bg)' }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.amber }} />
                            <span style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="text-[9px] uppercase tracking-wider font-bold">Pending sync</span>
                          </span>
                        ) : (
                          <StatusBadge status={p.status} />
                        )}
                      </div>
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-3">{p.location} · {p.category}</div>
                      <ProgressBar pct={pct} />
                      <div className="flex justify-between mt-2">
                        <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px]">{fmt(p.raised)} raised</span>
                        <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px]">{released.length}/{p.milestones.length} milestones</span>
                      </div>
                    </div>
                  </Card>
                </StaggerItem>
              )
            })}
          </StaggerList>
        )}
      </div>
    </AppShell>
  )
}

// ── Submission status screen ──────────────────────────────────────────────────
export function SubmissionStatusScreen() {
  const { projects } = useApp()
  const project = projects.find((p) => p.milestones.some((m) => m.status === 'under_review')) ?? projects[0]
  const milestone = project.milestones.find((m) => m.status === 'under_review') ?? project.milestones[1] ?? project.milestones[0]

  const steps = [
    { label: 'Proof submitted', done: true, time: '19 Jul, 14:23' },
    { label: 'Verifier review', done: false, current: milestone.status === 'under_review', time: 'Estimated: 20 Jul' },
    { label: 'Funder approval', done: false, time: 'Pending verifier' },
    { label: 'Funds released', done: milestone.status === 'released', time: 'Pending approval' },
  ]

  return (
    <AppShell noNav>
      <Header title="Submission Status" subtitle={project.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl border-2 p-4" style={{ borderColor: C.amber, background: 'var(--status-warning-bg)' }}>
          <div style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="text-[10px] uppercase tracking-widest mb-1">Under review</div>
          <div style={{ fontFamily: FONT.serif }} className="font-bold">{milestone.title}</div>
          <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs mt-0.5">{fmt(milestone.amount)} to be released</div>
        </div>

        <VerticalSteps steps={steps} />
      </div>
    </AppShell>
  )
}

// ── Rate recipient screen ─────────────────────────────────────────────────────
export function RateRecipientScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { projects } = useApp()
  const { show: showToast } = useToast()
  const project = projects.find((p) => p.id === id) ?? projects[0]
  const createRating = useCreateRatingMutation()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = async () => {
    if (!project.recipientId) {
      showToast({ title: 'Cannot rate this recipient', description: 'This project has no owner account attached.', tone: 'error' })
      return
    }
    try {
      await createRating.mutateAsync({ toUserId: project.recipientId, projectId: project.id, score: rating, comment, roleContext: 'recipient' })
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
            Your feedback helps build trust in the community. It will be visible on {project.recipient}'s profile.
          </p>
          <PillButton onClick={() => nav('/home')} fullWidth>Return to dashboard</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Rate Recipient" back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3" style={{ background: C.forest, fontFamily: FONT.serif }}>
            {project.recipient[0]}
          </div>
          <div style={{ fontFamily: FONT.sans }} className="font-semibold">{project.recipient}</div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mt-0.5">{project.title}</div>
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
              {rating >= 4 ? 'Excellent work!' : rating >= 3 ? 'Good experience' : 'Needs improvement'}
            </div>
          )}
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Your review (optional)</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4}
            placeholder="How was the communication, proof quality, and timeliness?"
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm resize-none"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }} />
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton onClick={submit} fullWidth disabled={rating === 0 || createRating.isPending}>
          {createRating.isPending ? 'Submitting…' : 'Submit rating'}
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Project history screen (recipient) ────────────────────────────────────────
export function ProjectHistoryScreen() {
  const nav = useNavigate()
  const { projects } = useApp()

  const history = projects.map((p) => ({
    ...p,
    amountReceived: p.milestones.filter((m) => m.status === 'released').reduce((s, m) => s + m.amount, 0),
  }))

  return (
    <AppShell>
      <Header title="Project History" back />

      <StaggerList className="px-5 py-4 space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
        {history.map((p) => (
          <StaggerItem key={p.id}>
            <Card variant="interactive" onClick={() => nav(`/funder/project/${p.id}`)}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">{p.title}</div>
                  <StatusBadge status={p.status} />
                </div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider mb-2">{p.location}</div>
                <div className="flex justify-between items-center">
                  <div>
                    <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px]">Received: </span>
                    <span style={{ fontFamily: FONT.mono, color: C.forest }} className="text-xs font-bold">{fmt(p.amountReceived)}</span>
                  </div>
                  <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">
                    {p.milestones.filter((m) => m.status === 'released').length}/{p.milestones.length} milestones
                  </span>
                </div>
              </div>
            </Card>
          </StaggerItem>
        ))}
      </StaggerList>
    </AppShell>
  )
}
