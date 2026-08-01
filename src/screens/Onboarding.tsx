import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, T, type Role } from '../context'
import { C, FONT, PillButton } from '../components/MobileLayout'
import { OnboardingShell } from '../components/OnboardingShell'
import { Tilt3D } from '../components/Tilt3D'
import { useToast } from '../components/Toast'
import { apiErrorMessage, api } from '../api/client'
import { firebaseConfigured } from '../firebase'
import { signInWithGoogle, startPhoneSignIn, confirmPhoneCode } from '../api/firebaseAuth'
import { setPendingPhoneConfirmation, getPendingPhoneConfirmation } from '../api/phoneAuthState'

/** Real Google Sign-In button — only rendered once a Firebase project is
 * configured (see src/firebase.ts); the phone-OTP flow below it always
 * works, real or demo. */
function GoogleSignInButton({ onSuccess }: { onSuccess: () => void }) {
  const { show: showToast } = useToast()
  const [loading, setLoading] = useState(false)
  if (!firebaseConfigured) return null

  const go = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      onSuccess()
    } catch (err) {
      showToast({ title: 'Google sign-in failed', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={go}
      disabled={loading}
      className="mb-5 flex w-full items-center justify-center gap-2.5 rounded-xl border-2 py-3.5 text-sm font-semibold transition-all disabled:opacity-60"
      style={{ borderColor: C.parchmentDark, background: C.white, color: C.ink, fontFamily: FONT.sans }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18Z" />
        <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33Z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
      </svg>
      {loading ? 'Signing in…' : 'Continue with Google'}
    </button>
  )
}

// ── Language selection ────────────────────────────────────────────────────────
export function LanguageScreen() {
  const nav = useNavigate()
  const { setLang } = useApp()
  const pick = (l: 'en' | 'fr') => { setLang(l); nav('/signup') }

  return (
    <OnboardingShell step={1} showBack={false} eyebrow="Welcome" title={T.select_lang.en}>
      <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="-mt-5 mb-8 text-xs uppercase tracking-widest">
        Choisissez votre langue
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { code: 'en' as const, name: 'English', native: 'English', flag: '🇬🇧' },
          { code: 'fr' as const, name: 'French', native: 'Français', flag: '🇫🇷' },
        ].map(({ code, name, native, flag }) => (
          <Tilt3D key={code} max={5} className="rounded-2xl">
            <button
              onClick={() => pick(code)}
              className="flex w-full items-center gap-5 rounded-2xl border-2 p-5 text-left transition-colors hover:border-[var(--color-forest)]"
              style={{ background: C.white, borderColor: C.parchmentDark }}
            >
              <span className="text-3xl">{flag}</span>
              <div>
                <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold">{native}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs uppercase tracking-wider">{name}</div>
              </div>
              <div className="ml-auto">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3L11 8L6 13" stroke={C.inkSubtle} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </button>
          </Tilt3D>
        ))}
      </div>
    </OnboardingShell>
  )
}

// ── Sign up ───────────────────────────────────────────────────────────────────
export function SignupScreen() {
  const nav = useNavigate()
  const { lang, setPhone } = useApp()
  const { show: showToast } = useToast()
  const [value, setValue] = useState('+237 ')
  const [prefix, setPrefix] = useState('+237')
  const [sending, setSending] = useState(false)

  const carriers = [
    { label: 'MTN MoMo', prefix: '+237 6', color: '#FFCC00', bg: '#FFF9E6' },
    { label: 'Orange OM', prefix: '+237 6', color: '#FF6600', bg: '#FFF0E6' },
    { label: 'Other', prefix: '+', color: C.inkSubtle, bg: C.parchment },
  ]

  const handle = async () => {
    setPhone(value)
    if (!firebaseConfigured) {
      nav('/otp')
      return
    }
    setSending(true)
    try {
      const e164 = value.replace(/[^\d+]/g, '')
      const confirmation = await startPhoneSignIn(e164, 'recaptcha-container')
      setPendingPhoneConfirmation(confirmation)
      nav('/otp')
    } catch (err) {
      showToast({ title: 'Could not send code', description: apiErrorMessage(err, 'Check the number and try again'), tone: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <OnboardingShell
      step={2}
      title="Create your account"
      subtitle="We will send a verification code to your phone. Your number links to MoMo / Orange Money."
    >
      <GoogleSignInButton onSuccess={() => nav('/role')} />
      <div id="recaptcha-container" />

      <div className="mb-6 grid grid-cols-3 gap-2">
        {carriers.map((c) => (
          <button
            key={c.label}
            onClick={() => setPrefix(c.prefix)}
            className="rounded-xl border py-2.5 text-xs font-semibold transition-all"
            style={{
              background: prefix === c.prefix ? c.bg : C.white,
              borderColor: prefix === c.prefix ? c.color : C.parchmentDark,
              color: prefix === c.prefix ? c.color : C.inkMuted,
              fontFamily: FONT.mono,
              boxShadow: prefix === c.prefix ? `0 4px 14px -6px ${c.color}66` : 'none',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 block text-xs uppercase tracking-widest">
        {T.phone_prompt[lang]}
      </label>
      <div
        className="mb-7 flex items-center gap-2 rounded-xl border-2 px-4 py-3.5 transition-all focus-within:border-[var(--color-forest)] focus-within:shadow-[0_0_0_4px_rgba(26,71,49,0.1)]"
        style={{ borderColor: C.parchmentDark, background: C.white }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 2H6L7.5 5.5L5.5 6.5C6.5 8.5 7.5 9.5 9.5 10.5L10.5 8.5L14 10V13C14 13.5 13.5 14 13 14C7 14 2 9 2 3C2 2.5 2.5 2 3 2Z" stroke={C.inkSubtle} strokeWidth="1.2" />
        </svg>
        <input
          type="tel"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 bg-transparent text-base outline-none"
          style={{ fontFamily: FONT.sans, color: C.ink }}
          placeholder="+237 6XX XXX XXX"
        />
      </div>

      <PillButton onClick={handle} fullWidth disabled={sending}>{sending ? 'Sending…' : 'Send verification code'}</PillButton>

      <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="mt-6 text-center text-xs">
        Already have an account?{' '}
        <button onClick={() => nav('/login')} style={{ color: C.forest }} className="font-semibold">Sign in</button>
      </p>
    </OnboardingShell>
  )
}

// ── OTP ───────────────────────────────────────────────────────────────────────
export function OTPScreen() {
  const nav = useNavigate()
  const { phone, lang } = useApp()
  const { show: showToast } = useToast()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [verifying, setVerifying] = useState(false)
  const refs = Array.from({ length: 6 }, () => null) as (HTMLInputElement | null)[]

  const handleDigit = (i: number, val: string) => {
    const next = [...code]
    next[i] = val.slice(-1)
    setCode(next)
    if (val && i < 5) refs[i + 1]?.focus()
  }

  const handleVerify = async () => {
    if (code.join('').length !== 6) return
    const confirmation = getPendingPhoneConfirmation()
    if (!firebaseConfigured || !confirmation) {
      nav('/role')
      return
    }
    setVerifying(true)
    try {
      await confirmPhoneCode(confirmation, code.join(''))
      setPendingPhoneConfirmation(null)
      nav('/role')
    } catch (err) {
      showToast({ title: 'Invalid code', description: apiErrorMessage(err, 'Please check the code and try again'), tone: 'error' })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <OnboardingShell
      step={3}
      title="Verify your number"
      subtitle={
        <>
          {T.otp_prompt[lang]} <strong style={{ color: C.ink }}>{phone || '+237 677 234 891'}</strong>
        </>
      }
    >
      <div className="mb-8 mt-2 flex justify-center gap-3">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { refs[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigit(i, e.target.value)}
            className={`otp-box h-14 w-11 rounded-xl border-2 text-center text-2xl font-bold outline-none transition-all sm:h-16 sm:w-12 ${digit ? 'filled' : ''}`}
            style={{
              fontFamily: FONT.serif,
              color: C.ink,
              borderColor: digit ? C.forest : C.parchmentDark,
              background: digit ? 'rgba(52,168,115,0.08)' : C.white,
            }}
          />
        ))}
      </div>

      <PillButton onClick={handleVerify} fullWidth disabled={verifying}>{verifying ? 'Verifying…' : 'Verify & continue'}</PillButton>

      <div className="mt-6 text-center">
        <button style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-sm">
          Didn't receive it?{' '}
          <span style={{ color: C.forest }} className="font-semibold">Resend in 0:45</span>
        </button>
      </div>

      {/* Demo shortcut */}
      <button
        onClick={() => { setPendingPhoneConfirmation(null); setCode(['1', '2', '3', '4', '5', '6']); setTimeout(() => nav('/role'), 200) }}
        className="mt-4 w-full text-center text-xs"
        style={{ fontFamily: FONT.mono, color: C.inkSubtle }}
      >
        [Demo: tap to auto-fill]
      </button>
    </OnboardingShell>
  )
}

// ── Login ────────────────────────────────────────────────────────────────────
export function LoginScreen() {
  const nav = useNavigate()
  const { setPhone } = useApp()
  const { show: showToast } = useToast()
  const [value, setValue] = useState('+237 ')
  const [sending, setSending] = useState(false)

  const sendOtp = async () => {
    setPhone(value)
    if (!firebaseConfigured) {
      nav('/otp')
      return
    }
    setSending(true)
    try {
      const e164 = value.replace(/[^\d+]/g, '')
      const confirmation = await startPhoneSignIn(e164, 'recaptcha-container-login')
      setPendingPhoneConfirmation(confirmation)
      nav('/otp')
    } catch (err) {
      showToast({ title: 'Could not send code', description: apiErrorMessage(err, 'Check the number and try again'), tone: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <OnboardingShell eyebrow="Welcome back" title="Welcome back" subtitle="Sign in with your phone number.">
      <GoogleSignInButton onSuccess={() => nav('/role')} />
      <div id="recaptcha-container-login" />

      <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 block text-xs uppercase tracking-widest">
        Phone number
      </label>
      <div
        className="mb-7 flex items-center gap-2 rounded-xl border-2 px-4 py-3.5 transition-all focus-within:border-[var(--color-forest)] focus-within:shadow-[0_0_0_4px_rgba(26,71,49,0.1)]"
        style={{ borderColor: C.parchmentDark, background: C.white }}
      >
        <input
          type="tel"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 bg-transparent text-base outline-none"
          style={{ fontFamily: FONT.sans, color: C.ink }}
          placeholder="+237 6XX XXX XXX"
        />
      </div>

      <PillButton onClick={sendOtp} fullWidth disabled={sending}>{sending ? 'Sending…' : 'Send OTP'}</PillButton>

      <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="mt-6 text-center text-xs">
        New to Mboa Trust?{' '}
        <button onClick={() => nav('/signup')} style={{ color: C.forest }} className="font-semibold">Create account</button>
      </p>
    </OnboardingShell>
  )
}

// ── Role selection ────────────────────────────────────────────────────────────
const ROLES: { id: Role; icon: string; title: string; sub: string; accent: string }[] = [
  { id: 'funder', icon: '🌍', title: 'Diaspora Funder', sub: 'Fund projects, hire contractors, invest in land from abroad', accent: '#34A873' },
  { id: 'recipient', icon: '🏗️', title: 'Project Recipient', sub: 'Receive funding for community or family projects', accent: '#C9A227' },
  { id: 'contractor', icon: '🔧', title: 'Local Contractor', sub: 'Bid on projects and get paid securely via escrow', accent: '#3F6EA8' },
  { id: 'seller', icon: '🏡', title: 'Land / Property Seller', sub: 'List land or property with verified documentation', accent: '#A8492F' },
]

// Frontend role labels aren't always the backend's roleType string (mirrors
// the same funder/recipient/contractor/seller → land_seller mapping
// devController.js uses for the dev-bypass demo users).
const ROLE_TYPE: Record<NonNullable<Role>, string> = {
  funder: 'funder', recipient: 'recipient', contractor: 'contractor', seller: 'land_seller',
}

export function RoleScreen() {
  const nav = useNavigate()
  const { setRole, setRoles, lang } = useApp()
  const { show: showToast } = useToast()
  const [multi, setMulti] = useState<NonNullable<Role>[]>([])
  const [saving, setSaving] = useState(false)

  const toggleRole = (r: Role) => {
    if (!r) return
    setMulti((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))
  }

  const proceed = async () => {
    const chosen = multi.length > 0 ? multi : (['funder'] as NonNullable<Role>[])
    if (firebaseConfigured) {
      setSaving(true)
      try {
        // GET /me first — JIT-provisions the backend User from the Firebase
        // token on its very first authenticated call (middleware/auth.js).
        await api.get('/users/me')
        for (const r of chosen) {
          await api.post('/users/me/roles', { roleType: ROLE_TYPE[r] })
        }
      } catch (err) {
        showToast({ title: 'Failed to save role', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
        setSaving(false)
        return
      }
      setSaving(false)
    }
    setRoles(chosen)
    setRole(chosen[0])
    nav('/profile')
  }

  return (
    <OnboardingShell step={4} wide title={T.choose_role[lang]} subtitle="You can hold multiple roles — select as many as apply.">
      <div className="grid gap-3.5 sm:grid-cols-2">
        {ROLES.map(({ id, icon, title, sub, accent }) => {
          const active = multi.includes(id!)
          return (
            <Tilt3D key={id} max={4} className="rounded-2xl">
              <button
                onClick={() => toggleRole(id)}
                className="flex h-full w-full items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all"
                style={{
                  background: active ? 'rgba(52,168,115,0.08)' : C.white,
                  borderColor: active ? C.forest : C.parchmentDark,
                  boxShadow: active ? '0 10px 28px -14px rgba(31,111,74,0.35)' : 'none',
                }}
              >
                <span
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl transition-transform duration-500"
                  style={{ background: `${accent}1F` }}
                >
                  {icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{title}</div>
                  <div style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-1 text-xs leading-snug">{sub}</div>
                </div>
                <div
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all"
                  style={{ borderColor: active ? C.forest : C.parchmentDark, background: active ? C.forest : 'transparent' }}
                >
                  {active && (
                    <svg className="animate-pop-in" width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
              </button>
            </Tilt3D>
          )
        })}
      </div>

      <div className="mt-8">
        <PillButton onClick={proceed} fullWidth disabled={saving}>{saving ? 'Saving…' : 'Continue'}</PillButton>
      </div>
    </OnboardingShell>
  )
}

// ── Profile setup ─────────────────────────────────────────────────────────────
export function ProfileSetupScreen() {
  const nav = useNavigate()
  const { setName, setLoggedIn } = useApp()
  const { show: showToast } = useToast()
  const [form, setForm] = useState({ name: '', city: '', country: 'France', id: '' })
  const [step, setStep] = useState<'info' | 'id'>('info')
  const [idUploaded, setIdUploaded] = useState(false)
  const [finishing, setFinishing] = useState(false)

  const finish = async () => {
    const fullName = form.name || 'Marie-Claire N.'
    if (firebaseConfigured) {
      setFinishing(true)
      try {
        await api.patch('/users/me', { fullName })
      } catch (err) {
        showToast({ title: 'Failed to save profile', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
        setFinishing(false)
        return
      }
      setFinishing(false)
    }
    setName(fullName)
    setLoggedIn(true)
    nav('/home')
  }

  return (
    <OnboardingShell step={5} wide title="Set up your profile">
      {/* Tab toggle */}
      <div className="mb-7 flex rounded-xl border p-1" style={{ borderColor: C.parchmentDark, background: C.parchment }}>
        {(['info', 'id'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setStep(t)}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all"
            style={{
              fontFamily: FONT.sans,
              background: step === t ? C.forest : 'transparent',
              color: step === t ? C.white : C.inkMuted,
              boxShadow: step === t ? '0 6px 16px -6px rgba(26,71,49,0.4)' : 'none',
            }}
          >
            {t === 'info' ? 'Personal info' : 'ID verification'}
          </button>
        ))}
      </div>

      {step === 'info' ? (
        <div className="onboarding-page-enter space-y-4">
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 block text-[10px] uppercase tracking-widest">Full name</label>
            <input
              type="text"
              placeholder="Marie-Claire Nkemdirim"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border-2 px-4 py-3 text-sm outline-none transition-all focus:border-[var(--color-forest)] focus:shadow-[0_0_0_4px_rgba(26,71,49,0.1)]"
              style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 block text-[10px] uppercase tracking-widest">City (abroad)</label>
              <input
                type="text"
                placeholder="Brussels"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-xl border-2 px-4 py-3 text-sm outline-none transition-all focus:border-[var(--color-forest)] focus:shadow-[0_0_0_4px_rgba(26,71,49,0.1)]"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
              />
            </div>
            <div>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 block text-[10px] uppercase tracking-widest">Country</label>
              <input
                type="text"
                placeholder="France"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full rounded-xl border-2 px-4 py-3 text-sm outline-none transition-all focus:border-[var(--color-forest)] focus:shadow-[0_0_0_4px_rgba(26,71,49,0.1)]"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
              />
            </div>
          </div>

          <div className="pt-2">
            <PillButton onClick={() => setStep('id')} fullWidth>Next: ID verification</PillButton>
          </div>
        </div>
      ) : (
        <div className="onboarding-page-enter space-y-5">
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed">
            Upload a government-issued ID (national card, passport, or residence permit). Your ID is reviewed within 24 hours.
          </p>

          <button
            onClick={() => setIdUploaded(true)}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed py-12 transition-all hover:border-[var(--color-forest)]"
            style={{ borderColor: idUploaded ? C.forest : C.parchmentDark, background: idUploaded ? 'rgba(52,168,115,0.08)' : C.white }}
          >
            {idUploaded ? (
              <>
                <div className="animate-pop-in flex h-12 w-12 items-center justify-center rounded-full" style={{ background: C.forest }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M4 11L9 16L18 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <span style={{ fontFamily: FONT.sans, color: C.forest }} className="text-sm font-semibold">ID uploaded successfully</span>
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

          <div className="rounded-xl border p-4" style={{ background: 'rgba(232,160,32,0.08)', borderColor: 'rgba(232,160,32,0.3)' }}>
            <div style={{ fontFamily: FONT.mono, color: C.amber }} className="mb-1 text-[10px] uppercase tracking-wider">Why we verify IDs</div>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">
              ID verification protects all parties. Verified accounts can access escrow payments and contractor hiring. Unverified accounts can browse but not transact.
            </p>
          </div>

          <PillButton onClick={finish} fullWidth disabled={finishing}>{finishing ? 'Saving…' : 'Complete setup'}</PillButton>
        </div>
      )}
    </OnboardingShell>
  )
}
