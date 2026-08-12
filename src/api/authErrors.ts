/** Maps Firebase Auth error codes to copy a non-technical user can act on.
 * Firebase's raw messages ("Firebase: Error (auth/wrong-password).") are
 * developer-facing — every sign-in/sign-up surface should show this instead. */
const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address doesn\'t look right.',
  'auth/user-disabled': 'This account has been disabled. Contact support for help.',
  'auth/user-not-found': 'No account found with that email. Check the address or sign up.',
  'auth/wrong-password': 'Incorrect password. Try again or reset it below.',
  'auth/invalid-credential': 'Incorrect email or password. Try again or reset your password.',
  'auth/invalid-login-credentials': 'Incorrect email or password. Try again or reset your password.',
  'auth/email-already-in-use': 'An account already exists with that email.',
  'auth/weak-password': 'Choose a stronger password — at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups for this site and try again.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
  'auth/credential-already-in-use': 'That sign-in method is already linked to another account.',
  'auth/requires-recent-login': 'Please sign in again to complete this action.',
  'auth/invalid-verification-code': 'That code isn\'t right. Double-check and try again.',
  'auth/code-expired': 'That code has expired. Request a new one.',
  'auth/invalid-phone-number': 'That phone number doesn\'t look right.',
  'auth/missing-password': 'Enter a password.',
  // Thrown when a sign-in method's provider hasn't been turned on for this
  // Firebase project yet (Authentication → Sign-in method in the console) —
  // distinct from a user-side mistake, so this points at the real cause.
  'auth/operation-not-allowed': 'This sign-in method isn\'t enabled yet for this app. Please try another method or contact support.',
  'auth/unauthorized-domain': 'Sign-in isn\'t available from this address yet. Please contact support.',
  'auth/internal-error': 'Something went wrong on our end. Please try again in a moment.',
}

/** Firebase Auth errors are `FirebaseError` instances with a `code` like
 * "auth/wrong-password" — duck-typed rather than an `instanceof` check
 * against `@firebase/util`'s internal class, which isn't re-exported from
 * the public `firebase/app` entry point. */
export function firebaseErrorCode(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code
    return typeof code === 'string' && code.startsWith('auth/') ? code : null
  }
  return null
}

export function friendlyAuthError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const code = firebaseErrorCode(err)
  if (code && MESSAGES[code]) return MESSAGES[code]
  if (err instanceof Error && err.message && !code) return err.message
  return fallback
}

export function isAccountExistsError(err: unknown): boolean {
  return firebaseErrorCode(err) === 'auth/account-exists-with-different-credential'
}

export function isCredentialInUseError(err: unknown): boolean {
  return firebaseErrorCode(err) === 'auth/credential-already-in-use'
}
