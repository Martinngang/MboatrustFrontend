import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, fmt, T, type Role } from '../context'
import { C, FONT, Card, ProgressBar, Stars, PillButton, ThemeToggle } from '../components/MobileLayout'
import { InstallButton } from '../components/InstallButton'
import { Reveal } from '../components/Reveal'
import { Tilt3D } from '../components/Tilt3D'
import { AppIcon, type IconName } from '../components/icons'

export function LandingScreen() {
  return (
    <div style={{ background: C.cream, color: C.ink }}>
      <Nav />
      <Hero />
      <TrustLedger />
      <StatsStrip />
      <CityMarquee />
      <HowItWorks />
      <RolesShowcase />
      <VerificationDeepDive />
      <LiveProjects />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  )
}

// ── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const nav = useNavigate()
  const { lang, setLang } = useApp()

  return (
    <div className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ borderColor: C.navGlassBorder, background: C.navGlassBg }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: C.forest }}>
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L18 7V15L11 20L4 15V7L11 2Z" fill="none" stroke={C.amber} strokeWidth="1.6" />
              <circle cx="11" cy="11" r="2.5" fill={C.amber} />
            </svg>
          </div>
          <span style={{ fontFamily: FONT.serif }} className="text-lg font-bold">Mboa Trust</span>
        </div>

        <div className="hidden items-center gap-8 lg:flex">
          {[
            { label: 'How it works', href: '#how-it-works' },
            { label: 'For everyone', href: '#for-everyone' },
            { label: 'Verification', href: '#verification' },
            { label: 'Live projects', href: '#live-projects' },
          ].map((l) => (
            <a key={l.href} href={l.href} style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm font-medium transition-colors hover:text-[var(--color-forest)]">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <InstallButton />
          <ThemeToggle />
          <div className="hidden overflow-hidden rounded-full border sm:flex" style={{ borderColor: C.parchmentDark }}>
            {(['en', 'fr'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
                style={{ fontFamily: FONT.mono, background: lang === l ? C.forest : 'transparent', color: lang === l ? C.white : C.inkSubtle }}
              >
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => nav('/login')} className="hidden text-sm font-semibold sm:block" style={{ fontFamily: FONT.sans, color: C.ink }}>
            Sign in
          </button>
          <button
            onClick={() => nav('/language')}
            className="rounded-full px-4 py-2.5 text-sm font-bold transition-all active:scale-95 sm:px-5"
            style={{ background: C.forest, color: C.white, fontFamily: FONT.sans, boxShadow: '0 8px 20px rgba(26,71,49,0.25)' }}
          >
            Get started
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const nav = useNavigate()
  const { lang, projects } = useApp()
  const featured = projects[0]
  const pct = featured ? Math.round((featured.raised / featured.totalAmount) * 100) : 0

  return (
    <section className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #0F1A14 0%, #1A4731 52%, #0F2B1E 100%)' }}>
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 22px, #fff 22px, #fff 23px)' }} />
      <div className="animate-drift absolute -top-24 right-[-10%] h-[420px] w-[420px] rounded-full opacity-20 blur-3xl" style={{ background: C.amber }} />
      <div className="animate-drift absolute bottom-[-15%] left-[-10%] h-[360px] w-[360px] rounded-full opacity-10 blur-3xl" style={{ background: C.amberLight, animationDelay: '3s' }} />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8 lg:pb-28 lg:pt-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5" style={{ borderColor: 'rgba(232,160,32,0.35)', background: 'rgba(232,160,32,0.1)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.amber }} />
            <span style={{ fontFamily: FONT.mono, color: C.amberLight }} className="text-[10px] uppercase tracking-[0.25em]">
              Escrow-secured · Verifier-checked
            </span>
          </div>

          <h1 style={{ fontFamily: FONT.serif }} className="max-w-xl text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
            {T.welcome_title[lang]}
          </h1>
          <p style={{ fontFamily: FONT.sans }} className="mt-6 max-w-lg text-base leading-relaxed text-white/75 sm:text-lg">
            {T.welcome_sub[lang]}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:max-w-md">
            <button
              onClick={() => nav('/language')}
              className="rounded-2xl py-3.5 text-base font-bold transition-all active:scale-95 sm:flex-1"
              style={{ background: C.amber, color: C.forestDark, fontFamily: FONT.sans, boxShadow: '0 12px 30px rgba(232,160,32,0.3)' }}
            >
              {T.get_started[lang]} →
            </button>
            <button
              onClick={() => nav('/login')}
              className="rounded-2xl border py-3.5 text-sm font-semibold text-white transition-all active:scale-95 sm:flex-1"
              style={{ borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', fontFamily: FONT.sans }}
            >
              {T.sign_in[lang]}
            </button>
          </div>

          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {['MC', 'TK', 'RA', 'EN'].map((initials, i) => (
                <div
                  key={initials}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold text-white"
                  style={{ borderColor: '#0F2B1E', background: [C.forestLight, C.steel, C.moss, '#7A5A1E'][i], fontFamily: FONT.mono }}
                >
                  {initials}
                </div>
              ))}
            </div>
            <div style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.7)' }} className="text-xs sm:text-sm">
              Trusted by <strong style={{ color: 'white' }}>2,800+</strong> diaspora members across 3 continents
            </div>
          </div>
        </div>

        {/* Floating mock cards — the whole panel tilts toward the cursor in real
            3D (Tilt3D), and each card sits at its own translateZ depth inside
            that tilted space, so they visibly shift apart as you move the mouse. */}
        <Tilt3D max={9} glare={false} className="relative mx-auto h-[380px] w-full max-w-md lg:h-[440px]">
          <div
            className="animate-float absolute left-0 top-4 w-[78%] rounded-[24px] border border-white/15 p-4 shadow-2xl backdrop-blur-xl sm:top-8"
            style={{ background: 'rgba(255,255,255,0.1)', transform: 'translateZ(30px)' }}
          >
            <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=220&fit=crop&auto=format" alt="" className="h-32 w-full rounded-2xl object-cover" />
            <div className="mt-3">
              <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)' }} className="text-[9px] uppercase tracking-[0.2em]">{featured?.location}</div>
              <div style={{ fontFamily: FONT.serif }} className="mt-1 text-sm font-bold text-white">{featured?.title}</div>
              <div className="mt-2.5">
                <ProgressBar pct={pct} color={C.amber} />
                <div className="mt-1.5 flex justify-between">
                  <span style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px]">{featured && fmt(featured.raised)}</span>
                  <span style={{ fontFamily: FONT.mono, color: C.amberLight }} className="text-[10px]">{pct}%</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className="animate-float-slow absolute bottom-0 right-0 w-[62%] rounded-[22px] border p-4 shadow-2xl"
            style={{ background: C.white, borderColor: C.parchmentDark, ['--float-rot' as string]: '-2deg', transform: 'translateZ(60px)' }}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: '#F0FDF4' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8L6.5 11.5L13 4" stroke={C.forest} strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-xs font-bold">Milestone approved</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px]">Funds released from escrow</div>
              </div>
            </div>
            <div className="mt-3 rounded-xl p-2.5" style={{ background: C.parchment }}>
              <div style={{ fontFamily: FONT.serif, color: C.forest }} className="text-lg font-bold">XAF 1,400,000</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider">Verified · Released today</div>
            </div>
          </div>

          {/* Rotating verification seal — stamps in on load, spins slowly on its
              Y axis like a coin (real perspective, not a flat rotation), while
              its inner ring text keeps turning in-plane. Floats highest (Z) of
              the three layers so it visibly leads the parallax. */}
          <div
            className="animate-seal-stamp absolute -top-4 right-2 hidden h-[104px] w-[104px] sm:block lg:-top-2 lg:right-8"
            style={{ filter: `drop-shadow(0 8px 24px ${C.glowPrimary})`, transform: 'translateZ(90px)' }}
            aria-hidden="true"
          >
            <div className="animate-coin-spin h-full w-full">
              <svg viewBox="0 0 128 128" className="h-full w-full">
                <circle cx="64" cy="64" r="60" fill="rgba(52,168,115,0.08)" stroke="rgba(87,214,154,0.4)" strokeWidth="1.5" />
                <circle cx="64" cy="64" r="48" fill="none" stroke="rgba(87,214,154,0.25)" strokeWidth="1" strokeDasharray="2 4" />
                <g className="animate-rotate-text">
                  <defs>
                    <path id="heroSealPath" d="M 64,64 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
                  </defs>
                  <text fontFamily="JetBrains Mono, monospace" fontSize="7" fill={C.amberLight} letterSpacing="2.5">
                    <textPath href="#heroSealPath" startOffset="0%">VERIFIED · ESCROWED · RELEASED · VERIFIED · ESCROWED · RELEASED ·</textPath>
                  </text>
                </g>
                <path d="M46 65 L58 77 L84 49" fill="none" stroke={C.forestLight} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </Tilt3D>
      </div>
    </section>
  )
}

// ── Trust ledger (before / after comparison) ──────────────────────────────────
function TrustLedger() {
  const before = [
    'Funds handed over, no record of intended use',
    'Workers chosen by word of mouth, no bidding',
    'Progress reported by phone call or a single photo',
    'No process when work stalls or a dispute arises',
    'Land bought on documents no one verified in person',
  ]
  const after = [
    'Funds held in escrow, released only per milestone',
    'Contractors bid openly, ranked by verified track record',
    'Geotagged, timestamped proof reviewed before release',
    'Built-in dispute flow with optional local verifier visits',
    'Land listings tied to verified ownership documents',
  ]

  return (
    <section style={{ background: C.cream }}>
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="mb-14 max-w-2xl">
          <div style={{ fontFamily: FONT.mono, color: C.seal }} className="text-xs uppercase tracking-[0.3em]">The trust gap</div>
          <h2 style={{ fontFamily: FONT.serif }} className="mt-3 text-3xl font-bold sm:text-4xl">You can't be there. Now you don't have to guess.</h2>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-4 text-base leading-relaxed">
            Money sent home for a project, a hire, or a plot of land usually depends on a phone call and a photo. Mboa Trust replaces that guesswork with proof.
          </p>
        </Reveal>

        <Reveal
          className="grid overflow-hidden rounded-[24px] border shadow-sm sm:grid-cols-2"
          style={{ borderColor: C.parchmentDark }}
        >
          <div className="p-8 sm:p-10" style={{ background: C.white }}>
            <span style={{ fontFamily: FONT.mono, color: C.seal }} className="text-[11px] font-semibold uppercase tracking-[0.15em]">Sent on trust alone</span>
            <div className="mt-6">
              {before.map((b, i) => (
                <div
                  key={b}
                  className="flex gap-3 py-3.5 text-sm leading-relaxed"
                  style={{ borderTop: i === 0 ? 'none' : `1px solid ${C.parchmentDark}`, color: C.inkMuted, fontFamily: FONT.sans }}
                >
                  <span className="mt-0.5 flex-shrink-0 opacity-80" style={{ color: C.seal }}><AppIcon name="close" size={14} strokeWidth={2.25} /></span>
                  {b}
                </div>
              ))}
            </div>
          </div>
          <div className="border-t p-8 sm:border-l sm:border-t-0 sm:p-10" style={{ background: C.white, borderColor: C.parchmentDark }}>
            <span style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[11px] font-semibold uppercase tracking-[0.15em]">Sent through Mboa Trust</span>
            <div className="mt-6">
              {after.map((a, i) => (
                <div
                  key={a}
                  className="flex gap-3 py-3.5 text-sm font-medium leading-relaxed"
                  style={{ borderTop: i === 0 ? 'none' : `1px solid ${C.parchmentDark}`, color: C.ink, fontFamily: FONT.sans }}
                >
                  <span className="mt-0.5 flex-shrink-0" style={{ color: C.forest }}><AppIcon name="check" size={14} strokeWidth={2.25} /></span>
                  {a}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ── Animated stat number ───────────────────────────────────────────────────────
function AnimatedStat({ value, prefix = '', suffix = '', duration = 1200 }: { value: number; prefix?: string; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(prefix + '0' + suffix)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        obs.unobserve(el)
        const start = performance.now()
        function tick(now: number) {
          const p = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          setDisplay(prefix + Math.round(eased * value).toLocaleString('fr-FR') + suffix)
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.5 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [value, prefix, suffix, duration])

  return <span ref={ref}>{display}</span>
}

// ── Stats strip ─────────────────────────────────────────────────────────────
function StatsStrip() {
  const { projects, contractors, landListings } = useApp()
  const totalEscrowed = projects.reduce((s, p) => s + p.raised, 0)
  const verifiedContractors = contractors.filter((c) => c.verified).length
  const verifiedLand = landListings.filter((l) => l.verified).length

  const stats = [
    { node: <AnimatedStat value={totalEscrowed} prefix="XAF " />, label: 'Currently in escrow' },
    { node: <AnimatedStat value={2800} suffix="+" />, label: 'Diaspora members' },
    { node: <AnimatedStat value={verifiedContractors + verifiedLand} suffix="+" />, label: 'Verified contractors & listings' },
    { node: <AnimatedStat value={100} suffix="%" />, label: 'Milestones photo-verified' },
  ]

  return (
    <section className="border-b" style={{ borderColor: C.parchmentDark, background: C.white }}>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-10 sm:px-8 md:grid-cols-4 md:gap-4 md:py-12">
        {stats.map((s) => (
          <div key={s.label} className="text-center md:border-l md:first:border-l-0" style={{ borderColor: C.parchmentDark }}>
            <div style={{ fontFamily: FONT.serif, color: C.forest }} className="text-2xl font-bold tabular-nums sm:text-3xl">{s.node}</div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-1.5 text-[10px] uppercase tracking-[0.15em] leading-snug sm:text-[11px]">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── City marquee ─────────────────────────────────────────────────────────────
function CityMarquee() {
  const cities = ['Brussels', 'Toronto', 'Paris', 'London', 'Douala', 'Yaoundé', 'Bamenda', 'Washington D.C.', 'Frankfurt', 'Montréal']
  const row = [...cities, ...cities]

  return (
    <div className="overflow-hidden border-b py-4" style={{ borderColor: C.parchmentDark, background: C.parchment }}>
      <div className="animate-marquee flex w-max gap-10 whitespace-nowrap">
        {row.map((c, i) => (
          <span key={i} style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs uppercase tracking-[0.2em]">
            {c} <span style={{ color: C.amber }} className="mx-3">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Trust path (Fund → Verify → Release, animated line + stamped checkpoints) ─
function TrustPath() {
  const stageRef = useRef<HTMLDivElement>(null)
  const [lineIn, setLineIn] = useState(false)
  const [checks, setChecks] = useState([false, false, false])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        obs.unobserve(el)
        setLineIn(true)
        ;[0, 1, 2].forEach((i) => setTimeout(() => setChecks((c) => { const n = [...c]; n[i] = true; return n }), 300 + i * 260))
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const checkpoints = [
    {
      num: '01 — FUND',
      title: 'Escrow, not a handout',
      body: 'Diaspora funders commit money to clear milestones. Nothing moves until work does.',
      icon: <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
    },
    {
      num: '02 — VERIFY',
      title: 'Proof, reviewed properly',
      body: 'Geotagged photos, video and an optional local verifier confirm real progress.',
      icon: <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
    },
    {
      num: '03 — RELEASE',
      title: "Paid the moment it's earned",
      body: 'Funds release straight to MoMo or Orange Money, milestone by milestone.',
      icon: <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
    },
  ]

  return (
    <div ref={stageRef} className="relative mx-auto mb-20 max-w-4xl">
      <svg className="hidden w-full sm:block" viewBox="0 0 980 40" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="trustPathGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.forest} />
            <stop offset="50%" stopColor={C.amber} />
            <stop offset="100%" stopColor={C.forestLight} />
          </linearGradient>
        </defs>
        <line x1="80" y1="20" x2="900" y2="20" stroke={C.parchmentDark} strokeWidth="2" />
        <line x1="80" y1="20" x2="900" y2="20" stroke="url(#trustPathGradient)" strokeWidth="2.5" strokeLinecap="round" pathLength={1000} className={`path-draw ${lineIn ? 'in' : ''}`} />
      </svg>

      <div className="grid gap-10 sm:-mt-4 sm:grid-cols-3">
        {checkpoints.map((c, i) => (
          <div key={c.num} className="px-3 text-center">
            <div
              className={`checkpoint-stamp mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border ${checks[i] ? 'in' : ''}`}
              style={{
                background: C.white,
                borderColor: checks[i] ? C.borderBright : C.parchmentDark,
                boxShadow: checks[i] ? `0 0 0 6px ${C.glowPrimary}, 0 10px 24px -10px ${C.glowPrimary}` : 'none',
                color: C.forest,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22">{c.icon}</svg>
            </div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[11px] uppercase tracking-[0.15em]">{c.num}</div>
            <h4 style={{ fontFamily: FONT.serif }} className="mb-1.5 text-lg font-bold">{c.title}</h4>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mx-auto max-w-[240px] text-sm leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps: { n: string; icon: IconName; title: string; body: string }[] = [
    { n: '01', icon: 'lock', title: 'Fund into escrow', body: 'Pay via MTN MoMo or Orange Money. Funds are held securely — not sent to the recipient yet.' },
    { n: '02', icon: 'camera', title: 'Proof gets submitted', body: 'Photo, video and GPS-tagged evidence is submitted for every milestone, as it happens.' },
    { n: '03', icon: 'receipt', title: 'A local verifier checks it', body: 'An independent, on-ground agent confirms the work matches the evidence before anyone can approve.' },
    { n: '04', icon: 'checkCircle', title: 'You approve, funds release', body: 'Review the verified evidence and approve. Payment releases from escrow only then.' },
  ]

  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
      <Reveal className="mb-16 max-w-2xl">
        <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-xs uppercase tracking-[0.3em]">How it works</div>
        <h2 style={{ fontFamily: FONT.serif }} className="mt-3 text-3xl font-bold sm:text-4xl">The Trust Path — the same three checkpoints, every time.</h2>
        <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-4 text-base leading-relaxed">A repair, a contract, a land purchase — every project on Mboa Trust moves through fund, verify, release.</p>
      </Reveal>

      <Reveal>
        <TrustPath />
      </Reveal>

      <Reveal className="mb-10 max-w-2xl">
        <div style={{ fontFamily: FONT.mono, color: C.amber }} className="text-xs uppercase tracking-[0.3em]">Inside each milestone</div>
        <h3 style={{ fontFamily: FONT.serif }} className="mt-3 text-2xl font-bold sm:text-3xl">Four steps between your money and real, verified work.</h3>
      </Reveal>

      <Reveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <Tilt3D key={s.n} max={6} className="group relative rounded-[24px] border p-6 shadow-sm" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div style={{ fontFamily: FONT.serif, color: C.parchmentDark }} className="absolute right-5 top-4 text-4xl font-bold">{s.n}</div>
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-700 ease-out group-hover:[transform:perspective(400px)_rotateY(360deg)]"
              style={{ background: C.parchment, transformStyle: 'preserve-3d', color: C.forest }}
            >
              <AppIcon name={s.icon} size={22} />
            </div>
            <h3 style={{ fontFamily: FONT.serif }} className="mt-5 text-lg font-bold">{s.title}</h3>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-2 text-sm leading-relaxed">{s.body}</p>
            {i < steps.length - 1 && (
              <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 lg:block" style={{ color: C.parchmentDark }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10H16M11 5L16 10L11 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </Tilt3D>
        ))}
      </Reveal>
    </section>
  )
}

// ── Roles showcase ────────────────────────────────────────────────────────────
const ROLE_CARDS: { id: NonNullable<Role>; icon: IconName; title: string; body: string; points: string[]; bg: string }[] = [
  {
    id: 'funder',
    icon: 'globe',
    title: 'Diaspora Funder',
    body: 'Fund verified community projects, hire contractors, and invest in land — from anywhere.',
    points: ['Escrow-protected payments', 'Milestone-by-milestone approval', 'Full transaction history'],
    bg: 'linear-gradient(135deg, #1A4731 0%, #2D6B4A 100%)',
  },
  {
    id: 'recipient',
    icon: 'hardHat',
    title: 'Project Recipient',
    body: 'Get funded for community or family projects and prove progress with photo, video and GPS evidence.',
    points: ['Simple milestone submission', 'Transparent status tracking', 'Fast MoMo/OM withdrawal'],
    bg: `linear-gradient(135deg, ${C.forestDark} 0%, ${C.forest} 100%)`,
  },
  {
    id: 'contractor',
    icon: 'wrench',
    title: 'Local Contractor',
    body: 'Bid on real jobs and get paid securely per milestone — no chasing invoices.',
    points: ['Verified job postings only', 'Escrow-backed contracts', 'Build a public rating'],
    bg: `linear-gradient(135deg, ${C.steel} 0%, #2A4E77 100%)`,
  },
  {
    id: 'seller',
    icon: 'home',
    title: 'Land / Property Seller',
    body: 'List land with verified documentation and reach diaspora buyers who need certainty before they commit.',
    points: ['Document verification', 'On-site inspection reports', 'Serious, vetted buyers'],
    bg: `linear-gradient(135deg, ${C.moss} 0%, ${C.forest} 100%)`,
  },
]

function RolesShowcase() {
  const nav = useNavigate()

  return (
    <section id="for-everyone" style={{ background: C.parchment }} className="border-y" >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28" style={{ borderColor: C.parchmentDark }}>
        <Reveal className="mb-14 max-w-2xl">
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-xs uppercase tracking-[0.3em]">For everyone</div>
          <h2 style={{ fontFamily: FONT.serif }} className="mt-3 text-3xl font-bold sm:text-4xl">Built for every side of the transaction.</h2>
        </Reveal>

        <Reveal className="grid gap-5 md:grid-cols-2">
          {ROLE_CARDS.map((r) => (
            <Tilt3D key={r.id} max={5} className="group overflow-hidden rounded-[28px]" style={{ boxShadow: '0 20px 50px -20px rgba(0,0,0,0.25)' }}>
              <button
                onClick={() => nav('/language')}
                className="relative w-full p-7 text-left transition-shadow duration-300 hover:shadow-2xl sm:p-8"
                style={{ background: r.bg }}
              >
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-125" style={{ background: C.white }} />
                <div className="relative">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-white transition-transform duration-700 ease-out group-hover:[transform:perspective(400px)_rotateY(360deg)]"
                    style={{ background: 'rgba(255,255,255,0.14)', transformStyle: 'preserve-3d' }}
                  >
                    <AppIcon name={r.icon} size={22} />
                  </div>
                  <h3 style={{ fontFamily: FONT.serif }} className="mt-5 text-xl font-bold text-white">{r.title}</h3>
                  <p style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.75)' }} className="mt-2 max-w-sm text-sm leading-relaxed">{r.body}</p>
                  <ul className="mt-5 space-y-2">
                    {r.points.map((p) => (
                      <li key={p} className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                          <path d="M3 7L5.5 9.5L11 4" stroke={C.amberLight} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.85)' }} className="text-xs">{p}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                    Get started <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </button>
            </Tilt3D>
          ))}
        </Reveal>
      </div>
    </section>
  )
}

// ── Verification deep dive ──────────────────────────────────────────────────
function VerificationDeepDive() {
  const items = [
    { num: '01', title: 'Live capture only', body: 'Evidence is shot in-app with location and timestamp attached — no gallery uploads, no reused photos.' },
    { num: '02', title: 'Before-and-after comparison', body: 'Every milestone is checked against the previous one from the same angle, so progress is visible, not just claimed.' },
    { num: '03', title: 'Optional human verifier', body: 'For higher-value milestones, a local verifier confirms the work in person and files a short report.' },
    { num: '04', title: 'Reputation that follows', body: 'Recipients, contractors and sellers build a visible track record across every project on the platform.' },
  ]

  return (
    <section id="verification" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <Reveal className="relative order-2 mx-auto aspect-square w-full max-w-[420px] lg:order-1">
          {/* Rests at a slight tilt so the scene reads as already-3D, then
              follows the cursor for a much wider, freely-orbiting tilt on hover. */}
          <Tilt3D className="absolute inset-0" style={{ position: 'absolute' }} max={16} restX={6} glare={false} scaleOnHover={false}>
            <div className="animate-orbit-ring-1 absolute left-1/2 top-1/2 rounded-full border border-dashed" style={{ width: 210, height: 210, marginLeft: -105, marginTop: -105, borderColor: C.parchmentDark }}>
              <div className="animate-orbit-node-1 absolute rounded-full border" style={{ width: 40, height: 40, marginLeft: -20, marginTop: -125, left: '50%', top: '50%', background: C.white, borderColor: C.borderBright }}>
                <div className="flex h-full w-full items-center justify-center">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 2l3 6 6 .9-4.5 4.4 1 6.2L12 16.8 6.5 19.5l1-6.2L3 8.9 9 8z" stroke={C.amber} strokeWidth="1.4" strokeLinejoin="round" /></svg>
                </div>
              </div>
            </div>
            <div className="animate-orbit-ring-2 absolute left-1/2 top-1/2 rounded-full border border-dashed" style={{ width: 320, height: 320, marginLeft: -160, marginTop: -160, borderColor: C.parchmentDark }}>
              <div className="animate-orbit-node-2 absolute rounded-full border" style={{ width: 40, height: 40, marginLeft: -20, marginTop: -180, left: '50%', top: '50%', background: C.white, borderColor: C.borderBright }}>
                <div className="flex h-full w-full items-center justify-center">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 21c-4-3-7-6.5-7-10.5A7 7 0 0 1 12 3a7 7 0 0 1 7 7.5C19 14.5 16 18 12 21z" stroke={C.amber} strokeWidth="1.4" /><circle cx="12" cy="10.5" r="2.3" stroke={C.amber} strokeWidth="1.4" /></svg>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full"
                style={{ background: `radial-gradient(circle at 35% 30%, ${C.amberLight}, ${C.amber} 60%, #7A611B 100%)`, boxShadow: `0 0 60px -8px ${C.glowPrimary}` }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M8 12.5l2.5 2.5L16 9" stroke="#16130A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
          </Tilt3D>
        </Reveal>

        <Reveal className="order-1 lg:order-2">
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-xs uppercase tracking-[0.3em]">How proof actually holds up</div>
          <h2 style={{ fontFamily: FONT.serif }} className="mb-8 mt-3 text-3xl font-bold sm:text-4xl">No single photo has to carry all the trust.</h2>
          <div className="flex flex-col gap-1">
            {items.map((it, i) => (
              <div key={it.num} className="flex gap-4 py-5" style={{ borderTop: i === 0 ? 'none' : `1px solid ${C.parchmentDark}` }}>
                <span style={{ fontFamily: FONT.mono, color: C.amber }} className="flex-shrink-0 pt-0.5 text-[13px]">{it.num}</span>
                <div>
                  <h4 style={{ fontFamily: FONT.serif }} className="mb-1.5 text-lg font-bold">{it.title}</h4>
                  <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed">{it.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ── Live projects preview ────────────────────────────────────────────────────
function LiveProjects() {
  const nav = useNavigate()
  const { projects } = useApp()

  return (
    <section id="live-projects" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
      <Reveal className="mb-14 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-xs uppercase tracking-[0.3em]">Live on the platform</div>
          <h2 style={{ fontFamily: FONT.serif }} className="mt-3 text-3xl font-bold sm:text-4xl">Real projects, funded and verified right now.</h2>
        </div>
        <button onClick={() => nav('/language')} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-sm font-semibold whitespace-nowrap">
          Browse all projects →
        </button>
      </Reveal>

      <Reveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.slice(0, 3).map((p) => {
          const pct = Math.round((p.raised / p.totalAmount) * 100)
          return (
            <Tilt3D key={p.id} max={6} className="rounded-2xl">
              <Card onClick={() => nav('/language')} className="overflow-hidden">
                <img src={p.image} alt={p.title} className="h-44 w-full object-cover" />
                <div className="p-5">
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{p.category} · {p.location}</div>
                  <div style={{ fontFamily: FONT.serif }} className="mt-1.5 text-base font-bold">{p.title}</div>
                  <div className="mt-4">
                    <ProgressBar pct={pct} />
                    <div className="mt-2 flex justify-between">
                      <span style={{ fontFamily: FONT.serif }} className="text-sm font-bold">{fmt(p.raised)}</span>
                      <span style={{ fontFamily: FONT.mono, color: C.forest }} className="text-xs font-semibold">{pct}% funded</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 border-t pt-4" style={{ borderColor: C.parchmentDark }}>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: C.forest, fontFamily: FONT.serif }}>
                      {p.recipient[0]}
                    </div>
                    <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">{p.recipient}</span>
                    <span className="ml-auto"><Stars rating={p.recipientRating} /></span>
                  </div>
                </div>
              </Card>
            </Tilt3D>
          )
        })}
      </Reveal>
    </section>
  )
}

// ── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const quotes = [
    { name: 'Marie-Claire N.', role: 'Diaspora Funder · Brussels', quote: "I've sent money home before and never known where it really went. With escrow and photo proof, I finally watched my borehole project happen step by step.", rating: 5 },
    { name: 'Théodore K.', role: 'Diaspora Funder · Toronto', quote: 'The milestone system means I only release funds once work is actually verified on-site. It changed how I think about giving from abroad.', rating: 5 },
    { name: 'Emmanuel N.', role: 'Project Recipient · Bamenda', quote: 'Submitting proof takes minutes and the funder can see exactly what I\'ve done. Payments land within minutes of approval.', rating: 5 },
  ]

  return (
    <section style={{ background: C.forestDark }} className="relative overflow-hidden">
      <div className="animate-drift absolute right-[-10%] top-[-20%] h-[380px] w-[380px] rounded-full opacity-10 blur-3xl" style={{ background: C.amber }} />
      <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="mb-14 max-w-2xl">
          <div style={{ fontFamily: FONT.mono, color: C.amberLight }} className="text-xs uppercase tracking-[0.3em]">Trusted by the community</div>
          <h2 style={{ fontFamily: FONT.serif }} className="mt-3 text-3xl font-bold text-white sm:text-4xl">Words from people already using it.</h2>
        </Reveal>

        <Reveal className="grid gap-5 md:grid-cols-3">
          {quotes.map((q) => (
            <Tilt3D key={q.name} max={4} className="rounded-[24px] border p-6" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ fontFamily: FONT.serif, color: C.amber }} className="text-4xl leading-none">"</div>
              <p style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.85)' }} className="mt-2 text-sm leading-relaxed italic">{q.quote}</p>
              <div className="mt-6 flex items-center gap-3 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: C.forestLight, fontFamily: FONT.serif }}>
                  {q.name[0]}
                </div>
                <div>
                  <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold text-white">{q.name}</div>
                  <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.5)' }} className="text-[10px] uppercase tracking-wider">{q.role}</div>
                </div>
              </div>
            </Tilt3D>
          ))}
        </Reveal>
      </div>
    </section>
  )
}

// ── Final CTA band ────────────────────────────────────────────────────────────
function FinalCTA() {
  const nav = useNavigate()

  return (
    <section className="relative overflow-hidden px-5 py-20 sm:px-8 sm:py-24" style={{ background: 'linear-gradient(120deg, #1A4731 0%, #0F2B1E 100%)' }}>
      <div className="animate-drift absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.08] blur-3xl" style={{ background: C.amber }} />
      <Reveal className="relative mx-auto max-w-3xl text-center">
        <h2 style={{ fontFamily: FONT.serif }} className="text-3xl font-bold text-white sm:text-4xl">Ready to fund with certainty?</h2>
        <p style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.75)' }} className="mx-auto mt-4 max-w-xl text-base leading-relaxed">
          Create your account in minutes. Every project, contractor and land listing is verified before your money ever moves.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <PillButton onClick={() => nav('/language')}>Get started free →</PillButton>
          <button
            onClick={() => nav('/login')}
            className="rounded-full border px-6 py-3 text-sm font-semibold text-white transition-all active:scale-95"
            style={{ borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', fontFamily: FONT.sans }}
          >
            I already have an account
          </button>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {['No fees to sign up', 'ID verified within 24 hours', 'Cancel anytime'].map((t) => (
            <div key={t} className="flex items-center gap-1.5" style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L4.5 8.5L10 3" stroke={C.amberLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[10px] uppercase tracking-wider">{t}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const columns = [
    { title: 'Product', links: [{ label: 'How it works', href: '#how-it-works' }, { label: 'For everyone', href: '#for-everyone' }, { label: 'Live projects', href: '#live-projects' }] },
    { title: 'Company', links: [{ label: 'About', href: null }, { label: 'Careers', href: null }, { label: 'Blog', href: null }] },
    { title: 'Legal', links: [{ label: 'Privacy policy', href: null }, { label: 'Terms of service', href: null }, { label: 'Escrow terms', href: null }] },
  ]

  return (
    <footer style={{ background: C.forestDark }} className="px-5 pb-8 pt-16 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: C.amber }}>
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                  <path d="M11 2L18 7V15L11 20L4 15V7L11 2Z" fill="none" stroke={C.forestDark} strokeWidth="1.6" />
                  <circle cx="11" cy="11" r="2.5" fill={C.forestDark} />
                </svg>
              </div>
              <span style={{ fontFamily: FONT.serif }} className="text-lg font-bold text-white">Mboa Trust</span>
            </div>
            <p style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.55)' }} className="mt-4 max-w-xs text-sm leading-relaxed">
              Escrow-secured, verifier-checked funding for community projects, contractors and land — built for the diaspora.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.4)' }} className="text-[10px] uppercase tracking-[0.25em]">{col.title}</div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) =>
                  l.href ? (
                    <li key={l.label}>
                      <a href={l.href} style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.7)' }} className="text-sm transition-colors hover:text-white">
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label} style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.4)' }} className="text-sm">
                      {l.label}
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <span style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.4)' }} className="text-[10px] uppercase tracking-wider">
            © {new Date().getFullYear()} Mboa Trust · Yaoundé / Brussels / Toronto
          </span>
          <span style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.4)' }} className="text-[10px] uppercase tracking-wider">
            v1.0.0
          </span>
        </div>
      </div>
    </footer>
  )
}
