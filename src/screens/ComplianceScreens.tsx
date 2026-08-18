import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmt } from '../context'
import { useMyKycStatusQuery, useUploadKycDocumentMutation, useSubmitKycMutation, KYC_LARGE_TXN_THRESHOLD, type KycStatus, type KycResult } from '../api/kyc'
import { C, FONT, AppShell, Header, PillButton, StepIndicator, STATUS_TONE_VARS, type StatusTone } from '../components/MobileLayout'
import { ChipGroup } from '../components/Chip'
import { AppIcon, type IconName } from '../components/icons'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'

const STATUS_META: Record<KycStatus, { label: string; tone: StatusTone }> = {
  unverified: { label: 'Not verified', tone: 'neutral' },
  pending: { label: 'Under review', tone: 'warning' },
  verified: { label: 'Verified', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'error' },
}

// ── Explanatory screen + status ─────────────────────────────────────────────────
export function KycExplainerScreen() {
  const nav = useNavigate()
  const { data: status = 'unverified', isLoading } = useMyKycStatusQuery()
  const meta = STATUS_META[status]
  const toneVars = STATUS_TONE_VARS[meta.tone]

  return (
    <AppShell>
      <Header title="Identity Verification" back />
      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl border p-5 text-center" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <span className="inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ background: toneVars.bg, color: toneVars.text, fontFamily: FONT.mono }}>
            {isLoading ? 'Loading…' : meta.label}
          </span>
          {status === 'pending' && (
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mt-3 leading-relaxed">
              Your documents are being checked.
            </p>
          )}
          {status === 'verified' && (
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mt-3 leading-relaxed">
              Your identity is verified. You can fund, transact, and hire without limits.
            </p>
          )}
          {status === 'rejected' && (
            <div className="mt-3">
              <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed">
                Your last verification attempt didn't pass. Double-check your ID number and document photo, then try again.
              </p>
            </div>
          )}
          {status === 'unverified' && (
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mt-3 leading-relaxed">
              You haven't verified your identity yet. This is required before transactions above {fmt(KYC_LARGE_TXN_THRESHOLD)}.
            </p>
          )}
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Why we verify identity</p>
          <div className="space-y-2">
            {([
              { icon: 'shieldCheck', text: 'Protects the platform and other users from fraud and money laundering.' },
              { icon: 'wallet', text: 'Required by financial regulations before large escrow transactions.' },
              { icon: 'unlock', text: 'Unlocks unlimited funding, land purchases, and contractor payouts.' },
            ] as { icon: IconName; text: string }[]).map((item) => (
              <div key={item.text} className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
                <span className="flex-shrink-0" style={{ color: C.forest }}><AppIcon name={item.icon} size={18} /></span>
                <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(status === 'unverified' || status === 'rejected') && (
        <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
          <PillButton onClick={() => nav('/compliance/kyc/verify')} fullWidth>
            {status === 'rejected' ? 'Resubmit verification' : 'Start verification'}
          </PillButton>
        </div>
      )}
    </AppShell>
  )
}

// ── KYC verification flow ───────────────────────────────────────────────────────
// Two real steps, not three: the backend's Smile Identity Basic KYC job
// verifies an ID number against the issuing authority's records — it has no
// selfie/facial-match capability, so that step (and its fake "97% match
// confidence" readout) doesn't correspond to anything the backend can check.
const ID_TYPES = ['National ID card', 'Passport', 'Residence permit']

export function KycVerifyScreen() {
  const nav = useNavigate()
  const { show: showToast } = useToast()
  const uploadDocument = useUploadKycDocumentMutation()
  const submitKyc = useSubmitKycMutation()
  const [step, setStep] = useState<'id' | 'review' | 'done'>('id')
  const [idType, setIdType] = useState(ID_TYPES[0])
  const [idNumber, setIdNumber] = useState('')
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [result, setResult] = useState<KycResult | null>(null)
  const STEP_ORDER = ['id', 'review'] as const

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const url = await uploadDocument.mutateAsync(file)
      setDocumentUrl(url)
    } catch (err) {
      showToast({ title: 'Upload failed', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  const finish = async () => {
    try {
      const kycResult = await submitKyc.mutateAsync({ idType, idNumber, documentUrl: documentUrl ?? undefined })
      setResult(kycResult)
      setStep('done')
    } catch (err) {
      showToast({ title: 'Verification failed to submit', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  if (step === 'done' && result) {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: result.verified ? C.forest : 'var(--status-error-text)' }}>
            {result.verified ? (
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M8 18L15 25L28 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></svg>
            ) : (
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M11 11L25 25M25 11L11 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></svg>
            )}
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">{result.verified ? 'Identity verified' : 'Verification did not pass'}</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            {result.verified
              ? 'You can now fund, transact, and hire without limits.'
              : 'Double-check your ID number and document photo, then try again.'}
          </p>
          <PillButton onClick={() => nav('/compliance/kyc')} fullWidth>View verification status</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Verify Your Identity" back>
        <StepIndicator steps={['ID details', 'Review']} current={STEP_ORDER.indexOf(step as 'id' | 'review')} />
      </Header>

      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {step === 'id' && (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              Choose your document type, enter its number, and upload a clear photo.
            </p>
            <ChipGroup options={ID_TYPES} value={idType} onChange={(v) => setIdType(v as string)} />

            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Document number</label>
              <input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="e.g. 123456789"
                className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
              />
            </div>

            <label
              className="w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-3 transition-all cursor-pointer"
              style={{ borderColor: documentUrl ? C.forest : C.parchmentDark, background: documentUrl ? 'var(--status-success-bg)' : C.white }}
            >
              {uploadDocument.isPending ? (
                <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">Uploading…</span>
              ) : documentUrl ? (
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
                  <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">JPG or PNG</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          </>
        )}

        {step === 'review' && (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">Review your submission before sending it for verification.</p>
            <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Document type</span>
                <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{idType || ID_TYPES[0]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Document number</span>
                <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{idNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">ID document</span>
                <span style={{ fontFamily: FONT.sans, color: C.forest }} className="inline-flex items-center gap-1 text-sm font-semibold">
                  {documentUrl ? <>Uploaded <AppIcon name="check" size={14} strokeWidth={2.25} /></> : 'Not uploaded'}
                </span>
              </div>
            </div>
            <div className="rounded-xl p-4 border" style={{ background: 'var(--status-warning-bg)', borderColor: 'var(--status-warning-bg)' }}>
              <p style={{ fontFamily: FONT.sans, color: 'var(--status-warning-text)' }} className="text-xs leading-relaxed">
                By submitting, you confirm this information is accurate and consent to it being checked against the issuing authority's records.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="px-5 pb-8 pt-4 border-t backdrop-blur-xl sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.glassBorder, background: C.glassBg, boxShadow: C.shadowLg }}>
        <PillButton
          onClick={() => {
            if (step === 'id') setStep('review')
            else finish()
          }}
          fullWidth
          disabled={(step === 'id' && (!idType || !idNumber || !documentUrl)) || (step === 'review' && submitKyc.isPending)}
        >
          {step === 'review' ? (submitKyc.isPending ? 'Submitting…' : 'Submit for verification') : 'Continue'}
        </PillButton>
      </div>
    </AppShell>
  )
}
