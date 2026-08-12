import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { capturePendingReferral, getPendingReferralId, clearPendingReferral } from '../api/pendingReferral'
import { useApp, T, type Role } from '../context'
import { C, FONT, PillButton } from '../components/MobileLayout'
import { OnboardingShell } from '../components/OnboardingShell'
import { Tilt3D } from '../components/Tilt3D'
import { useToast } from '../components/Toast'
import { apiErrorMessage, api } from '../api/client'
import { firebaseConfigured } from '../firebase'
import {
  signInWithGoogle, startPhoneSignIn, confirmPhoneCode, signUpWithEmail, signInWithEmail,
  sendPasswordReset, credentialFromGoogleError, linkPendingCredential, fetchSignInMethods, clearRecaptcha,
  getCurrentFirebaseUser,
} from '../api/firebaseAuth'
import { setPendingPhoneConfirmation, getPendingPhoneConfirmation } from '../api/phoneAuthState'
import { friendlyAuthError, isAccountExistsError } from '../api/authErrors'
import { GoogleAuthButton, AuthDivider, AuthMethodTabs, TextField, PasswordField, InlineAlert, Spinner } from '../components/AuthControls'
import { AppIcon, type IconName } from '../components/icons'

/** Normalizes a phone field's raw text into E.164. The input starts
 * pre-filled with a country-code prefix (e.g. "+237 ") that the field
 * itself doesn't stop someone from typing over or appending a full number
 * onto — left unguarded, that produces something like
 * "+237 +237600000001", which silently fails to match any registered
 * number (test or real) instead of erroring clearly. Keeping only
 * whatever comes after the *last* "+" discards a stray leading prefix
 * like that while leaving a normal single-prefix number untouched. */
function toE164(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '')
  const lastPlus = cleaned.lastIndexOf('+')
  return lastPlus >= 0 ? cleaned.slice(lastPlus) : `+${cleaned}`
}

/** Where a signed-in user should land next: existing, fully-onboarded
 * accounts skip straight past role/profile setup; someone who picked a role
 * but never finished profile setup resumes there instead of re-picking a
 * role; anyone else continues into the normal first-time flow. Shared by
 * every entry point (Google, email, phone) so a returning user never gets
 * routed through onboarding twice just because they used a different
 * sign-in method this time. */
function useAuthRouting() {
  const nav = useNavigate()
  const { completeAuthSuccess } = useApp()
  return async () => {
    const dest = await completeAuthSuccess()
    const path = dest === 'home' ? '/home' : dest === 'profile' ? '/profile' : '/role'
    nav(path, { replace: dest === 'home' })
  }
}

/** Recovery form shown when Google sign-in collides with an existing
 * email/password account (`auth/account-exists-with-different-credential`).
 * Firebase already has the pending Google credential in hand — the person
 * just needs to prove ownership of the existing account once, and the two
 * get linked into a single identity for good. */
function AccountConflictResolver({ email, credential, onLinked, onCancel }: {
  email: string
  credential: NonNullable<ReturnType<typeof credentialFromGoogleError>>
  onLinked: () => void
  onCancel: () => void
}) {
  const { show: showToast } = useToast()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const resolve = async () => {
    setError('')
    if (!password) return setError('Enter your password to continue.')
    setBusy(true)
    try {
      const user = await signInWithEmail(email, password)
      await linkPendingCredential(user, credential)
      showToast({ title: 'Accounts linked', description: 'You can now sign in with either method.', tone: 'success' })
      onLinked()
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-5 rounded-2xl border-2 p-4" style={{ borderColor: C.amber, background: 'rgba(232,160,32,0.08)' }}>
      <div style={{ fontFamily: FONT.sans, color: C.ink }} className="mb-1 text-sm font-semibold">Account already exists</div>
      <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mb-3 text-xs leading-relaxed">
        <strong>{email}</strong> already has an account with a password. Sign in below to link your Google account to it.
      </p>
      {error && <InlineAlert>{error}</InlineAlert>}
      <PasswordField label="Password" value={password} onChange={setPassword} placeholder="Your existing password" autoComplete="current-password" containerClassName="mb-3" />
      <div className="flex gap-2">
        <button onClick={onCancel} disabled={busy} className="flex-1 rounded-xl border py-2.5 text-sm font-semibold disabled:opacity-60" style={{ borderColor: C.parchmentDark, color: C.inkMuted, fontFamily: FONT.sans }}>Cancel</button>
        <button onClick={resolve} disabled={busy} className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60" style={{ background: C.forest, color: C.white, fontFamily: FONT.sans }}>
          {busy && <Spinner size={14} color={C.white} />}
          {busy ? 'Linking…' : 'Sign in & link'}
        </button>
      </div>
    </div>
  )
}

type GoogleConflict = { email: string; credential: NonNullable<ReturnType<typeof credentialFromGoogleError>> }

/** Google Sign-In button — only rendered once a Firebase project is
 * configured (see src/firebase.ts); the phone/email flows beside it always
 * work, real or demo. Handles the "account exists with a different
 * credential" collision inline instead of just failing. */
function GoogleAuthSection() {
  const { show: showToast } = useToast()
  const route = useAuthRouting()
  const [loading, setLoading] = useState(false)
  const [conflict, setConflict] = useState<GoogleConflict | null>(null)
  if (!firebaseConfigured) return null

  const go = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      await route()
    } catch (err) {
      if (isAccountExistsError(err)) {
        const credential = credentialFromGoogleError(err)
        const email = (err as { customData?: { email?: string } })?.customData?.email
        if (credential && email) {
          const methods = await fetchSignInMethods(email).catch((): string[] => [])
          if (methods.includes('password')) {
            setConflict({ email, credential })
          } else {
            showToast({ title: 'Sign-in failed', description: `Sign in with your original method for ${email} first, then link Google from Settings.`, tone: 'error' })
          }
        } else {
          showToast({ title: 'Google sign-in failed', description: friendlyAuthError(err), tone: 'error' })
        }
      } else {
        showToast({ title: 'Google sign-in failed', description: friendlyAuthError(err), tone: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (conflict) {
    return (
      <AccountConflictResolver
        email={conflict.email}
        credential={conflict.credential}
        onLinked={() => { setConflict(null); route() }}
        onCancel={() => setConflict(null)}
      />
    )
  }

  return (
    <div className="mb-5">
      <GoogleAuthButton onClick={go} loading={loading} />
    </div>
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
          { code: 'en' as const, name: 'English', native: 'English' },
          { code: 'fr' as const, name: 'French', native: 'Français' },
        ].map(({ code, name, native }) => (
          <Tilt3D key={code} max={5} className="rounded-2xl">
            <button
              onClick={() => pick(code)}
              className="flex w-full items-center gap-5 rounded-2xl border-2 p-5 text-left transition-colors hover:border-[var(--color-forest)]"
              style={{ background: C.white, borderColor: C.parchmentDark }}
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: C.parchment, color: C.forest }}>
                <AppIcon name="languages" size={20} />
              </span>
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
function PhoneSignupForm() {
  const nav = useNavigate()
  const { lang, setPhone } = useApp()
  const { show: showToast } = useToast()
  const [value, setValue] = useState('+237 ')
  const [sending, setSending] = useState(false)

  // Tears down the invisible reCAPTCHA widget when this form's container
  // leaves the DOM (switching to the Email tab, navigating away) — without
  // this, the next "send code" attempt can reuse a verifier bound to a
  // node that no longer exists and throw "reCAPTCHA client element has
  // been removed".
  useEffect(() => clearRecaptcha, [])

  const handle = async () => {
    const e164 = toE164(value)
    setPhone(e164)
    if (!firebaseConfigured) {
      nav('/otp')
      return
    }
    setSending(true)
    try {
      const confirmation = await startPhoneSignIn(e164, 'recaptcha-container')
      setPendingPhoneConfirmation(confirmation)
      nav('/otp')
    } catch (err) {
      showToast({ title: 'Could not send code', description: friendlyAuthError(err, 'Check the number and try again'), tone: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div id="recaptcha-container" />

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
    </>
  )
}

interface EmailSignupErrors { fullName?: string; email?: string; password?: string; confirm?: string }

function EmailSignupForm() {
  const nav = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<EmailSignupErrors>({})
  const [formError, setFormError] = useState('')
  const [creating, setCreating] = useState(false)

  const validate = (): boolean => {
    const next: EmailSignupErrors = {}
    if (!fullName.trim()) next.fullName = 'Enter your full name.'
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address.'
    if (password.length < 6) next.password = 'Use at least 6 characters.'
    if (confirm !== password) next.confirm = 'Passwords don\'t match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async () => {
    setFormError('')
    if (!validate()) return
    if (!firebaseConfigured) { nav('/role'); return }
    setCreating(true)
    try {
      await signUpWithEmail(email, password, fullName)
      // Explicit PATCH rather than relying on the ID token to pick up the
      // new displayName claim on its next refresh — see signUpWithEmail.
      await api.patch('/users/me', { fullName }).catch(() => {})
      nav('/role')
    } catch (err) {
      setFormError(friendlyAuthError(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      {formError && (
        <InlineAlert>
          {formError}{' '}
          {formError.includes('already exists') && (
            <button onClick={() => nav('/login')} className="font-semibold underline">Sign in instead</button>
          )}
        </InlineAlert>
      )}
      <TextField label="Full name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Marie-Claire Nkemdirim" error={errors.fullName} autoComplete="name" />
      <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" error={errors.email} autoComplete="email" />
      <PasswordField label="Password" value={password} onChange={setPassword} placeholder="At least 6 characters" error={errors.password} autoComplete="new-password" />
      <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} placeholder="Re-enter your password" error={errors.confirm} autoComplete="new-password" />
      <div className="pt-1">
        <PillButton onClick={submit} fullWidth disabled={creating}>
          {creating ? (<span className="inline-flex items-center gap-2"><Spinner size={14} color={C.white} /> Creating account…</span>) : 'Create account'}
        </PillButton>
      </div>
    </div>
  )
}

export function SignupScreen() {
  const nav = useNavigate()
  const [method, setMethod] = useState<'phone' | 'email'>('phone')
  const [searchParams] = useSearchParams()

  useEffect(() => {
    capturePendingReferral(searchParams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <OnboardingShell
      step={2}
      title="Create your account"
      subtitle={method === 'phone'
        ? 'We will send a verification code to your phone. Your number links to MoMo / Orange Money.'
        : 'Sign up with an email and password — perfect if you\'re funding from abroad.'}
    >
      <GoogleAuthSection />
      <AuthDivider />
      <AuthMethodTabs
        options={[{ id: 'phone', label: 'Phone' }, { id: 'email', label: 'Email' }]}
        value={method}
        onChange={setMethod}
      />

      {method === 'phone' ? <PhoneSignupForm /> : <EmailSignupForm />}

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
  const route = useAuthRouting()
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
      await route()
    } catch (err) {
      showToast({ title: 'Invalid code', description: friendlyAuthError(err, 'Please check the code and try again'), tone: 'error' })
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
function PhoneLoginForm() {
  const nav = useNavigate()
  const { setPhone } = useApp()
  const { show: showToast } = useToast()
  const [value, setValue] = useState('+237 ')
  const [sending, setSending] = useState(false)

  useEffect(() => clearRecaptcha, [])

  const sendOtp = async () => {
    const e164 = toE164(value)
    setPhone(e164)
    if (!firebaseConfigured) {
      nav('/otp')
      return
    }
    setSending(true)
    try {
      const confirmation = await startPhoneSignIn(e164, 'recaptcha-container-login')
      setPendingPhoneConfirmation(confirmation)
      nav('/otp')
    } catch (err) {
      showToast({ title: 'Could not send code', description: friendlyAuthError(err, 'Check the number and try again'), tone: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
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
    </>
  )
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const submit = async () => {
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    setSending(true)
    try {
      await sendPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full animate-pop-in" style={{ background: 'rgba(52,168,115,0.12)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke={C.forest} strokeWidth="2" strokeLinecap="round" /></svg>
        </div>
        <div>
          <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">Check your inbox</div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-1.5 text-xs leading-relaxed">
            We sent a password reset link to <strong>{email}</strong>. Follow it to choose a new password, then come back and sign in.
          </p>
        </div>
        <PillButton onClick={onBack} fullWidth variant="secondary">Back to sign in</PillButton>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <InlineAlert>{error}</InlineAlert>}
      <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <PillButton onClick={submit} fullWidth disabled={sending}>{sending ? 'Sending…' : 'Send reset link'}</PillButton>
      <button onClick={onBack} className="w-full text-center text-xs font-semibold" style={{ fontFamily: FONT.sans, color: C.inkSubtle }}>
        Back to sign in
      </button>
    </div>
  )
}

function EmailLoginForm() {
  const route = useAuthRouting()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [forgot, setForgot] = useState(false)

  if (forgot) return <ForgotPasswordForm onBack={() => setForgot(false)} />

  const submit = async () => {
    setFormError('')
    if (!email || !password) return setFormError('Enter your email and password.')
    setSigningIn(true)
    try {
      await signInWithEmail(email, password)
      await route()
    } catch (err) {
      setFormError(friendlyAuthError(err))
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div className="space-y-4">
      {formError && <InlineAlert>{formError}</InlineAlert>}
      <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
      <div>
        <PasswordField label="Password" value={password} onChange={setPassword} placeholder="Your password" autoComplete="current-password" />
        <button onClick={() => setForgot(true)} className="mt-2 text-xs font-semibold" style={{ fontFamily: FONT.sans, color: C.forest }}>
          Forgot password?
        </button>
      </div>
      <div className="pt-1">
        <PillButton onClick={submit} fullWidth disabled={signingIn}>
          {signingIn ? (<span className="inline-flex items-center gap-2"><Spinner size={14} color={C.white} /> Signing in…</span>) : 'Sign in'}
        </PillButton>
      </div>
    </div>
  )
}

export function LoginScreen() {
  const nav = useNavigate()
  const [method, setMethod] = useState<'phone' | 'email'>('phone')

  return (
    <OnboardingShell
      eyebrow="Welcome back"
      title="Welcome back"
      subtitle={method === 'phone' ? 'Sign in with your phone number.' : 'Sign in with your email and password.'}
    >
      <GoogleAuthSection />
      <AuthDivider />
      <AuthMethodTabs
        options={[{ id: 'phone', label: 'Phone' }, { id: 'email', label: 'Email' }]}
        value={method}
        onChange={setMethod}
      />

      {method === 'phone' ? <PhoneLoginForm /> : <EmailLoginForm />}

      <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="mt-6 text-center text-xs">
        New to Mboa Trust?{' '}
        <button onClick={() => nav('/signup')} style={{ color: C.forest }} className="font-semibold">Create account</button>
      </p>
    </OnboardingShell>
  )
}

// ── Role selection ────────────────────────────────────────────────────────────
const ROLES: { id: Role; icon: IconName; title: string; sub: string; accent: string }[] = [
  { id: 'funder', icon: 'globe', title: 'Diaspora Funder', sub: 'Fund projects, hire contractors, invest in land from abroad', accent: '#34A873' },
  { id: 'recipient', icon: 'hardHat', title: 'Project Recipient', sub: 'Receive funding for community or family projects', accent: '#C9A227' },
  { id: 'contractor', icon: 'wrench', title: 'Local Contractor', sub: 'Bid on projects and get paid securely via escrow', accent: '#3F6EA8' },
  { id: 'seller', icon: 'home', title: 'Land / Property Seller', sub: 'List land or property with verified documentation', accent: '#A8492F' },
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
    // Same check resolveCurrentUserId uses everywhere else — Firebase being
    // *configured* doesn't mean this browser has an active Firebase
    // *session* (e.g. the dev-bypass path, or a race right after signup).
    // Calling /users/me with no token and no dev-bypass header 401s.
    if (firebaseConfigured && getCurrentFirebaseUser()) {
      setSaving(true)
      try {
        // GET /me first — JIT-provisions the backend User from the Firebase
        // token on its very first authenticated call (middleware/auth.js).
        await api.get('/users/me')
        await Promise.all(chosen.map((r) => api.post('/users/me/roles', { roleType: ROLE_TYPE[r] })))
        // Best-effort — a missing/already-claimed/self-visited referral
        // link shouldn't block signup, so failures here are silently
        // swallowed rather than surfaced as a save error.
        const pendingReferralId = getPendingReferralId()
        if (pendingReferralId) {
          await api.post(`/referrals/${pendingReferralId}/claim`, {}).catch(() => {})
          clearPendingReferral()
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
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-500"
                  style={{ background: `${accent}1F`, color: accent }}
                >
                  <AppIcon name={icon} size={20} />
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
    const fallbackName = getCurrentFirebaseUser()?.displayName || getCurrentFirebaseUser()?.email?.split('@')[0] || 'New user'
    const fullName = form.name || fallbackName
    if (firebaseConfigured && getCurrentFirebaseUser()) {
      setFinishing(true)
      try {
        await api.patch('/users/me', { fullName, onboardingCompleted: true })
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
