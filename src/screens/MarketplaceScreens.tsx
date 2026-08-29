import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp, fmt } from '../context'
import { useCreateCertificationMutation } from '../api/certifications'
import { useAvailabilityQuery, useSetAvailabilityMutation } from '../api/contractors'
import { C, FONT, AppShell, PillButton, Header } from '../components/MobileLayout'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'
import { calculateCameroonConstructionMaterials, type ConstructionEstimateResult } from '../utils/constructionEstimator'
import { formatDualPrice } from '../utils/currency'

// ── Add certification ────────────────────────────────────────────────────────────
export function AddCertificationScreen() {
  const nav = useNavigate()
  const { show: showToast } = useToast()
  const createCertification = useCreateCertificationMutation()

  const [name, setName] = useState('')
  const [issuer, setIssuer] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const canSubmit = name.trim() !== '' && issuer.trim() !== '' && file !== null

  const submit = async () => {
    if (!canSubmit || !file) return
    try {
      await createCertification.mutateAsync({ name, issuer, file })
      setSubmitted(true)
    } catch (err) {
      showToast({ title: 'Failed to submit certificate', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  if (submitted) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--status-warning-bg)' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="6" y="4" width="24" height="28" rx="2" stroke={C.amber} strokeWidth="2" />
              <path d="M13 16L16 19L23 12" stroke={C.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Certificate submitted</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            Your certificate is under review. This usually takes 24–48 hours before it shows as verified on your profile.
          </p>
          <PillButton onClick={() => nav('/contractor/profile')} fullWidth>Back to profile</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Add Certification" back />

      <div className="px-5 py-5 space-y-4 sm:mx-auto sm:max-w-2xl">
        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Certificate name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Certified Electrician"
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
        </div>
        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Issuing body</label>
          <input value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g. Cameroon Board of Engineers"
            className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
            style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }} />
        </div>
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Certificate document</div>
          <label
            className="w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-3 transition-all cursor-pointer"
            style={{ borderColor: file ? C.forest : C.parchmentDark, background: file ? 'var(--status-success-bg)' : C.white }}
          >
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file ? (
              <>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: C.forest }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M4 11L9 16L18 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <span style={{ fontFamily: FONT.sans, color: C.forest }} className="text-sm font-semibold">Document uploaded</span>
              </>
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="6" y="4" width="20" height="24" rx="2" stroke={C.inkSubtle} strokeWidth="1.5" />
                  <line x1="11" y1="11" x2="21" y2="11" stroke={C.inkSubtle} strokeWidth="1.3" />
                  <line x1="11" y1="16" x2="21" y2="16" stroke={C.inkSubtle} strokeWidth="1.3" />
                  <line x1="11" y1="21" x2="17" y2="21" stroke={C.inkSubtle} strokeWidth="1.3" />
                </svg>
                <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">Tap to upload certificate</span>
                <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">JPG, PNG or PDF</span>
              </>
            )}
          </label>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton onClick={submit} fullWidth disabled={!canSubmit || createCertification.isPending}>{createCertification.isPending ? 'Submitting…' : 'Submit for verification'}</PillButton>
      </div>
    </AppShell>
  )
}

// ── Material cost estimator ──────────────────────────────────────────────────────
export function MaterialCostEstimatorScreen() {
  const nav = useNavigate()
  const [surfaceAreaInput, setSurfaceAreaInput] = useState('120')
  const [floors, setFloors] = useState(1)
  const [quality, setQuality] = useState<'standard' | 'premium'>('standard')

  const surfaceArea = parseFloat(surfaceAreaInput) || 120
  const estimate: ConstructionEstimateResult = calculateCameroonConstructionMaterials(
    surfaceArea,
    floors,
    quality
  )

  const PRESET_AREAS = [80, 120, 160, 250]

  return (
    <AppShell>
      <Header title="Construction Material & Cost Estimator" subtitle="Civil Engineering Standards (Cameroon)" back />

      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        {/* Layout Inputs */}
        <div className="rounded-2xl border p-4 space-y-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: FONT.serif, color: C.forest }} className="text-base font-bold">Project Dimensions</span>
          </div>

          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">
              Ground Surface Area (m²)
            </label>
            <input
              type="number"
              value={surfaceAreaInput}
              onChange={(e) => setSurfaceAreaInput(e.target.value)}
              className="w-full border-2 rounded-xl px-4 py-2.5 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, background: C.parchment, fontFamily: FONT.sans, color: C.ink }}
            />
            <div className="flex gap-2 mt-2">
              {PRESET_AREAS.map((sqm) => (
                <button
                  key={sqm}
                  type="button"
                  onClick={() => setSurfaceAreaInput(sqm.toString())}
                  className="flex-1 py-1 px-2 rounded-lg border text-xs font-mono transition-all"
                  style={{
                    borderColor: surfaceArea === sqm ? C.forest : C.parchmentDark,
                    background: surfaceArea === sqm ? 'rgba(15, 122, 82, 0.12)' : C.white,
                    color: surfaceArea === sqm ? C.forest : C.inkMuted,
                  }}
                >
                  {sqm} m²
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">
              Elevation / Floors
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 1, label: 'Ground Floor' },
                { val: 2, label: 'R+1 (2 Floors)' },
                { val: 3, label: 'R+2 (3 Floors)' },
              ].map((f) => (
                <button
                  key={f.val}
                  type="button"
                  onClick={() => setFloors(f.val)}
                  className="py-2 px-2 rounded-xl border text-xs font-medium transition-all text-center"
                  style={{
                    borderColor: floors === f.val ? C.forest : C.parchmentDark,
                    background: floors === f.val ? 'rgba(15, 122, 82, 0.12)' : C.white,
                    color: floors === f.val ? C.forest : C.ink,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">
              Concrete Quality Grade
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'standard' as const, label: 'Standard Mix' },
                { val: 'premium' as const, label: 'High-Strength Mix' },
              ].map((q) => (
                <button
                  key={q.val}
                  type="button"
                  onClick={() => setQuality(q.val)}
                  className="py-2 px-2 rounded-xl border text-xs font-medium transition-all text-center"
                  style={{
                    borderColor: quality === q.val ? C.forest : C.parchmentDark,
                    background: quality === q.val ? 'rgba(15, 122, 82, 0.12)' : C.white,
                    color: quality === q.val ? C.forest : C.ink,
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hero Budget Banner */}
        <div className="rounded-2xl p-5" style={{ background: C.forestDark }}>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.7)' }} className="text-[10px] uppercase tracking-widest mb-1">
            Total Estimated Materials Budget
          </div>
          <div style={{ fontFamily: FONT.serif }} className="text-3xl font-bold text-white">
            {fmt(estimate.totalMaterialCostXaf)}
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md mt-2 text-xs font-mono text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <span>{formatDualPrice(estimate.totalMaterialCostXaf, 'EUR')}</span>
          </div>

          <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/15 text-xs text-white/80">
            <span>Total Built Area: {estimate.totalBuiltAreaSqm} m²</span>
            <span>~{fmt(estimate.costPerSqm)} / m²</span>
          </div>
        </div>

        {/* Itemized Bill of Materials */}
        <div className="space-y-2">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest px-1">
            Itemized Bill of Materials (BOM)
          </div>

          {estimate.items.map((item) => (
            <div key={item.id} className="rounded-xl border p-3.5 space-y-1.5" style={{ borderColor: C.parchmentDark, background: C.white }}>
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{item.name}</div>
                  <div style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">{item.specification}</div>
                </div>
                <div style={{ fontFamily: FONT.serif, color: C.forest }} className="text-sm font-bold whitespace-nowrap">{fmt(item.totalCost)}</div>
              </div>

              <div className="flex justify-between items-center text-xs pt-1 border-t" style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, color: C.inkSubtle }}>
                <span>Qty: {item.quantity} {item.unit}</span>
                <span>@{fmt(item.unitPrice)} / {item.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <PillButton onClick={() => nav('/materials')} fullWidth>
          Generate Quincaillerie Supply Order
        </PillButton>
      </div>
    </AppShell>
  )
}

// ── Contractor availability calendar ─────────────────────────────────────────────
function getMonthGrid(year: number, month: number) {
  const startWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array.from({ length: startWeekday }, () => null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function AvailabilityCalendarScreen() {
  const { contractorId } = useParams()
  const { contractors, devUserId } = useApp()
  const { show: showToast } = useToast()
  const contractor = contractorId
    ? (contractors.find((c) => c.id === contractorId) ?? contractors[0])
    : (contractors.find((c) => c.id === devUserId) ?? contractors[0])
  const readOnly = !!contractorId
  const { data: contractorAvailability = {} } = useAvailabilityQuery(contractorId)
  const setAvailability = useSetAvailabilityMutation()

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const cells = getMonthGrid(viewYear, viewMonth)
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setViewMonth(m)
    setViewYear(y)
  }

  const dateKey = (day: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return (
    <AppShell>
      <Header
        title={readOnly ? `${contractor.name}'s Availability` : 'My Availability'}
        subtitle={readOnly ? 'Read-only — visible to project owners' : 'Tap a date to mark it unavailable'}
        back
      />

      <div className="px-5 py-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-parchment)]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke={C.ink} strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <span style={{ fontFamily: FONT.serif }} className="font-bold">{monthLabel}</span>
            <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-parchment)]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke={C.ink} strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-center text-[9px] uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />
              const key = dateKey(day)
              const status = contractorAvailability[key] ?? 'available'
              const isPast = new Date(viewYear, viewMonth, day) < startOfToday
              const disabled = readOnly || isPast || setAvailability.isPending
              const toggle = () => {
                setAvailability.mutate(
                  { date: key, isAvailable: status === 'unavailable' },
                  { onError: (err) => showToast({ title: 'Failed to update availability', description: apiErrorMessage(err, 'Please try again'), tone: 'error' }) }
                )
              }
              return (
                <button
                  key={i}
                  disabled={disabled}
                  onClick={toggle}
                  className="aspect-square rounded-lg text-xs font-semibold flex items-center justify-center transition-all"
                  style={{
                    background: status === 'unavailable' ? 'var(--status-error-bg)' : 'var(--status-success-bg)',
                    color: status === 'unavailable' ? 'var(--status-error-text)' : 'var(--status-success-text)',
                    opacity: isPast ? 0.35 : 1,
                    cursor: disabled ? 'default' : 'pointer',
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: 'var(--status-success-bg)', border: `1px solid ${C.forestLight}` }} />
            <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px] uppercase tracking-wider">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: 'var(--status-error-bg)', border: '1px solid var(--status-error-text)' }} />
            <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px] uppercase tracking-wider">Unavailable</span>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
