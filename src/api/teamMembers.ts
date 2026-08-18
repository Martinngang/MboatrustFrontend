import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export type TeamRole = 'owner' | 'approver' | 'viewer'

export interface TeamMemberRecord {
  id: string
  name: string
  email: string
  role: TeamRole
  status: 'invited' | 'active'
  initials: string
}

interface BackendTeamMember {
  _id: string
  ownerId: string
  userId: { _id: string; fullName: string; avatarUrl?: string } | string | null
  invitedEmail: string
  invitedName: string
  role: TeamRole
  status: 'invited' | 'active'
  createdAt: string
}

function mapTeamMember(doc: BackendTeamMember): TeamMemberRecord {
  const name = (typeof doc.userId === 'object' && doc.userId?.fullName) || doc.invitedName || doc.invitedEmail
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  return { id: doc._id, name, email: doc.invitedEmail, role: doc.role, status: doc.status, initials }
}

export function useTeamMembersQuery(enabled = true) {
  return useQuery({
    queryKey: ['teamMembers'],
    queryFn: async (): Promise<TeamMemberRecord[]> => {
      const { data } = await api.get<{ data: BackendTeamMember[] }>('/team-members/mine')
      return data.data.map(mapTeamMember)
    },
    enabled,
    staleTime: 10_000,
  })
}

export function useInviteTeamMemberMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, name, role }: { email: string; name?: string; role: 'approver' | 'viewer' }) => {
      const { data } = await api.post<{ data: BackendTeamMember }>('/team-members', { email, name, role })
      return mapTeamMember(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teamMembers'] }),
  })
}

export function useUpdateTeamMemberRoleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'approver' | 'viewer' }) => {
      const { data } = await api.patch<{ data: BackendTeamMember }>(`/team-members/${id}/role`, { role })
      return mapTeamMember(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teamMembers'] }),
  })
}

export function useRemoveTeamMemberMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/team-members/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teamMembers'] }),
  })
}

/** Best-effort — called once after login, same convention as Onboarding.tsx's
 * pending-referral claim. Links any roster rows that were invited by email
 * before this account existed; failures are swallowed, never surfaced. */
export async function claimTeamMemberships(): Promise<void> {
  await api.post('/team-members/claim').catch(() => {})
}
