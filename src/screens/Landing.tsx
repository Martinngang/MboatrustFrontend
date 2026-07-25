import { useNavigate } from 'react-router-dom'
import { useApp, fmt, T, type Role } from '../context'
import { C, FONT, Card, ProgressBar, Stars, PillButton, ThemeToggle } from '../components/MobileLayout'
import { InstallButton } from '../components/InstallButton'

export function LandingScreen() {
  return (
    <div style={{ background: C.cream, color: C.ink }}>
      <Nav />
      <Hero />
      <StatsStrip />
      <CityMarquee />
      <HowItWorks />
      <RolesShowcase />
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

        {/* Floating mock cards */}
        <div className="relative mx-auto h-[380px] w-full max-w-md lg:h-[440px]">
          <div
            className="animate-float absolute left-0 top-4 w-[78%] rounded-[24px] border border-white/15 p-4 shadow-2xl backdrop-blur-xl sm:top-8"
            style={{ background: 'rgba(255,255,255,0.1)' }}
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
            style={{ background: C.white, borderColor: C.parchmentDark, ['--float-rot' as string]: '-2deg' }}
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
        </div>
      </div>
    </section>
  )
}

// ── Stats strip ─────────────────────────────────────────────────────────────
function StatsStrip() {
  const { projects, contractors, landListings } = useApp()
  const totalEscrowed = projects.reduce((s, p) => s + p.raised, 0)
  const verifiedContractors = contractors.filter((c) => c.verified).length
  const verifiedLand = landListings.filter((l) => l.verified).length

  const stats = [
    { value: fmt(totalEscrowed), label: 'Currently in escrow' },
    { value: '2,800+', label: 'Diaspora members' },
    { value: `${verifiedContractors + verifiedLand}+`, label: 'Verified contractors & listings' },
    { value: '100%', label: 'Milestones photo-verified' },
  ]

  return (
    <section className="border-b" style={{ borderColor: C.parchmentDark, background: C.white }}>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-10 sm:px-8 md:grid-cols-4 md:gap-4 md:py-12">
        {stats.map((s) => (
          <div key={s.label} className="text-center md:border-l md:first:border-l-0" style={{ borderColor: C.parchmentDark }}>
            <div style={{ fontFamily: FONT.serif, color: C.forest }} className="text-2xl font-bold sm:text-3xl">{s.value}</div>
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
            {c} <span style={{ color: C.amber }} className="mx-3">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', icon: '🔒', title: 'Fund into escrow', body: 'Pay via MTN MoMo or Orange Money. Funds are held securely — not sent to the recipient yet.' },
    { n: '02', icon: '📸', title: 'Proof gets submitted', body: 'Photo, video and GPS-tagged evidence is submitted for every milestone, as it happens.' },
    { n: '03', icon: '🧾', title: 'A local verifier checks it', body: 'An independent, on-ground agent confirms the work matches the evidence before anyone can approve.' },
    { n: '04', icon: '✅', title: 'You approve, funds release', body: 'Review the verified evidence and approve. Payment releases from escrow only then.' },
  ]

  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
      <div className="mb-14 max-w-2xl">
        <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-xs uppercase tracking-[0.3em]">How it works</div>
        <h2 style={{ fontFamily: FONT.serif }} className="mt-3 text-3xl font-bold sm:text-4xl">Four steps between your money and real, verified work.</h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.n} className="relative rounded-[24px] border p-6 transition-all hover:-translate-y-1 hover:shadow-xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div style={{ fontFamily: FONT.serif, color: C.parchmentDark }} className="absolute right-5 top-4 text-4xl font-bold">{s.n}</div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: C.parchment }}>{s.icon}</div>
            <h3 style={{ fontFamily: FONT.serif }} className="mt-5 text-lg font-bold">{s.title}</h3>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-2 text-sm leading-relaxed">{s.body}</p>
            {i < steps.length - 1 && (
              <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 lg:block" style={{ color: C.parchmentDark }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10H16M11 5L16 10L11 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Roles showcase ────────────────────────────────────────────────────────────
const ROLE_CARDS: { id: NonNullable<Role>; icon: string; title: string; body: string; points: string[]; bg: string }[] = [
  {
    id: 'funder',
    icon: '🌍',
    title: 'Diaspora Funder',
    body: 'Fund verified community projects, hire contractors, and invest in land — from anywhere.',
    points: ['Escrow-protected payments', 'Milestone-by-milestone approval', 'Full transaction history'],
    bg: 'linear-gradient(135deg, #1A4731 0%, #2D6B4A 100%)',
  },
  {
    id: 'recipient',
    icon: '🏗️',
    title: 'Project Recipient',
    body: 'Get funded for community or family projects and prove progress with photo, video and GPS evidence.',
    points: ['Simple milestone submission', 'Transparent status tracking', 'Fast MoMo/OM withdrawal'],
    bg: `linear-gradient(135deg, ${C.forestDark} 0%, ${C.forest} 100%)`,
  },
  {
    id: 'contractor',
    icon: '🔧',
    title: 'Local Contractor',
    body: 'Bid on real jobs and get paid securely per milestone — no chasing invoices.',
    points: ['Verified job postings only', 'Escrow-backed contracts', 'Build a public rating'],
    bg: `linear-gradient(135deg, ${C.steel} 0%, #2A4E77 100%)`,
  },
  {
    id: 'seller',
    icon: '🏡',
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
        <div className="mb-14 max-w-2xl">
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-xs uppercase tracking-[0.3em]">For everyone</div>
          <h2 style={{ fontFamily: FONT.serif }} className="mt-3 text-3xl font-bold sm:text-4xl">Built for every side of the transaction.</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {ROLE_CARDS.map((r) => (
            <button
              key={r.id}
              onClick={() => nav('/language')}
              className="group relative overflow-hidden rounded-[28px] p-7 text-left transition-all hover:-translate-y-1 hover:shadow-2xl sm:p-8"
              style={{ background: r.bg }}
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-125" style={{ background: C.white }} />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: 'rgba(255,255,255,0.14)' }}>{r.icon}</div>
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
          ))}
        </div>
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
      <div className="mb-14 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-xs uppercase tracking-[0.3em]">Live on the platform</div>
          <h2 style={{ fontFamily: FONT.serif }} className="mt-3 text-3xl font-bold sm:text-4xl">Real projects, funded and verified right now.</h2>
        </div>
        <button onClick={() => nav('/language')} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-sm font-semibold whitespace-nowrap">
          Browse all projects →
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.slice(0, 3).map((p) => {
          const pct = Math.round((p.raised / p.totalAmount) * 100)
          return (
            <Card key={p.id} onClick={() => nav('/language')} className="overflow-hidden">
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
          )
        })}
      </div>
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
        <div className="mb-14 max-w-2xl">
          <div style={{ fontFamily: FONT.mono, color: C.amberLight }} className="text-xs uppercase tracking-[0.3em]">Trusted by the community</div>
          <h2 style={{ fontFamily: FONT.serif }} className="mt-3 text-3xl font-bold text-white sm:text-4xl">Words from people already using it.</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {quotes.map((q) => (
            <div key={q.name} className="rounded-[24px] border p-6" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}>
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
            </div>
          ))}
        </div>
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
      <div className="relative mx-auto max-w-3xl text-center">
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
      </div>
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
