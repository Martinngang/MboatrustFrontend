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

// ── Admin management ─────────────────────────────────────────────────────
export interface AdminTeamMemberRow {
  id: string
  ownerName: string
  memberName: string
  role: TeamRole
  status: 'invited' | 'active'
  createdAt: string
}

interface BackendAdminTeamMember extends Omit<BackendTeamMember, 'ownerId'> {
  ownerId: { fullName: string } | string
}

export function useAdminTeamMembersQuery(filter: { status?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['adminTeamMembers', filter],
    queryFn: async (): Promise<{ members: AdminTeamMemberRow[]; total: number }> => {
      const { data } = await api.get<{ data: BackendAdminTeamMember[]; meta: { total: number } }>('/admin/team-members', {
        params: { ...filter, limit: filter.limit ?? 200 },
      })
      return {
        members: data.data.map((m) => ({
          id: m._id,
          ownerName: typeof m.ownerId === 'object' ? m.ownerId.fullName : 'Unknown',
          memberName: (typeof m.userId === 'object' && m.userId?.fullName) || m.invitedName || m.invitedEmail,
          role: m.role,
          status: m.status,
          createdAt: m.createdAt,
        })),
        total: data.meta.total,
      }
    },
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

/** Shared by the consumer self-service roster screen and the admin
 * Community screen — the backend now accepts either the owning team owner
 * or an admin (see teamMemberController's admin bypass), same route both ways. */
export function useUpdateTeamMemberRoleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'approver' | 'viewer' }) => {
      const { data } = await api.patch<{ data: BackendTeamMember }>(`/team-members/${id}/role`, { role })
      return mapTeamMember(data.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teamMembers'] })
      qc.invalidateQueries({ queryKey: ['adminTeamMembers'] })
    },
  })
}

export function useRemoveTeamMemberMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/team-members/${id}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teamMembers'] })
      qc.invalidateQueries({ queryKey: ['adminTeamMembers'] })
    },
  })
}

/** Best-effort — called once after login, same convention as Onboarding.tsx's
 * pending-referral claim. Links any roster rows that were invited by email
 * before this account existed; failures are swallowed, never surfaced. */
export async function claimTeamMemberships(): Promise<void> {
  await api.post('/team-members/claim').catch(() => {})
}
