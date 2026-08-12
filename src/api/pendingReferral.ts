// A referral link is `#/signup?ref=<referral _id>` (see api/referrals.ts —
// each Referral record is a single-use invite, not a reusable human code).
// The id needs to survive the whole multi-step signup flow (and a page
// reload mid-flow), so it's captured once on arrival and claimed later once
// a real backend account exists to claim it with — see RoleScreen.proceed(),
// the first point a brand-new signup is guaranteed to have a JIT-provisioned
// User to attach the claim to.
const STORAGE_KEY = 'mboatrust-pending-referral'

/** Takes URLSearchParams from the caller's own useSearchParams() rather than
 * reading window.location directly — under HashRouter the real query string
 * lives inside the #-fragment (`#/signup?ref=x`), which only react-router's
 * own parsing (not window.location.search) resolves correctly. */
export function capturePendingReferral(params: URLSearchParams) {
  const ref = params.get('ref')
  if (ref) localStorage.setItem(STORAGE_KEY, ref)
}

export function getPendingReferralId(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function clearPendingReferral() {
  localStorage.removeItem(STORAGE_KEY)
}
