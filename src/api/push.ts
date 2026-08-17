import { useMutation } from '@tanstack/react-query'
import { getToken } from 'firebase/messaging'
import { api } from './client'
import { getMessagingIfSupported, pushConfigured } from '../firebase'

export function useSetDeviceTokenMutation() {
  return useMutation({
    mutationFn: async (fcmDeviceToken: string | null) => {
      const { data } = await api.post<{ success: true }>('/users/me/device-token', { fcmDeviceToken })
      return data
    },
  })
}

/** True in any browser/context where requesting push could plausibly work —
 * lets the Settings screen skip showing a toggle that would just fail
 * everywhere it's tapped (Safari without setup, non-secure origins, no
 * VAPID key configured). */
export function isPushAvailable(): boolean {
  return pushConfigured && typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Requests OS/browser notification permission (if not already decided) and,
 * once granted, fetches a real FCM registration token for this device via
 * the same service worker the PWA already registers (src/sw.ts) — no
 * separate firebase-messaging-sw.js needed, `getToken` just needs a
 * ServiceWorkerRegistration to attach the push subscription to.
 *
 * Returns null (never throws) on any failure — denied permission, no SW
 * ready yet, provider error — so callers can show a plain "couldn't enable
 * push" message rather than an unhandled rejection.
 */
export async function requestPushToken(): Promise<string | null> {
  if (!isPushAvailable()) return null
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const messaging = await getMessagingIfSupported()
    if (!messaging) return null

    const registration = await navigator.serviceWorker.ready
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY as string,
      serviceWorkerRegistration: registration,
    })
    return token || null
  } catch (err) {
    console.warn('[push] failed to get FCM token', err)
    return null
  }
}
