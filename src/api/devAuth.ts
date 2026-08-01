import { api, setDevUserId } from './client'
import { firebaseConfigured } from '../firebase'
import { getCurrentFirebaseUser } from './firebaseAuth'

const STORAGE_PREFIX = 'mboatrust-dev-user:'

/**
 * Find-or-create the fixed demo backend user for a role (see
 * devController.js) and remember its real Mongo _id in localStorage so we
 * don't re-request it every reload. Call this once the mock onboarding
 * flow has picked a role, before any pillar screen tries to hit the API.
 */
export async function resolveDevUserId(role: string): Promise<string> {
  const cached = localStorage.getItem(STORAGE_PREFIX + role)
  if (cached) {
    setDevUserId(cached)
    return cached
  }
  const { data } = await api.get<{ success: true; data: { userId: string } }>('/dev/demo-user', { params: { role } })
  const userId = data.data.userId
  localStorage.setItem(STORAGE_PREFIX + role, userId)
  setDevUserId(userId)
  return userId
}

export function clearDevUserId() {
  setDevUserId(null)
}

/**
 * Single entry point context.tsx calls after login. When a real Firebase
 * user is signed in, the axios interceptor already attaches their ID token
 * as a Bearer header — this just asks the backend who that resolves to
 * (JIT-provisioning a User on first call, per middleware/auth.js) and
 * returns their real Mongo _id. Otherwise falls back to the dev-bypass
 * demo user for `role`, unchanged from before real auth existed.
 */
export async function resolveCurrentUserId(role: string): Promise<string> {
  if (firebaseConfigured && getCurrentFirebaseUser()) {
    const { data } = await api.get<{ success: true; data: { _id: string } }>('/users/me')
    return data.data._id
  }
  return resolveDevUserId(role)
}
