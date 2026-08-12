import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Role } from '../context'

export interface BackendUser {
  _id: string
  fullName: string
  email?: string
  phoneNumber?: string
  preferredLanguage?: 'en' | 'fr'
  roles: { roleType: string; profileRef: string | null }[]
  authProviders: { provider: 'google' | 'email' | 'phone'; providerId: string }[]
  kycStatus: string
  avatarUrl: string | null
  /** True once ProfileSetupScreen's final step has run — the one flag that
   * decides whether a signed-in account skips straight to /home or still
   * has onboarding left to do. See resolveAuthDestination below. */
  onboardingCompleted: boolean
}

// The frontend's Role union doesn't include 'verifier'/'admin' — those are
// reachable from any role via the Workspace sidebar switcher (see
// devController.js's DEMO_USERS comment), not a distinct primary identity.
const BACKEND_TO_FRONTEND_ROLE: Record<string, NonNullable<Role> | undefined> = {
  funder: 'funder',
  recipient: 'recipient',
  contractor: 'contractor',
  land_seller: 'seller',
}

export function mapBackendRoles(roles: { roleType: string }[]): NonNullable<Role>[] {
  const mapped = roles.map((r) => BACKEND_TO_FRONTEND_ROLE[r.roleType]).filter((r): r is NonNullable<Role> => Boolean(r))
  return Array.from(new Set(mapped))
}

/** GET /users/me — resolves to `null` on any failure (expired/invalid
 * token, network error, or genuinely not signed in) rather than throwing,
 * since every caller treats "couldn't resolve a session" the same way:
 * fall back to asking the person to sign in. */
export async function fetchBackendUser(): Promise<BackendUser | null> {
  try {
    const { data } = await api.get<{ success: true; data: BackendUser }>('/users/me')
    return data.data
  } catch {
    return null
  }
}

/** Where a signed-in account belongs next, purely from what's saved on the
 * backend — the single source of truth so a returning user is routed
 * straight to /home instead of re-running any part of onboarding:
 *   - no account resolved yet (token invalid/expired)   → 'role'  (start fresh)
 *   - onboardingCompleted flag set                       → 'home'
 *   - a role was already picked but setup wasn't finished → 'profile' (resume, don't re-ask for a role)
 *   - brand new account, no role yet                     → 'role'
 */
export function resolveAuthDestination(user: BackendUser | null): 'home' | 'role' | 'profile' {
  if (!user) return 'role'
  if (user.onboardingCompleted) return 'home'
  return mapBackendRoles(user.roles).length > 0 ? 'profile' : 'role'
}

/** Raw backend roleType strings (unlike `roles`/`mapBackendRoles`, this
 * includes 'verifier'/'admin' — staff tiers no primary Role union slot
 * covers). Used to decide whether to actually show staff-only nav, not
 * just whether the backend would 403 if you tried anyway. Only the 4 dev-
 * bypass demo accounts (see devController.js) carry verifier/admin by
 * default — a real signup never gets those roles automatically. */
/** POST /users/me/avatar — uploads an image file (backend streams it to
 * Cloudinary and saves the resulting URL as User.avatarUrl, see
 * userController.uploadAvatar). Returns the new URL so the caller can push
 * it straight into AppState without waiting on a refetch. */
export function useUploadAvatarMutation() {
  return useMutation({
    mutationFn: async (file: File): Promise<string | null> => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post<{ success: true; data: BackendUser }>('/users/me/avatar', form)
      return data.data.avatarUrl
    },
  })
}

export function useMyRoleTypesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['me', 'roleTypes'],
    queryFn: async (): Promise<string[]> => {
      const { data } = await api.get<{ data: { roles: { roleType: string }[] } }>('/users/me')
      return data.data.roles.map((r) => r.roleType)
    },
    enabled,
    staleTime: 30_000,
  })
}
