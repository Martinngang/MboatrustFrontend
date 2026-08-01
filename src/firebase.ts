import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

/** True once a real Firebase project's web config is present. Firebase
 * client config (unlike the backend's service account) is meant to be
 * public — safe to ship in a frontend bundle — but until a real project
 * exists, every onboarding screen falls back to the dev-bypass flow this
 * app has used since Phase 2, exactly like paymentService.js falls back to
 * mocks when MoMo/Orange credentials are absent. */
export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)

let app: FirebaseApp | null = null
let auth: Auth | null = null
if (firebaseConfigured) {
  app = initializeApp(config)
  auth = getAuth(app)
}

export { app as firebaseApp, auth as firebaseAuthInstance }
