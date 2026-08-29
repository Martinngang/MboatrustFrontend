import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export const ADMIN_NOTIFICATION_TARGET_ROLES = ['funder', 'recipient', 'contractor', 'land_seller', 'verifier', 'admin', 'quincaillerie'] as const
export type AdminNotificationTargetRole = (typeof ADMIN_NOTIFICATION_TARGET_ROLES)[number]

export interface AdminNotificationHistoryRow {
  broadcastId: string
  type: string
  message: string
  createdAt: string
  recipientCount: number
  readCount: number
  sentByName: string
}

interface BackendAdminNotificationHistoryRow {
  broadcastId: string
  type: string
  payload: { message?: string } & Record<string, unknown>
  createdAt: string
  recipientCount: number
  readCount: number
  sentByName: string
}

export function useAdminNotificationsHistoryQuery(filter: { limit?: number } = {}) {
  return useQuery({
    queryKey: ['adminNotificationsHistory', filter],
    queryFn: async (): Promise<{ items: AdminNotificationHistoryRow[]; total: number }> => {
      const { data } = await api.get<{ data: BackendAdminNotificationHistoryRow[]; meta: { total: number } }>('/admin/notifications', {
        params: { ...filter, limit: filter.limit ?? 50 },
      })
      return {
        items: data.data.map((r) => ({
          broadcastId: r.broadcastId,
          type: r.type,
          message: r.payload?.message || '',
          createdAt: r.createdAt,
          recipientCount: r.recipientCount,
          readCount: r.readCount,
          sentByName: r.sentByName,
        })),
        total: data.meta.total,
      }
    },
    staleTime: 10_000,
  })
}

export interface BroadcastNotificationInput {
  targetRole?: AdminNotificationTargetRole
  type: string
  message: string
}

export function useBroadcastNotificationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: BroadcastNotificationInput) => {
      const { data } = await api.post<{ data: { broadcastId: string; recipientCount: number } }>('/admin/notifications/broadcast', input)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminNotificationsHistory'] }),
  })
}
