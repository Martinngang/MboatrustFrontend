import {
  EmailAuthProvider,
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile as updateFirebaseProfile,
  type AuthCredential,
  type AuthError,
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

export async function signUpWithEmail(email: string, password: string, fullName?: string): Promise<User> {
  const auth = requireAuth()
  const result = await createUserWithEmailAndPassword(auth, email, password)
  if (fullName) {
    // Sets the Firebase profile immediately so the name is available
    // locally right away; the backend still gets it explicitly via
    // PATCH /users/me (see Onboarding.tsx) rather than waiting on the ID
    // token to pick up the new claim on its next refresh.
    await updateFirebaseProfile(result.user, { displayName: fullName })
  }
  return result.user
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = requireAuth()
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

/** Sends a "reset your password" email via Firebase's own hosted flow. */
export async function sendPasswordReset(email: string): Promise<void> {
  const auth = requireAuth()
  await sendPasswordResetEmail(auth, email)
}

/** Normalized list of sign-in methods already linked to the current
 * session's Firebase account (e.g. ['google.com', 'password', 'phone']) —
 * the client-side source of truth for what a "connected accounts" UI
 * should show as already-linked vs. available to link. */
export function getLinkedProviderIds(): string[] {
  const user = firebaseAuthInstance?.currentUser
  return user ? user.providerData.map((p) => p.providerId) : []
}

/** Which sign-in methods exist for an email address, without revealing
 * whether the account itself exists — used to guide a user through the
 * "account already exists with a different credential" recovery flow. */
export async function fetchSignInMethods(email: string): Promise<string[]> {
  const auth = requireAuth()
  return fetchSignInMethodsForEmail(auth, email)
}

/** Adds Google as an additional sign-in method to the currently signed-in
 * account (e.g. a phone-first user adding Google from Settings). Throws
 * `auth/credential-already-in-use` if that Google account is already tied
 * to a different Mboa Trust account. */
export async function linkGoogleToCurrentUser(): Promise<User> {
  const auth = requireAuth()
  if (!auth.currentUser) throw new Error('No signed-in user to link to')
  const result = await linkWithPopup(auth.currentUser, new GoogleAuthProvider())
  return result.user
}

/** Adds email + password as an additional sign-in method to the currently
 * signed-in account. */
export async function linkEmailPasswordToCurrentUser(email: string, password: string): Promise<User> {
  const auth = requireAuth()
  if (!auth.currentUser) throw new Error('No signed-in user to link to')
  const credential = EmailAuthProvider.credential(email, password)
  const result = await linkWithCredential(auth.currentUser, credential)
  return result.user
}

/** Recovers the in-flight Google credential from an
 * `auth/account-exists-with-different-credential` error so it can be
 * linked onto the account once the user proves ownership via their
 * existing method (see `linkPendingCredential`). */
export function credentialFromGoogleError(err: unknown): AuthCredential | null {
  return GoogleAuthProvider.credentialFromError(err as AuthError)
}

/** Finishes the account-linking recovery flow: attaches a previously
 * recovered credential (e.g. the Google credential from a blocked sign-in)
 * onto whichever account the user just proved ownership of. */
export async function linkPendingCredential(user: User, credential: AuthCredential): Promise<User> {
  const result = await linkWithCredential(user, credential)
  return result.user
}

let recaptchaVerifier: RecaptchaVerifier | null = null

/** Tears down the current invisible reCAPTCHA widget, if any. Call this
 * whenever the DOM node it's bound to is about to disappear (switching the
 * Phone/Email tab, navigating from Signup to Login, unmounting the
 * onboarding screen) — otherwise the next sign-in attempt reuses a verifier
 * pointed at a node that's no longer in the document and Firebase throws
 * "reCAPTCHA client element has been removed". */
export function clearRecaptcha(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear()
    } catch {
      // Already torn down (e.g. the container node is already gone) — fine.
    }
    recaptchaVerifier = null
  }
}

/** Phone auth requires an invisible reCAPTCHA bound to a real DOM node.
 * Always rebuilds against the current node rather than caching across
 * calls — Signup and Login use different container ids, and React
 * unmounts/remounts the container whenever the Phone/Email tab switches or
 * the screen changes, so a cached verifier from a previous mount is not
 * safe to reuse. */
export function ensureRecaptcha(containerId: string): RecaptchaVerifier {
  const auth = requireAuth()
  clearRecaptcha()
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' })
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
