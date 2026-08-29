import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { useOfflineQueue } from '../offlineQueue'
import { C, FONT, AppShell, Card, Stars, StatusBadge, ProgressBar, PillButton, Header, VerticalSteps } from '../components/MobileLayout'
import { Chip } from '../components/Chip'
import { EmptyState } from '../components/EmptyState'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { DeferredReveal, SkeletonCard } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'
import { useRatingSummaryQuery, useRatingsQuery, useCreateRatingMutation } from '../api/reputation'
import { useMyProjectsQuery, useProjectQuery } from '../api/projects'
import { useReverseGeocodeQuery } from '../api/tools'
import { useMaterialOrdersForMilestoneQuery } from '../api/materialOrders'
import { MaterialOrderCard } from '../components/MaterialOrderCard'
import { useSessionQuery } from '../api/session'
import type { PayoutMethod } from '../api/payoutMethods'
import { useWithdrawableQuery, useWithdrawMutation } from '../api/escrow'
import { AIPhotoInspector } from '../components/AIPhotoInspector'


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
  const { devUserId, bids, submitMilestoneProof } = useApp()
  // Two different callers, two different queries. With no id, this is the
  // recipient dashboard's generic "submit proof" entry point — "my next
  // pending milestone across projects I own" only makes sense scoped to
  // useMyProjectsQuery. With an id (every other entry point, including a
  // contractor's "Submit next milestone proof" on their own accepted tender
  // — see ContractDetailScreen), fetch that exact project directly instead:
  // useMyProjectsQuery hardcodes projectType=funding and ownerId=me, which a
  // tender-type project the viewer merely *works on* (as its accepted
  // contractor, not its owner) never matches — every such lookup 404'd here
  // even though the backend's own submitEvidence already explicitly allows
  // the accepted contractor (see projectController.assertProjectParty).
  // getOne has no extra access check, so this is safe for both; the actual
  // write (submitEvidence) enforces the real authorization boundary.
  const { data: myProjects = [], isLoading: myProjectsLoading } = useMyProjectsQuery(id ? undefined : (devUserId ?? undefined))
  const { data: directProject, isLoading: directProjectLoading } = useProjectQuery(id)
  const isLoading = id ? directProjectLoading : myProjectsLoading
  const project = id ? directProject : (myProjects.find((p) => p.milestones.some((m) => m.status === 'pending')) ?? myProjects[0])
  const milestone = project?.milestones.find((m) => m.status === 'pending') ?? project?.milestones.find((m) => m.status !== 'released') ?? project?.milestones[0]
  const { isOnline, queue, enqueue, syncNow, isSyncing } = useOfflineQueue()
  const { show: showToast } = useToast()
  // Whether the current viewer is here as the accepted contractor on a
  // tender (not the project's owner) — decides where "back to my stuff"
  // should actually go after submitting, since /recipient/... routes are
  // scoped to projects the viewer owns and 404 the same way this screen
  // used to for a contractor.
  const myBidForThisProject = project ? bids.find((b) => b.jobId === project.id) : undefined
  // Called unconditionally (before the not-found early return below) per the
  // Rules of Hooks — the query itself no-ops via `enabled` until both ids resolve.
  const { data: materialOrders = [] } = useMaterialOrdersForMilestoneQuery(project?.id, milestone?.id)
  const [step, setStep] = useState<'capture' | 'submitted' | 'queued'>('capture')
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [geo, setGeo] = useState<{ lat: number; lng: number; label: string } | null>(null)
  const [geoStatus, setGeoStatus] = useState<'locating' | 'ok' | 'unavailable'>('locating')
  // Resolves the raw fix to a real place name ("Bonabéri, Douala, Littoral
  // Region") the moment it comes in — geo.label stays the raw-coordinate
  // fallback for while this is loading or if it fails (offline, geocoder
  // down), so there's always something to show either way.
  const { data: placeName, isLoading: placeNameLoading } = useReverseGeocodeQuery(geo?.lat, geo?.lng)

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

  if (isLoading) return <AppShell noNav>{null}</AppShell>
  if (!project || !milestone) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <EmptyState icon="camera" title="Project not found" description="This project isn't one of yours, or has no milestone to submit proof for." illustration="tilt" />
        </div>
      </AppShell>
    )
  }

  // If this milestone already has an unsynced queue entry (e.g. captured offline,
  // navigated away, came back before it synced), show its status instead of a blank form.
  const existingQueued = queue.find((q) => q.projectId === project.id && q.milestoneId === milestone.id && q.status !== 'synced')
  const materialOrder = materialOrders[0]

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
        await submitMilestoneProof(project.id, milestone.id, photoFiles, geo ? { lat: geo.lat, lng: geo.lng } : null, notes, placeName)
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
          <PillButton
            onClick={() => nav(myBidForThisProject ? `/contractor/contract/${myBidForThisProject.id}` : '/recipient/submission-status')}
            fullWidth
          >
            {myBidForThisProject ? 'Back to the job' : 'View submission status'}
          </PillButton>
          <div className="mt-3 w-full">
            <PillButton onClick={() => nav(myBidForThisProject ? '/contractor/bids' : '/home')} variant="ghost" fullWidth>
              {myBidForThisProject ? 'Back to My Bids' : 'Return to dashboard'}
            </PillButton>
          </div>
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
          {milestone.description && (
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-2 leading-relaxed">{milestone.description}</p>
          )}
        </div>

        {/* Sent back for corrections — the funder's most recent reason,
            shown prominently since this is exactly what needs fixing before
            resubmitting. */}
        {milestone.status === 'pending' && milestone.changeRequests.length > 0 && (
          <div className="rounded-2xl border p-4" style={{ borderColor: C.amber, background: 'var(--status-warning-bg)' }}>
            <div style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="text-[10px] uppercase tracking-widest mb-1">Corrections requested</div>
            <p style={{ fontFamily: FONT.sans, color: 'var(--status-warning-text)' }} className="text-sm italic">
              "{milestone.changeRequests[milestone.changeRequests.length - 1].reason}"
            </p>
          </div>
        )}

        {/* Materials — an alternative (or addition) to photo proof: request
            materials from a verified quincaillerie instead of handling cash
            yourself. Once they confirm, that becomes this milestone's
            evidence and payment routes straight to them on approval. */}
        {materialOrder ? (
          <MaterialOrderCard order={materialOrder} compact />
        ) : (
          <button
            onClick={() => nav(`/materials/request/${project.id}/${milestone.id}`)}
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-dashed text-sm font-semibold"
            style={{ borderColor: C.forest, color: C.forest, fontFamily: FONT.sans }}
          >
            Request materials from a verified store instead →
          </button>
        )}

        {/* AI Photo Inspector */}
        <div className="space-y-2">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">
            AI Photo Quality & Fraud Audit
          </div>
          <AIPhotoInspector
            label="Upload Milestone Site Photo for AI Inspection"
            onFileSelected={(file) => {
              // Add to files queue
              setPhotoFiles((f) => [...f, file])
              // Convert to dataUrl for preview
              filesToDataUrls(Object.assign([file], { item: () => file, length: 1 }) as unknown as FileList).then((urls) => {
                setPhotos((p) => [...p, ...urls])
              })
            }}
            onAnalysisComplete={(res) => {
              if (res.verdict === 'fail') {
                showToast({ title: 'AI Flagged Photo', description: res.summary, tone: 'error' })
              }
            }}
          />
        </div>

        {/* Photo upload */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Photo / video evidence gallery</div>
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
                {geoStatus === 'ok' && geo
                  ? `${placeNameLoading ? 'Resolving place name…' : placeName ? `${placeName} (${geo.label})` : geo.label} · ${new Date().toLocaleDateString()}`
                  : geoStatus === 'unavailable' ? 'Enable location access to attach GPS proof' : 'Waiting for a GPS fix…'}
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

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
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
  const { phone, devUserId } = useApp()
  const { show: showToast } = useToast()
  const { data: user } = useSessionQuery(devUserId ?? undefined)
  const { data: withdrawable, isLoading } = useWithdrawableQuery()
  const withdrawMutation = useWithdrawMutation()

  const payoutMethods: PayoutMethod[] = user?.payoutMethods || []
  const defaultMethod = payoutMethods.find((pm: PayoutMethod) => pm.isDefault) || payoutMethods[0]
  const [selectedMethodId, setSelectedMethodId] = useState<string>(defaultMethod?._id || '')
  const [step, setStep] = useState<'select' | 'success'>('select')
  const [settled, setSettled] = useState<{ amount: number; count: number } | null>(null)

  const activeMethod = payoutMethods.find((pm: PayoutMethod) => pm._id === selectedMethodId) || defaultMethod
  const destinationPhone = activeMethod?.phoneNumber || phone

  const available = withdrawable?.available ?? 0
  const entries = withdrawable?.entries ?? []
  const grossReleased = entries.reduce((sum, e) => sum + e.grossAmount, 0)
  const feeAlreadyDeducted = grossReleased - available

  const submitWithdrawal = async () => {
    try {
      const result = await withdrawMutation.mutateAsync()
      setSettled({ amount: result.amount, count: result.count })
      setStep('success')
    } catch (err) {
      showToast({ title: 'Withdrawal failed', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  if (isLoading) {
    return (
      <AppShell noNav>
        <Header title="Withdraw Funds" back />
        <div className="px-5 py-8"><SkeletonCard /></div>
      </AppShell>
    )
  }

  if (available === 0 && step !== 'success') {
    return (
      <AppShell noNav>
        <Header title="Withdraw Funds" back />
        <div className="px-5 py-8">
          <EmptyState
            icon="card"
            title="Nothing to withdraw yet"
            description="Funds show up here once a funder approves one of your milestones and it's released from escrow."
          />
        </div>
      </AppShell>
    )
  }

  if (step === 'success') {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.forest }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Withdrawal confirmed</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-2">
            {fmt(settled?.amount ?? 0)} from {settled?.count ?? 0} released milestone{settled?.count === 1 ? '' : 's'} was already sent to your {activeMethod?.provider === 'orange_money' ? 'Orange Money' : 'MTN MoMo'} account ({destinationPhone}) when each milestone was approved.
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
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.5)' }} className="text-[10px] mt-2 uppercase tracking-wider">
            From {entries.length} released milestone{entries.length === 1 ? '' : 's'}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block">Withdraw to</label>
            <button onClick={() => nav('/account/payout-settings')} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold">
              Manage accounts →
            </button>
          </div>

          {payoutMethods.length > 0 ? (
            <div className="space-y-2">
              {payoutMethods.map((pm: PayoutMethod) => (
                <button
                  key={pm._id}
                  type="button"
                  onClick={() => setSelectedMethodId(pm._id)}
                  className="w-full border-2 rounded-xl p-3 flex items-center justify-between transition-all text-left"
                  style={{
                    borderColor: selectedMethodId === pm._id || (!selectedMethodId && pm.isDefault) ? C.forest : C.parchmentDark,
                    background: selectedMethodId === pm._id || (!selectedMethodId && pm.isDefault) ? 'var(--color-surface)' : C.parchment,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0"
                      style={{ background: pm.provider === 'mtn_momo' ? '#FFCC00' : '#FF6600', color: pm.provider === 'mtn_momo' ? '#000' : '#fff' }}
                    >
                      {pm.provider === 'mtn_momo' ? 'MoMo' : 'OM'}
                    </div>
                    <div>
                      <p style={{ fontFamily: FONT.sans, color: C.ink }} className="text-xs font-semibold">
                        {pm.label || (pm.provider === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money')}
                      </p>
                      <p style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[11px]">
                        {pm.phoneNumber}
                      </p>
                    </div>
                  </div>
                  {(selectedMethodId === pm._id || (!selectedMethodId && pm.isDefault)) && (
                    <span style={{ color: C.forest }} className="text-xs font-bold font-mono">Selected</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="border-2 rounded-xl px-4 py-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-1">Default phone number</div>
              <div style={{ fontFamily: FONT.sans, color: destinationPhone ? C.ink : 'var(--status-error-text)' }} className="text-sm font-medium">
                {destinationPhone || 'No number on file — add one in Payout Settings'}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl p-3 border" style={{ background: C.parchment, borderColor: C.parchmentDark }}>
          <div className="flex justify-between text-xs" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
            <span>Gross released</span><span style={{ color: C.ink }}>{fmt(grossReleased)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>
            <span>Platform fee (already deducted)</span><span style={{ color: C.ink }}>{fmt(feeAlreadyDeducted)}</span>
          </div>
          <div className="flex justify-between text-xs mt-1 pt-1 border-t font-bold" style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, color: C.ink }}>
            <span>Already sent to you</span><span>{fmt(available)}</span>
          </div>
        </div>

        <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs text-center px-2">
          This amount was already disbursed to your MoMo/Orange Money account when each milestone released — "Withdraw now" just confirms you've received it.
        </p>
      </div>

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={submitWithdrawal} fullWidth disabled={!destinationPhone || withdrawMutation.isPending}>
          {withdrawMutation.isPending ? 'Confirming…' : 'Withdraw now'}
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── My reputation screen ──────────────────────────────────────────────────────
export function ReputationScreen() {
  const { name, devUserId } = useApp()
  const { data: projects = [] } = useMyProjectsQuery(devUserId ?? undefined)
  const { data: summary } = useRatingSummaryQuery(devUserId ?? undefined)
  const { data: reviews = [] } = useRatingsQuery({ toUserId: devUserId ?? undefined, roleContext: 'recipient' })
  const projectsDone = projects.filter((p) => p.status === 'completed').length
  const avg = summary?.average ?? 0
  const initials = (name || '?').split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

  return (
    <AppShell>
      <Header title="My Reputation" back tone="dark" background={C.forest}>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: 'rgba(255,255,255,0.15)', fontFamily: FONT.serif, color: '#fff' }}>
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
  const { devUserId } = useApp()
  const { data: projects = [] } = useMyProjectsQuery(devUserId ?? undefined)
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
          <DeferredReveal
            skeleton={
              <div className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-40" />)}
              </div>
            }
          >
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
          </DeferredReveal>
        )}
      </div>
    </AppShell>
  )
}

// ── Submission status screen ──────────────────────────────────────────────────
// Short, readable timestamp for a submission timeline — "19 Jul, 14:23" style,
// matching how the rest of this screen already formats dates. Falls back to a
// placeholder for evidence captured before capturedAt was recorded/synced.
function fmtSubmittedAt(iso: string | null): string {
  if (!iso) return 'Date unavailable'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Date unavailable'
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function SubmissionStatusScreen() {
  const { devUserId } = useApp()
  const { data: projects = [], isLoading } = useMyProjectsQuery(devUserId ?? undefined)
  // No route param — a recipient's dashboard only ever surfaces one active
  // project (see RecipientHome), so "the milestone under review, or the
  // most recently submitted one otherwise" is the same "my submission"
  // every entry point (dashboard Status action, the post-submit
  // confirmation screen) means by this — now scoped to MY projects, not
  // the platform-wide list.
  const project = projects.find((p) => p.milestones.some((m) => m.status === 'under_review'))
    ?? projects.find((p) => p.milestones.some((m) => m.evidence.length > 0))
    ?? projects[0]
  const milestone = project?.milestones.find((m) => m.status === 'under_review')
    ?? (project ? [...project.milestones].reverse().find((m) => m.evidence.length > 0) : undefined)
    ?? project?.milestones[0]

  if (isLoading) return <AppShell noNav>{null}</AppShell>
  if (!project || !milestone) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <EmptyState icon="camera" title="No submission yet" description="Submit proof for a milestone to see its status here." illustration="tilt" />
        </div>
      </AppShell>
    )
  }

  const latestEvidence = [...milestone.evidence].sort((a, b) => (b.capturedAt ?? '').localeCompare(a.capturedAt ?? ''))[0] ?? null

  const steps = [
    { label: 'Proof submitted', done: milestone.evidence.length > 0, time: latestEvidence ? fmtSubmittedAt(latestEvidence.capturedAt) : 'Not submitted yet' },
    { label: 'Verifier review', done: milestone.status === 'released' || milestone.status === 'disputed', current: milestone.status === 'under_review', time: milestone.status === 'under_review' ? 'In progress' : milestone.status === 'pending' ? 'Waiting on submission' : 'Reviewed' },
    { label: 'Funder approval', done: milestone.status === 'released', time: milestone.status === 'released' ? 'Approved' : 'Pending verifier' },
    { label: 'Funds released', done: milestone.status === 'released', time: milestone.status === 'released' ? 'Released to you' : 'Pending approval' },
  ]

  return (
    <AppShell noNav>
      <Header title="Submission Status" subtitle={project.title} back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl border-2 p-4" style={{ borderColor: C.amber, background: 'var(--status-warning-bg)' }}>
          <div className="mb-1"><StatusBadge status={milestone.status} /></div>
          <div style={{ fontFamily: FONT.serif }} className="font-bold">{milestone.title}</div>
          <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-xs mt-0.5">{fmt(milestone.amount)} to be released</div>
        </div>

        <VerticalSteps steps={steps} />

        {milestone.evidence.length > 0 && (
          <div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">
              What you submitted ({milestone.evidence.length})
            </div>
            <div className="grid grid-cols-2 gap-2">
              {milestone.evidence.map((e) => (
                <div key={e.id} className="relative rounded-xl overflow-hidden aspect-video border" style={{ borderColor: C.parchmentDark }}>
                  <img src={e.fileUrl} alt="Submitted evidence" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {latestEvidence?.notes && (
              <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mt-3 leading-relaxed">
                <span style={{ color: C.ink, fontWeight: 600 }}>Your note: </span>{latestEvidence.notes}
              </p>
            )}
          </div>
        )}
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
  // A funder rating a recipient can point at any real project (not just
  // one they own) — but an id that doesn't resolve is treated as not
  // found rather than silently substituting a different, wrong recipient.
  const project = id ? projects.find((p) => p.id === id) : projects[0]
  const createRating = useCreateRatingMutation()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = async () => {
    if (!project?.recipientId) {
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

  if (!project) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <EmptyState icon="star" title="Project not found" illustration="tilt" />
        </div>
      </AppShell>
    )
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

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
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
  const { devUserId } = useApp()
  const { data: projects = [] } = useMyProjectsQuery(devUserId ?? undefined)

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
