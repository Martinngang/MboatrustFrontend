import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

// ── Platform stats (admin) ──────────────────────────────────────────────
export interface PlatformStats {
  totalUsers: number
  usersByRole: Record<string, number>
  activeProjects: number
  totalEscrowHeld: number
  openDisputes: number
  completedProjectsThisPeriod: number
  since: string
}

export function usePlatformStatsQuery() {
  return useQuery({
    queryKey: ['platformStats'],
    queryFn: async (): Promise<PlatformStats> => {
      const { data } = await api.get<{ data: PlatformStats }>('/admin/platform-stats')
      return data.data
    },
    staleTime: 30_000,
  })
}

// ── System health (admin) ────────────────────────────────────────────────
export interface SystemEvent {
  _id: string
  type: string
  severity: 'info' | 'warning' | 'error'
  source: string
  detail: Record<string, unknown>
  userId: string | null
  createdAt: string
}
export interface SystemHealth {
  db: { connected: boolean }
  config: Record<string, boolean>
  since: string
  countByType: Record<string, number>
  countBySeverity: Record<string, number>
  recentEvents: SystemEvent[]
}

export function useSystemHealthQuery() {
  return useQuery({
    queryKey: ['systemHealth'],
    queryFn: async (): Promise<SystemHealth> => {
      const { data } = await api.get<{ data: SystemHealth }>('/admin/system-health')
      return data.data
    },
    staleTime: 15_000,
  })
}

// ── Admin user management ───────────────────────────────────────────────
export interface AdminUser {
  id: string
  fullName: string
  email?: string
  phoneNumber?: string
  avatarUrl: string | null
  roles: string[]
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
  isActive: boolean
  createdAt: string
}

interface BackendAdminUser {
  _id: string
  fullName: string
  email?: string
  phoneNumber?: string
  avatarUrl: string | null
  roles: { roleType: string }[]
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
  isActive: boolean
  createdAt: string
}

function mapAdminUser(u: BackendAdminUser): AdminUser {
  return {
    id: u._id,
    fullName: u.fullName,
    email: u.email,
    phoneNumber: u.phoneNumber,
    avatarUrl: u.avatarUrl,
    roles: u.roles.map((r) => r.roleType),
    kycStatus: u.kycStatus,
    isActive: u.isActive,
    createdAt: u.createdAt,
  }
}

export function useAdminUsersQuery(filter: { role?: string; kycStatus?: string; isActive?: boolean; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['adminUsers', filter],
    queryFn: async (): Promise<{ users: AdminUser[]; total: number }> => {
      const { data } = await api.get<{ data: BackendAdminUser[]; meta: { total: number } }>('/admin/users', {
        params: { ...filter, isActive: filter.isActive === undefined ? undefined : String(filter.isActive) },
      })
      return { users: data.data.map(mapAdminUser), total: data.meta.total }
    },
    staleTime: 10_000,
  })
}

export function useDeactivateUserMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.patch<{ data: BackendAdminUser }>(`/admin/users/${userId}/deactivate`)
      return mapAdminUser(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  })
}

export function useReactivateUserMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.patch<{ data: BackendAdminUser }>(`/admin/users/${userId}/reactivate`)
      return mapAdminUser(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  })
}

export function useRevokeRoleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, roleType }: { userId: string; roleType: string }) => {
      const { data } = await api.delete<{ data: BackendAdminUser }>(`/admin/users/${userId}/roles/${roleType}`)
      return mapAdminUser(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  })
}
