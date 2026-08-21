import { useQuery } from '@tanstack/react-query'
import { api } from './client'

/** Metadata only — participants, context, message count, last activity.
 * Deliberately never message bodies (see conversationController.
 * adminGetAll's comment) — a confirmed product decision, not an
 * omission. */
export interface AdminConversationRow {
  id: string
  participantNames: string[]
  contextType: string
  messageCount: number
  updatedAt: string
}

interface BackendAdminConversation {
  _id: string
  participantIds: { fullName: string }[]
  contextType: string
  messageCount: number
  updatedAt: string
}

export function useAdminConversationsQuery(filter: { contextType?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['adminConversations', filter],
    queryFn: async (): Promise<{ conversations: AdminConversationRow[]; total: number }> => {
      const { data } = await api.get<{ data: BackendAdminConversation[]; meta: { total: number } }>('/admin/conversations', {
        params: { ...filter, limit: filter.limit ?? 200 },
      })
      return {
        conversations: data.data.map((c) => ({
          id: c._id,
          participantNames: c.participantIds.map((p) => p.fullName),
          contextType: c.contextType,
          messageCount: c.messageCount,
          updatedAt: c.updatedAt,
        })),
        total: data.meta.total,
      }
    },
    staleTime: 10_000,
  })
}
