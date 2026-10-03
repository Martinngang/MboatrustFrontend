// A verifier-invite link is `#/verifier-invite/<rawToken>` (see
// verifierInvitationController.js — the raw token only ever lives in the
// URL/email, never persisted server-side). Mirrors pendingReferral.ts's
// exact capture-through-signup pattern: the token needs to survive the
// whole multi-step signup flow (and a page reload mid-flow), so it's
// captured once on arrival and claimed later once a real backend account
// exists to accept it with — see RoleScreen.proceed().
const STORAGE_KEY = 'mboatrust-pending-verifier-invite'

export function setPendingVerifierInvite(token: string) {
  localStorage.setItem(STORAGE_KEY, token)
}

/** Takes URLSearchParams from the caller's own useSearchParams() rather than
 * reading window.location directly — under HashRouter the real query string
 * lives inside the #-fragment (`#/signup?verifierInvite=x`), which only
 * react-router's own parsing (not window.location.search) resolves
 * correctly. Same convention as capturePendingReferral. */
export function captureVerifierInviteFromSearchParams(params: URLSearchParams) {
  const token = params.get('verifierInvite')
  if (token) setPendingVerifierInvite(token)
}

export function getPendingVerifierInvite(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function clearPendingVerifierInvite() {
  localStorage.removeItem(STORAGE_KEY)
}
