import type { ConfirmationResult } from 'firebase/auth'

// A Firebase ConfirmationResult can't be serialized into router state or
// localStorage — this survives the Signup/Login → OTP navigation only
// because HashRouter navigation doesn't reload the page. Cleared once used.
let pending: ConfirmationResult | null = null

export function setPendingPhoneConfirmation(c: ConfirmationResult | null) {
  pending = c
}
export function getPendingPhoneConfirmation(): ConfirmationResult | null {
  return pending
}
