import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, FONT, ThemeToggle } from './MobileLayout'
import { AppIcon } from './icons'

export const ONBOARDING_STEPS = [
  { n: 1, label: 'Language', desc: "Pick how you'll use the app" },
  { n: 2, label: 'Account', desc: 'Link your phone number' },
  { n: 3, label: 'Verify', desc: 'Confirm with a one-time code' },
  { n: 4, label: 'Role', desc: "Tell us why you're here" },
  { n: 5, label: 'Profile', desc: 'Set up your identity' },
] as const

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden" style={{ background: '#FFFFFF', border: `1px solid ${C.parchmentDark}` }}>
        <img src="/brand/logo-64.png" alt="Mboa Trust" className="h-7 w-7 object-contain" />
      </div>
      <span style={{ fontFamily: FONT.serif }} className="text-lg font-bold text-white">Mboa Trust</span>
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 transition-colors hover:text-[var(--color-forest)]" style={{ color: C.inkSubtle, fontFamily: FONT.sans }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="text-sm">Back</span>
    </button>
  )
}

/** Shared shell for every onboarding/auth screen — mobile gets a single
 * focused column with a compact progress bar up top; desktop (lg+) gets its
 * own split layout with a branded step-rail panel instead of a stretched
 * version of the mobile view. `step` is omitted for screens outside the
 * numbered 5-step flow (e.g. Login), which collapses the progress UI. */
export function OnboardingShell({
  step,
  title,
  subtitle,
  onBack,
  showBack = true,
  wide = false,
  eyebrow = 'Getting started',
  heroCopy = 'Verified, before the money moves.',
  children,
}: {
  step?: number
  title: string
  subtitle?: ReactNode
  onBack?: () => void
  showBack?: boolean
  wide?: boolean
  eyebrow?: string
  heroCopy?: string
  children: ReactNode
}) {
  const nav = useNavigate()
  const back = onBack ?? (() => nav(-1))

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-[minmax(360px,34%)_1fr]" style={{ background: C.cream }}>
      {/* ── Desktop brand / progress rail ─────────────────────────────────── */}
      <aside
        className="relative hidden overflow-hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:p-12"
        style={{ background: 'linear-gradient(160deg, #0F1A14 0%, #1A4731 55%, #0F2B1E 100%)' }}
      >
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 22px, #fff 22px, #fff 23px)' }} />
        <div className="animate-drift absolute -right-24 -top-24 h-[360px] w-[360px] rounded-full opacity-20 blur-3xl" style={{ background: C.amber }} />
        <div className="animate-drift absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full opacity-10 blur-3xl" style={{ background: C.amberLight, animationDelay: '3s' }} />

        <div className="relative">
          <BrandMark />
          <div className="mt-16 max-w-xs">
            <div style={{ fontFamily: FONT.mono, color: C.amberLight }} className="text-[11px] uppercase tracking-[0.25em]">{eyebrow}</div>
            <h2 style={{ fontFamily: FONT.serif }} className="mt-3 text-[28px] font-medium leading-[1.15] text-white">{heroCopy}</h2>
          </div>
        </div>

        {step !== undefined && (
          <div className="relative mt-14">
            {ONBOARDING_STEPS.map((s) => {
              const state = s.n < step ? 'done' : s.n === step ? 'current' : 'upcoming'
              const isLast = s.n === ONBOARDING_STEPS.length
              return (
                <div key={s.n} className="flex items-stretch gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-all duration-500"
                      style={{
                        fontFamily: FONT.mono,
                        borderColor: state === 'upcoming' ? 'rgba(255,255,255,0.2)' : C.amber,
                        background: state === 'done' ? C.amber : state === 'current' ? 'rgba(232,160,32,0.16)' : 'transparent',
                        color: state === 'done' ? '#16130A' : state === 'current' ? C.amberLight : 'rgba(255,255,255,0.4)',
                        boxShadow: state === 'current' ? '0 0 0 4px rgba(232,160,32,0.12)' : 'none',
                      }}
                    >
                      {state === 'done' ? <AppIcon name="check" size={12} strokeWidth={2.5} /> : s.n}
                    </div>
                    {!isLast && (
                      <div
                        className="my-0.5 w-px flex-1 transition-colors duration-700"
                        style={{ minHeight: 22, background: state === 'done' ? C.amber : 'rgba(255,255,255,0.15)' }}
                      />
                    )}
                  </div>
                  <div className={isLast ? 'pb-0 pt-0.5' : 'pb-4 pt-0.5'}>
                    <div style={{ fontFamily: FONT.sans, color: state === 'upcoming' ? 'rgba(255,255,255,0.4)' : '#fff' }} className="text-sm font-semibold">{s.label}</div>
                    <div style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.4)' }} className="mt-0.5 text-xs">{s.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="relative flex items-center gap-2" style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.4)' }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14 3.5V7.5C14 11 11.5 13.8 8 15C4.5 13.8 2 11 2 7.5V3.5L8 1Z" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="text-[10px] uppercase tracking-wider">Escrow-secured · Bank-level encryption</span>
        </div>
      </aside>

      {/* ── Content column ─────────────────────────────────────────────────── */}
      <div className="relative flex min-h-screen flex-col lg:min-h-0 lg:justify-center">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-6 pt-6 lg:hidden">
          {showBack ? <BackButton onClick={back} /> : <span />}
          <ThemeToggle />
        </div>

        {step !== undefined && (
          <div className="px-6 pt-5 lg:hidden">
            <div className="flex gap-1.5">
              {ONBOARDING_STEPS.map((s) => (
                <div key={s.n} className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: C.parchmentDark }}>
                  <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: s.n <= step ? '100%' : '0%', background: C.forest }} />
                </div>
              ))}
            </div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-2.5 text-[10px] uppercase tracking-widest">
              Step {step} of {ONBOARDING_STEPS.length} — {ONBOARDING_STEPS[step - 1].label}
            </div>
          </div>
        )}

        <div className={`onboarding-page-enter mx-auto w-full flex-1 px-6 pb-10 pt-8 lg:flex-none lg:px-16 lg:py-16 ${wide ? 'lg:max-w-2xl' : 'lg:max-w-md'}`}>
          <div className="mb-10 hidden items-center justify-between lg:flex">
            {showBack ? <BackButton onClick={back} /> : <span />}
            <ThemeToggle />
          </div>

          <h1 style={{ fontFamily: FONT.serif }} className="text-[28px] font-bold leading-tight sm:text-3xl lg:text-[34px]">{title}</h1>
          {subtitle && (
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-2.5 text-sm leading-relaxed sm:text-[15px]">{subtitle}</p>
          )}

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
