import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  type ConfirmationResult,
  type User,
} from 'firebase/auth'
import { firebaseAuthInstance, firebaseConfigured } from '../firebase'

function requireAuth() {
  if (!firebaseAuthInstance) throw new Error('Firebase is not configured — set VITE_FIREBASE_* env vars first')
  return firebaseAuthInstance
}

export function onFirebaseAuthChange(callback: (user: User | null) => void): () => void {
  if (!firebaseConfigured || !firebaseAuthInstance) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(firebaseAuthInstance, callback)
}

export async function signInWithGoogle(): Promise<User> {
  const auth = requireAuth()
  const result = await signInWithPopup(auth, new GoogleAuthProvider())
  return result.user
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const auth = requireAuth()
  const result = await createUserWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = requireAuth()
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

let recaptchaVerifier: RecaptchaVerifier | null = null

/** Phone auth requires an invisible reCAPTCHA bound to a real DOM node —
 * call this once the container element exists (right before requesting the
 * code), not at module load. */
export function ensureRecaptcha(containerId: string): RecaptchaVerifier {
  const auth = requireAuth()
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' })
  }
  return recaptchaVerifier
}

/** Kicks off real phone sign-in — Firebase texts a code to `phoneNumber`
 * (E.164 format, e.g. "+237677234891"). Requires a real Firebase project
 * with Phone sign-in enabled and (for real, non-test numbers) SMS quota;
 * the console's "test phone numbers" feature also works here for demoing
 * without incurring real SMS. */
export async function startPhoneSignIn(phoneNumber: string, recaptchaContainerId: string): Promise<ConfirmationResult> {
  const auth = requireAuth()
  const verifier = ensureRecaptcha(recaptchaContainerId)
  return signInWithPhoneNumber(auth, phoneNumber, verifier)
}

export async function confirmPhoneCode(confirmation: ConfirmationResult, code: string): Promise<User> {
  const result = await confirmation.confirm(code)
  return result.user
}

export async function firebaseSignOut(): Promise<void> {
  if (!firebaseAuthInstance) return
  await signOut(firebaseAuthInstance)
}

export function getCurrentFirebaseUser(): User | null {
  return firebaseAuthInstance?.currentUser ?? null
}

export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  const user = firebaseAuthInstance?.currentUser
  if (!user) return null
  return user.getIdToken(forceRefresh)
}
