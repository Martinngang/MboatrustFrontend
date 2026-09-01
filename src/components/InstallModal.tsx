import type { ReactNode } from 'react'
import { usePWAInstall } from '../pwaInstall'
import { C, FONT } from './MobileLayout'
import { AppIcon, type IconName } from './icons'

const BENEFITS: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'zap', title: 'Faster access', desc: 'Opens instantly from your home screen — no browser tab to find first.' },
  { icon: 'monitor', title: 'Full-screen experience', desc: 'No address bar or browser clutter — just the app.' },
  { icon: 'wifi', title: 'Works offline', desc: 'Capture milestone evidence in the field with no signal — it syncs automatically once you’re back online.' },
  { icon: 'home', title: 'One tap away', desc: 'Sits right on your home screen, like any other app.' },
]

function StepRow({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{ background: C.forest, color: '#fff', fontFamily: FONT.mono }}
      >
        {n}
      </span>
      <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm leading-snug">{children}</span>
    </div>
  )
}

export function InstallModal() {
  const { modalOpen, closeModal, platform, hasNativePrompt, promptNative } = usePWAInstall()
  if (!modalOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
      style={{ background: 'rgba(15,27,20,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={() => closeModal(true)}
      role="dialog"
      aria-modal="true"
      aria-label="Install Mboa Trust"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-[28px] border sm:rounded-[28px]"
        style={{ background: C.white, borderColor: C.parchmentDark, boxShadow: '0 30px 80px rgba(15,27,20,0.35)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pb-6 pt-8 text-center" style={{ background: `linear-gradient(135deg, ${C.forest} 0%, ${C.forestDark} 100%)` }}>
          <button
            onClick={() => closeModal(true)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.14)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: `1px solid ${C.parchmentDark}` }}>
            <img src="/brand/logo-128.png" alt="Mboa Trust" className="h-12 w-12 object-contain" />
          </div>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="mb-1 text-[10px] uppercase tracking-[0.3em]">Install the app</div>
          <h2 style={{ fontFamily: FONT.serif, color: '#fff' }} className="text-2xl font-bold">Install Mboa Trust</h2>
          <p style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.75)' }} className="mt-2 text-sm leading-relaxed">Get the full app experience — right from your home screen.</p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 px-6 py-5">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <span className="flex-shrink-0" style={{ color: C.forest }}><AppIcon name={b.icon} size={19} /></span>
              <div>
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{b.title}</div>
                <div style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-0.5 text-xs leading-relaxed">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Platform-specific action */}
        <div className="px-6 pb-6">
          {hasNativePrompt ? (
            <>
              <button
                onClick={promptNative}
                className="w-full rounded-full py-3.5 text-sm font-bold transition-all active:scale-95"
                style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
              >
                Install now
              </button>
              <button onClick={() => closeModal(true)} className="mt-2 w-full py-2 text-xs font-semibold" style={{ color: C.inkSubtle, fontFamily: FONT.sans }}>
                Maybe later
              </button>
            </>
          ) : platform === 'ios' ? (
            <div>
              <div className="space-y-3 rounded-2xl p-4" style={{ background: C.parchment }}>
                <StepRow n={1}>
                  Tap the <strong>Share</strong> icon{' '}
                  <svg width="13" height="16" viewBox="0 0 13 16" fill="none" className="inline -translate-y-0.5">
                    <path d="M6.5 1V10.5M3.5 4L6.5 1L9.5 4" stroke={C.forest} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="1" y="6.5" width="11" height="8.5" rx="1.5" stroke={C.forest} strokeWidth="1.3" />
                  </svg>{' '}
                  in Safari's toolbar
                </StepRow>
                <StepRow n={2}>Scroll down and tap <strong>Add to Home Screen</strong></StepRow>
                <StepRow n={3}>Tap <strong>Add</strong> to confirm</StepRow>
              </div>
              <button
                onClick={() => closeModal(true)}
                className="mt-4 w-full rounded-full py-3.5 text-sm font-bold transition-all active:scale-95"
                style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
              >
                Got it
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mb-4 text-center text-xs leading-relaxed">
                Look for <strong style={{ color: C.ink }}>Install app</strong> or <strong style={{ color: C.ink }}>Add to Home Screen</strong> in your browser's menu.
              </p>
              <button
                onClick={() => closeModal(true)}
                className="w-full rounded-full py-3.5 text-sm font-bold transition-all active:scale-95"
                style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
              >
                Got it
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
