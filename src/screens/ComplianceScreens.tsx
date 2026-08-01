import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmt } from '../context'
import { useCompliance, KYC_LARGE_TXN_THRESHOLD, type KycStatus } from '../compliance'
import { C, FONT, AppShell, Header, PillButton, StepIndicator, STATUS_TONE_VARS, type StatusTone } from '../components/MobileLayout'
import { ChipGroup } from '../components/Chip'

const STATUS_META: Record<KycStatus, { label: string; tone: StatusTone }> = {
  unverified: { label: 'Not verified', tone: 'neutral' },
  pending: { label: 'Under review', tone: 'warning' },
  verified: { label: 'Verified', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'error' },
}

// ── Explanatory screen + status ─────────────────────────────────────────────────
export function KycExplainerScreen() {
  const nav = useNavigate()
  const { myKyc } = useCompliance()
  const meta = STATUS_META[myKyc.status]
  const toneVars = STATUS_TONE_VARS[meta.tone]

  return (
    <AppShell>
      <Header title="Identity Verification" back />
      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl border p-5 text-center" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <span className="inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ background: toneVars.bg, color: toneVars.text, fontFamily: FONT.mono }}>
            {meta.label}
          </span>
          {myKyc.status === 'pending' && (
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mt-3 leading-relaxed">
              Your documents were submitted {myKyc.submittedDate} and are being reviewed. This typically takes 24 hours.
            </p>
          )}
          {myKyc.status === 'verified' && (
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mt-3 leading-relaxed">
              Your identity is verified. You can fund, transact, and hire without limits.
            </p>
          )}
          {myKyc.status === 'rejected' && (
            <div className="mt-3">
              <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed">{myKyc.rejectionReason}</p>
            </div>
          )}
          {myKyc.status === 'unverified' && (
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mt-3 leading-relaxed">
              You haven't verified your identity yet. This is required before transactions above {fmt(KYC_LARGE_TXN_THRESHOLD)}.
            </p>
          )}
        </div>

        <div>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">Why we verify identity</p>
          <div className="space-y-2">
            {[
              { icon: '🛡️', text: 'Protects the platform and other users from fraud and money laundering.' },
              { icon: '💰', text: 'Required by financial regulations before large escrow transactions.' },
              { icon: '🔓', text: 'Unlocks unlimited funding, land purchases, and contractor payouts.' },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(myKyc.status === 'unverified' || myKyc.status === 'rejected') && (
        <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <PillButton onClick={() => nav('/compliance/kyc/verify')} fullWidth>
            {myKyc.status === 'rejected' ? 'Resubmit verification' : 'Start verification'}
          </PillButton>
        </div>
      )}
    </AppShell>
  )
}

// ── Multi-step KYC verification flow ────────────────────────────────────────────
const ID_TYPES = ['National ID card', 'Passport', 'Residence permit']

export function KycVerifyScreen() {
  const nav = useNavigate()
  const { submitKyc } = useCompliance()
  const [step, setStep] = useState<'id' | 'selfie' | 'review' | 'done'>('id')
  const [idType, setIdType] = useState('')
  const [idUploaded, setIdUploaded] = useState(false)
  const [selfieDone, setSelfieDone] = useState(false)
  const STEP_ORDER = ['id', 'selfie', 'review'] as const

  const finish = () => {
    submitKyc()
    setStep('done')
  }

  if (step === 'done') {
    return (
      <AppShell noNav>
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.amber }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="3" fill="white" />
              <circle cx="18" cy="18" r="10" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
            </svg>
          </div>
          <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-3">Submitted for review</h1>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
            We're reviewing your ID and selfie match. This typically takes 24 hours — you'll be notified once it's complete.
          </p>
          <PillButton onClick={() => nav('/compliance/kyc')} fullWidth>View verification status</PillButton>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav>
      <Header title="Verify Your Identity" back>
        <StepIndicator steps={['ID upload', 'Selfie match', 'Review']} current={STEP_ORDER.indexOf(step)} />
      </Header>

      <div className="px-5 py-5 space-y-4 overflow-y-auto sm:mx-auto sm:max-w-2xl">
        {step === 'id' && (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              Choose your document type and upload a clear photo of a government-issued ID.
            </p>
            <ChipGroup options={ID_TYPES} value={idType} onChange={(v) => setIdType(v as string)} />
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

        {step === 'selfie' && (
          <>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              Take a selfie so we can match your face to your ID photo.
            </p>
            <button
              onClick={() => setSelfieDone(true)}
              className="w-full border-2 border-dashed rounded-2xl py-14 flex flex-col items-center gap-3 transition-all"
              style={{ borderColor: selfieDone ? C.forest : C.parchmentDark, background: selfieDone ? 'var(--status-success-bg)' : C.white }}
            >
              {selfieDone ? (
                <>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.forest }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M4 12L10 18L20 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: FONT.sans, color: C.forest }} className="text-sm font-semibold">Selfie captured — 97% match confidence</span>
                </>
              ) : (
                <>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="12" r="5" stroke={C.inkSubtle} strokeWidth="1.4" />
                    <path d="M6 27C6 21.5 10.5 18 16 18C21.5 18 26 21.5 26 27" stroke={C.inkSubtle} strokeWidth="1.4" />
                  </svg>
                  <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">Tap to take a selfie</span>
                  <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">Face must be clearly visible</span>
                </>
              )}
            </button>
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
                <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">ID document</span>
                <span style={{ fontFamily: FONT.sans, color: C.forest }} className="text-sm font-semibold">Uploaded ✓</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Selfie match</span>
                <span style={{ fontFamily: FONT.sans, color: C.forest }} className="text-sm font-semibold">97% confidence</span>
              </div>
            </div>
            <div className="rounded-xl p-4 border" style={{ background: 'var(--status-warning-bg)', borderColor: 'var(--status-warning-bg)' }}>
              <p style={{ fontFamily: FONT.sans, color: 'var(--status-warning-text)' }} className="text-xs leading-relaxed">
                By submitting, you confirm this information is accurate and consent to it being checked against your uploaded document.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="px-5 pb-8 pt-4 border-t sm:mx-auto sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <PillButton
          onClick={() => {
            if (step === 'id') setStep('selfie')
            else if (step === 'selfie') setStep('review')
            else finish()
          }}
          fullWidth
          disabled={(step === 'id' && (!idType || !idUploaded)) || (step === 'selfie' && !selfieDone)}
        >
          {step === 'review' ? 'Submit for verification' : 'Continue'}
        </PillButton>
      </div>
    </AppShell>
  )
}
