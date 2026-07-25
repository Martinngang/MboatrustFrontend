import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallPlatform = 'ios' | 'android' | 'desktop'

const DISMISS_COUNT_KEY = 'mboatrust-install-dismiss-count'
const LAST_DISMISS_KEY = 'mboatrust-install-last-dismiss'
const INSTALLED_KEY = 'mboatrust-install-installed'

const AUTO_SHOW_DELAY_MS = 4000
const MAX_AUTO_PROMPTS = 3
const COOLDOWN_DAYS = [3, 7, 14] // backoff after the 1st, 2nd, 3rd dismissal

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as { standalone?: boolean }).standalone === true
}

function detectPlatform(): InstallPlatform {
  const ua = window.navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'desktop'
}

function daysSince(timestampMs: number) {
  return (Date.now() - timestampMs) / (1000 * 60 * 60 * 24)
}

interface PWAInstallContextValue {
  /** Eligible for install at all — either a native prompt is available, or (iOS) manual instructions apply. */
  isInstallable: boolean
  isInstalled: boolean
  /** True only when the browser actually captured beforeinstallprompt (Chrome/Edge/Android). */
  hasNativePrompt: boolean
  platform: InstallPlatform
  modalOpen: boolean
  openModal: () => void
  closeModal: (dismissedByUser?: boolean) => void
  promptNative: () => Promise<void>
  /** Header/nav button entry point: native prompt where available, the branded modal otherwise. */
  requestInstall: () => void
}

const PWAInstallContext = createContext<PWAInstallContextValue>({} as PWAInstallContextValue)

export function PWAInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => isStandalone() || localStorage.getItem(INSTALLED_KEY) === '1')
  const [modalOpen, setModalOpen] = useState(false)
  const [platform] = useState(detectPlatform)

  useEffect(() => {
    if (installed) return
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, '1')
      setInstalled(true)
      setDeferredPrompt(null)
      setModalOpen(false)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [installed])

  // iOS never fires beforeinstallprompt, so it's always "installable" via manual instructions
  // until actually added to the home screen (standalone), which `installed` already tracks.
  const isInstallable = !installed && (deferredPrompt !== null || platform === 'ios')

  const recordDismissal = () => {
    const count = Number(localStorage.getItem(DISMISS_COUNT_KEY) ?? '0') + 1
    localStorage.setItem(DISMISS_COUNT_KEY, String(count))
    localStorage.setItem(LAST_DISMISS_KEY, String(Date.now()))
  }

  // Smart auto-show: a short contextual delay, capped at MAX_AUTO_PROMPTS lifetime
  // auto-appearances, backing off further after each dismissal. The header/nav
  // button stays available indefinitely regardless — this only governs the
  // unprompted popup.
  useEffect(() => {
    if (!isInstallable) return
    const dismissCount = Number(localStorage.getItem(DISMISS_COUNT_KEY) ?? '0')
    if (dismissCount >= MAX_AUTO_PROMPTS) return
    const lastDismiss = Number(localStorage.getItem(LAST_DISMISS_KEY) ?? '0')
    const cooldownDays = COOLDOWN_DAYS[Math.min(dismissCount, COOLDOWN_DAYS.length) - 1] ?? COOLDOWN_DAYS[COOLDOWN_DAYS.length - 1]
    if (lastDismiss > 0 && daysSince(lastDismiss) < cooldownDays) return

    const timer = setTimeout(() => setModalOpen(true), AUTO_SHOW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isInstallable])

  const closeModal = useCallback((dismissedByUser = false) => {
    setModalOpen(false)
    if (dismissedByUser) recordDismissal()
  }, [])

  const promptNative = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setModalOpen(false)
    if (outcome === 'accepted') localStorage.setItem(INSTALLED_KEY, '1')
    else recordDismissal()
  }, [deferredPrompt])

  const requestInstall = useCallback(() => {
    if (deferredPrompt) promptNative()
    else setModalOpen(true)
  }, [deferredPrompt, promptNative])

  return (
    <PWAInstallContext.Provider
      value={{
        isInstallable,
        isInstalled: installed,
        hasNativePrompt: deferredPrompt !== null,
        platform,
        modalOpen,
        openModal: () => setModalOpen(true),
        closeModal,
        promptNative,
        requestInstall,
      }}
    >
      {children}
    </PWAInstallContext.Provider>
  )
}

export const usePWAInstall = () => useContext(PWAInstallContext)
