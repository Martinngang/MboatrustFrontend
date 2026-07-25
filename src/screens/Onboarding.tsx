import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, T, type Role } from '../context'
import { C, FONT, PillButton } from '../components/MobileLayout'

// ── Language selection ────────────────────────────────────────────────────────
export function LanguageScreen() {
  const nav = useNavigate()
  const { setLang } = useApp()
  const pick = (l: 'en' | 'fr') => { setLang(l); nav('/signup') }
  return (
    <div className="flex flex-col h-full px-6 pt-20" style={{ background: C.cream }}>
      <div className="mb-10">
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs uppercase tracking-widest mb-3">Step 1 of 5</div>
        <h1 style={{ fontFamily: FONT.serif }} className="text-3xl font-bold mb-2">
          {T.select_lang.en}
        </h1>
        <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs uppercase tracking-widest">
          Choisissez votre langue
        </p>
      </div>

      <div className="space-y-4">
        {[
          { code: 'en' as const, name: 'English', native: 'English', flag: '🇬🇧' },
          { code: 'fr' as const, name: 'French', native: 'Français', flag: '🇫🇷' },
        ].map(({ code, name, native, flag }) => (
          <button
            key={code}
            onClick={() => pick(code)}
            className="w-full flex items-center gap-5 p-5 rounded-2xl border-2 text-left transition-all hover:border-[var(--color-forest)] active:scale-95"
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
        ))}
      </div>
    </div>
  )
}

// ── Sign up ───────────────────────────────────────────────────────────────────
export function SignupScreen() {
  const nav = useNavigate()
  const { lang, setPhone } = useApp()
  const [value, setValue] = useState('+237 ')
  const [prefix, setPrefix] = useState('+237')

  const carriers = [
    { label: 'MTN MoMo', prefix: '+237 6', color: '#FFCC00', bg: '#FFF9E6' },
    { label: 'Orange OM', prefix: '+237 6', color: '#FF6600', bg: '#FFF0E6' },
    { label: 'Other', prefix: '+', color: C.inkSubtle, bg: C.parchment },
  ]

  const handle = () => {
    setPhone(value)
    nav('/otp')
  }

  return (
    <div className="flex flex-col h-full px-6 pt-16 pb-8" style={{ background: C.cream }}>
      <button onClick={() => nav(-1)} className="mb-8 flex items-center gap-2" style={{ color: C.inkSubtle, fontFamily: FONT.sans }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="text-sm">Back</span>
      </button>

      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs uppercase tracking-widest mb-3">Step 2 of 5</div>
      <h1 style={{ fontFamily: FONT.serif }} className="text-3xl font-bold mb-2">Create your account</h1>
      <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">
        We will send a verification code to your phone. Your number links to MoMo / Orange Money.
      </p>

      {/* Carrier quick-select */}
      <div className="flex gap-2 mb-5">
        {carriers.map((c) => (
          <button
            key={c.label}
            onClick={() => setPrefix(c.prefix)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold border transition-all"
            style={{
              background: prefix === c.prefix ? c.bg : C.white,
              borderColor: prefix === c.prefix ? c.color : C.parchmentDark,
              color: prefix === c.prefix ? c.color : C.inkMuted,
              fontFamily: FONT.mono,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs uppercase tracking-widest mb-2">
        {T.phone_prompt[lang]}
      </label>
      <div className="flex items-center gap-2 border-2 rounded-xl px-4 py-3 mb-6 focus-within:border-[var(--color-forest)] transition-colors" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 2H6L7.5 5.5L5.5 6.5C6.5 8.5 7.5 9.5 9.5 10.5L10.5 8.5L14 10V13C14 13.5 13.5 14 13 14C7 14 2 9 2 3C2 2.5 2.5 2 3 2Z" stroke={C.inkSubtle} strokeWidth="1.2" />
        </svg>
        <input
          type="tel"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 outline-none text-base bg-transparent"
          style={{ fontFamily: FONT.sans, color: C.ink }}
          placeholder="+237 6XX XXX XXX"
        />
      </div>

      <PillButton onClick={handle} fullWidth>Send verification code</PillButton>

      <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs text-center mt-6">
        Already have an account?{' '}
        <button onClick={() => nav('/login')} style={{ color: C.forest }} className="font-semibold">Sign in</button>
      </p>
    </div>
  )
}

// ── OTP ───────────────────────────────────────────────────────────────────────
export function OTPScreen() {
  const nav = useNavigate()
  const { phone, lang } = useApp()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const refs = Array.from({ length: 6 }, () => null) as (HTMLInputElement | null)[]

  const handleDigit = (i: number, val: string) => {
    const next = [...code]
    next[i] = val.slice(-1)
    setCode(next)
    if (val && i < 5) refs[i + 1]?.focus()
  }

  const handleVerify = () => {
    if (code.join('').length === 6) nav('/role')
  }

  return (
    <div className="flex flex-col h-full px-6 pt-16 pb-8" style={{ background: C.cream }}>
      <button onClick={() => nav(-1)} className="mb-8 flex items-center gap-2" style={{ color: C.inkSubtle, fontFamily: FONT.sans }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="text-sm">Back</span>
      </button>

      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs uppercase tracking-widest mb-3">Step 3 of 5</div>
      <h1 style={{ fontFamily: FONT.serif }} className="text-3xl font-bold mb-2">Verify your number</h1>
      <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-10">
        {T.otp_prompt[lang]} <strong style={{ color: C.ink }}>{phone || '+237 677 234 891'}</strong>
      </p>

      {/* 6-digit input */}
      <div className="flex gap-3 justify-center mb-8">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { refs[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigit(i, e.target.value)}
            className="w-11 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-colors"
            style={{
              fontFamily: FONT.serif,
              color: C.ink,
              borderColor: digit ? C.forest : C.parchmentDark,
              background: digit ? '#F0FDF4' : C.white,
            }}
          />
        ))}
      </div>

      <PillButton onClick={handleVerify} fullWidth>Verify &amp; continue</PillButton>

      <div className="text-center mt-6">
        <button style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-sm">
          Didn't receive it?{' '}
          <span style={{ color: C.forest }} className="font-semibold">Resend in 0:45</span>
        </button>
      </div>

      {/* Demo shortcut */}
      <button
        onClick={() => { setCode(['1','2','3','4','5','6']); setTimeout(() => nav('/role'), 200) }}
        className="mt-4 text-xs text-center"
        style={{ fontFamily: FONT.mono, color: C.inkSubtle }}
      >
        [Demo: tap to auto-fill]
      </button>
    </div>
  )
}

// ── Login ────────────────────────────────────────────────────────────────────
export function LoginScreen() {
  const nav = useNavigate()
  const { setPhone } = useApp()
  const [value, setValue] = useState('+237 ')

  return (
    <div className="flex flex-col h-full px-6 pt-16 pb-8" style={{ background: C.cream }}>
      <div className="flex items-center gap-3 mb-12">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: C.forest }}>
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
            <path d="M11 2L18 7V15L11 20L4 15V7L11 2Z" fill="none" stroke={C.amber} strokeWidth="1.6" />
            <circle cx="11" cy="11" r="2.5" fill={C.amber} />
          </svg>
        </div>
        <span style={{ fontFamily: FONT.serif }} className="text-lg font-bold">Mboa Trust</span>
      </div>

      <h1 style={{ fontFamily: FONT.serif }} className="text-3xl font-bold mb-2">Welcome back</h1>
      <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-8">Sign in with your phone number.</p>

      <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs uppercase tracking-widest mb-2">Phone number</label>
      <div className="flex items-center gap-2 border-2 rounded-xl px-4 py-3 mb-6 focus-within:border-[var(--color-forest)] transition-colors" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <input
          type="tel"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 outline-none text-base bg-transparent"
          style={{ fontFamily: FONT.sans, color: C.ink }}
          placeholder="+237 6XX XXX XXX"
        />
      </div>

      <PillButton onClick={() => { setPhone(value); nav('/otp') }} fullWidth>Send OTP</PillButton>

      <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs text-center mt-6">
        New to Mboa Trust?{' '}
        <button onClick={() => nav('/signup')} style={{ color: C.forest }} className="font-semibold">Create account</button>
      </p>
    </div>
  )
}

// ── Role selection ────────────────────────────────────────────────────────────
const ROLES: { id: Role; icon: string; title: string; sub: string; color: string }[] = [
  { id: 'funder', icon: '🌍', title: 'Diaspora Funder', sub: 'Fund projects, hire contractors, invest in land from abroad', color: '#E8F5EE' },
  { id: 'recipient', icon: '🏗️', title: 'Project Recipient', sub: 'Receive funding for community or family projects', color: '#FFF7E6' },
  { id: 'contractor', icon: '🔧', title: 'Local Contractor', sub: 'Bid on projects and get paid securely via escrow', color: '#F0F4FF' },
  { id: 'seller', icon: '🏡', title: 'Land / Property Seller', sub: 'List land or property with verified documentation', color: '#FFF0F0' },
]

export function RoleScreen() {
  const nav = useNavigate()
  const { setRole, setRoles, lang } = useApp()
  const [multi, setMulti] = useState<NonNullable<Role>[]>([])

  const toggleRole = (r: Role) => {
    if (!r) return
    setMulti((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])
  }

  const proceed = () => {
    const chosen = multi.length > 0 ? multi : (['funder'] as NonNullable<Role>[])
    setRoles(chosen)
    setRole(chosen[0])
    nav('/profile')
  }

  return (
    <div className="flex flex-col h-full px-6 pt-16 pb-8" style={{ background: C.cream }}>
      <button onClick={() => nav(-1)} className="mb-8 flex items-center gap-2" style={{ color: C.inkSubtle, fontFamily: FONT.sans }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="text-sm">Back</span>
      </button>

      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs uppercase tracking-widest mb-3">Step 4 of 5</div>
      <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-1">{T.choose_role[lang]}</h1>
      <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-6">You can hold multiple roles.</p>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {ROLES.map(({ id, icon, title, sub, color }) => {
          const active = multi.includes(id!)
          return (
            <button
              key={id}
              onClick={() => toggleRole(id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all"
              style={{
                background: active ? color : C.white,
                borderColor: active ? C.forest : C.parchmentDark,
              }}
            >
              <span className="text-2xl">{icon}</span>
              <div className="flex-1">
                <div style={{ fontFamily: FONT.sans }} className="font-semibold text-sm">{title}</div>
                <div style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-0.5 leading-snug">{sub}</div>
              </div>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all`}
                style={{ borderColor: active ? C.forest : C.parchmentDark, background: active ? C.forest : 'transparent' }}>
                {active && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        <PillButton onClick={proceed} fullWidth>Continue</PillButton>
      </div>
    </div>
  )
}

// ── Profile setup ─────────────────────────────────────────────────────────────
export function ProfileSetupScreen() {
  const nav = useNavigate()
  const { setName, setLoggedIn } = useApp()
  const [form, setForm] = useState({ name: '', city: '', country: 'France', id: '' })
  const [step, setStep] = useState<'info' | 'id'>('info')
  const [idUploaded, setIdUploaded] = useState(false)

  const finish = () => {
    setName(form.name || 'Marie-Claire N.')
    setLoggedIn(true)
    nav('/home')
  }

  return (
    <div className="flex flex-col h-full px-6 pt-16 pb-8 overflow-y-auto" style={{ background: C.cream }}>
      <button onClick={() => nav(-1)} className="mb-6 flex items-center gap-2" style={{ color: C.inkSubtle, fontFamily: FONT.sans }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="text-sm">Back</span>
      </button>

      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs uppercase tracking-widest mb-3">Step 5 of 5</div>
      <h1 style={{ fontFamily: FONT.serif }} className="text-3xl font-bold mb-6">Set up your profile</h1>

      {/* Tab toggle */}
      <div className="flex rounded-xl overflow-hidden border mb-6" style={{ borderColor: C.parchmentDark }}>
        {(['info', 'id'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setStep(t)}
            className="flex-1 py-2.5 text-sm font-semibold transition-all"
            style={{
              fontFamily: FONT.sans,
              background: step === t ? C.forest : C.white,
              color: step === t ? C.white : C.inkMuted,
            }}
          >
            {t === 'info' ? 'Personal info' : 'ID verification'}
          </button>
        ))}
      </div>

      {step === 'info' ? (
        <div className="space-y-4">
          {[
            { label: 'Full name', key: 'name', placeholder: 'Marie-Claire Nkemdirim', type: 'text' },
            { label: 'City (abroad)', key: 'city', placeholder: 'Brussels', type: 'text' },
            { label: 'Country', key: 'country', placeholder: 'France', type: 'text' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">
                {label}
              </label>
              <input
                type={type}
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full border-2 rounded-xl px-4 py-3 outline-none transition-colors focus:border-[var(--color-forest)] text-sm"
                style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
              />
            </div>
          ))}
          <PillButton onClick={() => setStep('id')} fullWidth>Next: ID verification</PillButton>
        </div>
      ) : (
        <div className="space-y-4">
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
            Upload a government-issued ID (national card, passport, or residence permit). Your ID is reviewed within 24 hours.
          </p>
          <button
            onClick={() => setIdUploaded(true)}
            className="w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center gap-3 transition-all"
            style={{ borderColor: idUploaded ? C.forest : C.parchmentDark, background: idUploaded ? '#F0FDF4' : C.white }}
          >
            {idUploaded ? (
              <>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: C.forest }}>
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

          <div className="rounded-xl p-4 border" style={{ background: '#FFF7E6', borderColor: '#F5DCA0' }}>
            <div style={{ fontFamily: FONT.mono, color: '#92400E' }} className="text-[10px] uppercase tracking-wider mb-1">Why we verify IDs</div>
            <p style={{ fontFamily: FONT.sans, color: '#78350F' }} className="text-xs leading-relaxed">
              ID verification protects all parties. Verified accounts can access escrow payments and contractor hiring. Unverified accounts can browse but not transact.
            </p>
          </div>

          <PillButton onClick={finish} fullWidth>Complete setup</PillButton>
        </div>
      )}
    </div>
  )
}
