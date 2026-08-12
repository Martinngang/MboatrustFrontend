import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export interface UserSearchResult {
  id: string
  fullName: string
  email?: string
  phoneNumber?: string
  avatarUrl: string | null
  roles: string[]
}

interface BackendUser {
  _id: string
  fullName: string
  email?: string
  phoneNumber?: string
  avatarUrl: string | null
  roles: { roleType: string }[]
}

/** Finds a real, already-registered account by name/phone/email (GET
 * /users/search) — used anywhere the UI needs to add an *existing* person
 * to something (a project co-signer, say), since the backend has no concept
 * of adding someone who hasn't signed up yet. */
export function useUserSearchQuery(q: string) {
  return useQuery({
    queryKey: ['userSearch', q],
    queryFn: async (): Promise<UserSearchResult[]> => {
      const { data } = await api.get<{ data: BackendUser[] }>('/users/search', { params: { q } })
      return data.data.map((u) => ({
        id: u._id,
        fullName: u.fullName,
        email: u.email,
        phoneNumber: u.phoneNumber,
        avatarUrl: u.avatarUrl,
        roles: u.roles.map((r) => r.roleType),
      }))
    },
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  })
}
