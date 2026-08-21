import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

// ── Platform stats (admin) ──────────────────────────────────────────────
export interface DailyPoint { date: string; value: number }
export interface PlatformStats {
  totalUsers: number
  usersByRole: Record<string, number>
  activeProjects: number
  totalEscrowHeld: number
  openDisputes: number
  completedProjectsThisPeriod: number
  since: string
  trends: { newUsersByDay: DailyPoint[]; escrowVolumeByDay: DailyPoint[] }
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

export function useAdminUsersQuery(filter: { role?: string; kycStatus?: string; isActive?: boolean; page?: number; limit?: number; search?: string } = {}) {
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminUsers'] })
      qc.invalidateQueries({ queryKey: ['adminAccounts'] })
    },
  })
}

export function useGrantRoleMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, roleType }: { userId: string; roleType: string }) => {
      const { data } = await api.post<{ data: BackendAdminUser }>(`/admin/users/${userId}/roles`, { roleType })
      return mapAdminUser(data.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminUsers'] })
      qc.invalidateQueries({ queryKey: ['adminAccounts'] })
    },
  })
}

export interface CreateAdminUserInput {
  fullName: string
  email?: string
  phoneNumber?: string
  roles?: string[]
}

/** No firebaseUid yet — the real person's own first Firebase sign-in links
 * to this record by email (see middleware/auth.js's resolveUser), rather
 * than a second duplicate account being created for them. */
export function useCreateAdminUserMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateAdminUserInput) => {
      const { data } = await api.post<{ data: BackendAdminUser }>('/admin/users', input)
      return mapAdminUser(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  })
}

export interface UpdateAdminUserInput {
  fullName?: string
  email?: string
  phoneNumber?: string
  kycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected'
  kycLevel?: 'basic' | 'enhanced'
  preferredLanguage?: 'en' | 'fr'
  residenceCountry?: string
  residenceCity?: string
}

export function useUpdateAdminUserMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, input }: { userId: string; input: UpdateAdminUserInput }) => {
      const { data } = await api.patch<{ data: BackendAdminUser }>(`/admin/users/${userId}`, input)
      return mapAdminUser(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  })
}

/** True hard delete — irreversible. Requires the literal {confirm:'DELETE'}
 * body, same gate as the self-service delete-my-account flow. */
export function useDeleteAdminUserMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/admin/users/${userId}`, { data: { confirm: 'DELETE' } })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  })
}

/** TEMPORARY — sets a user's Firebase Auth password directly via the
 * backend's Firebase Admin SDK call. Only works for a user with a real
 * linked Firebase account. To be removed later per the user's request. */
export function useAdminChangePasswordMutation() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      await api.post(`/admin/users/${userId}/password`, { newPassword })
    },
  })
}

// ── Admin action log (audit trail) ──────────────────────────────────────
export interface AdminActionLogEntry {
  id: string
  adminName: string
  action: string
  targetType: string
  targetId: string
  detail: Record<string, unknown>
  createdAt: string
}

interface BackendAdminActionLog {
  _id: string
  adminId: { fullName: string } | string | null
  action: string
  targetType: string
  targetId: string
  detail: Record<string, unknown>
  createdAt: string
}

export function useAdminActivityQuery(filter: { limit?: number; action?: string; targetType?: string } = {}) {
  return useQuery({
    queryKey: ['adminActivity', filter],
    queryFn: async (): Promise<AdminActionLogEntry[]> => {
      const { data } = await api.get<{ data: BackendAdminActionLog[] }>('/admin/activity', { params: filter })
      return data.data.map((e) => ({
        id: e._id,
        adminName: typeof e.adminId === 'object' && e.adminId ? e.adminId.fullName : 'Unknown admin',
        action: e.action,
        targetType: e.targetType,
        targetId: e.targetId,
        detail: e.detail,
        createdAt: e.createdAt,
      }))
    },
    staleTime: 10_000,
  })
}
