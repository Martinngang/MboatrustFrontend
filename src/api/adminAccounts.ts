import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

// Mirrors ADMIN_NAV's section keys (components/shell/adminNav.ts) and the
// backend's ADMIN_PERMISSION_KEYS (validators/adminAccountValidators.js).
export const ADMIN_PERMISSION_KEYS = [
  'overview', 'users', 'projects', 'land', 'contractors', 'community',
  'disputes', 'fraud', 'verifications', 'notifications', 'settings', 'admins',
] as const
export type AdminPermissionKey = (typeof ADMIN_PERMISSION_KEYS)[number]

export interface AdminAccountRow {
  id: string
  fullName: string
  email?: string
  phoneNumber?: string
  /** null = unrestricted (full access) */
  adminPermissions: AdminPermissionKey[] | null
  isActive: boolean
  createdAt: string
}

interface BackendAdminAccount {
  _id: string
  fullName: string
  email?: string
  phoneNumber?: string
  adminPermissions: AdminPermissionKey[] | null
  isActive: boolean
  createdAt: string
}

function mapAdminAccount(a: BackendAdminAccount): AdminAccountRow {
  return { id: a._id, fullName: a.fullName, email: a.email, phoneNumber: a.phoneNumber, adminPermissions: a.adminPermissions ?? null, isActive: a.isActive, createdAt: a.createdAt }
}

export function useAdminAccountsQuery() {
  return useQuery({
    queryKey: ['adminAccounts'],
    queryFn: async (): Promise<AdminAccountRow[]> => {
      const { data } = await api.get<{ data: BackendAdminAccount[] }>('/admin/admins')
      return data.data.map(mapAdminAccount)
    },
    staleTime: 10_000,
  })
}

/** permissions: null clears any restriction (back to unrestricted/full
 * access). Only callable by an unrestricted admin — a restricted admin gets
 * a 403 even targeting their own account (see requireUnrestrictedAdmin). */
export function useSetAdminPermissionsMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: AdminPermissionKey[] | null }) => {
      const { data } = await api.post<{ data: BackendAdminAccount }>(`/admin/admins/${userId}/permissions`, { permissions })
      return mapAdminAccount(data.data as BackendAdminAccount)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminAccounts'] })
      qc.invalidateQueries({ queryKey: ['me', 'adminPermissions'] })
    },
  })
}
