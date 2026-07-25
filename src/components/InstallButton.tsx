import { usePWAInstall } from '../pwaInstall'
import { C, FONT } from './MobileLayout'

/**
 * Prominent install CTA for header/nav placement. Triggers the captured
 * beforeinstallprompt directly when the browser supports it; otherwise opens
 * the branded modal with platform-specific instructions (iOS, or a generic
 * browser-menu fallback). Renders nothing once installed or ineligible.
 */
export function InstallButton({ dark }: { dark?: boolean }) {
  const { isInstallable, requestInstall } = usePWAInstall()
  if (!isInstallable) return null

  return (
    <button
      onClick={requestInstall}
      aria-label="Install Mboa Trust App"
      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all active:scale-95 sm:px-4 sm:text-sm"
      style={{ background: C.amber, color: C.forestDark, fontFamily: FONT.sans, boxShadow: dark ? 'none' : '0 6px 16px rgba(232,160,32,0.35)' }}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
        <path d="M8 1.5V10.5M4.5 7L8 10.5L11.5 7" stroke={C.forestDark} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 12.5V13.5C2 14.05 2.45 14.5 3 14.5H13C13.55 14.5 14 14.05 14 13.5V12.5" stroke={C.forestDark} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="hidden sm:inline">Install Mboa Trust App</span>
      <span className="sm:hidden">Install App</span>
    </button>
  )
}
