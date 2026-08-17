import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getMessaging, isSupported as isMessagingSupported, type Messaging } from 'firebase/messaging'

const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId,
  // Firebase Messaging needs this to register with the right sender — it's
  // just the project number, which is already embedded in appId
  // ("1:<projectNumber>:web:...") rather than a separate value to configure.
  messagingSenderId: appId?.split(':')[1],
}

/** True once a real Firebase project's web config is present. Firebase
 * client config (unlike the backend's service account) is meant to be
 * public — safe to ship in a frontend bundle — but until a real project
 * exists, every onboarding screen falls back to the dev-bypass flow this
 * app has used since Phase 2, exactly like paymentService.js falls back to
 * mocks when MoMo/Orange credentials are absent. */
export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)

/** Separate from `firebaseConfigured` — a VAPID key is only needed for push
 * (requesting an FCM token), not for auth, so the app runs fine without one
 * and this alone gates whether push-notification UI should even try. */
export const pushConfigured = Boolean(firebaseConfigured && import.meta.env.VITE_FIREBASE_VAPID_KEY)

let app: FirebaseApp | null = null
let auth: Auth | null = null
if (firebaseConfigured) {
  app = initializeApp(config)
  auth = getAuth(app)
}

/** Lazily resolved — `getMessaging()` throws in browsers/contexts without
 * push support (Safari without the right setup, non-secure origins, no
 * service worker), so every caller goes through `isMessagingSupported()`
 * first rather than eagerly initializing at module load like `auth` does. */
let messagingInstance: Messaging | null = null
let messagingChecked = false
export async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (!pushConfigured || !app) return null
  if (messagingChecked) return messagingInstance
  messagingChecked = true
  if (await isMessagingSupported().catch(() => false)) {
    messagingInstance = getMessaging(app)
  }
  return messagingInstance
}

export { app as firebaseApp, auth as firebaseAuthInstance }
