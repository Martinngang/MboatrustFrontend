import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { getSocket } from './socket'
import type { ChatMessage, Conversation } from '../messaging'

interface BackendParticipant { _id: string; fullName: string }
interface BackendConversation {
  _id: string
  contextType: 'project' | 'bid' | 'land_listing'
  contextId: string
  participantIds: BackendParticipant[]
  updatedAt: string
}
interface BackendMessage {
  _id: string
  conversationId: string
  senderId: BackendParticipant | string
  body: string
  attachmentUrl: string | null
  sentAt: string
}

const CONTEXT_LABEL: Record<BackendConversation['contextType'], string> = {
  project: 'Project',
  bid: 'Tender',
  land_listing: 'Land listing',
}

function mapConversation(doc: BackendConversation, selfId: string): Conversation {
  const other = doc.participantIds.find((p) => p._id !== selfId)
  return {
    id: doc._id,
    withName: other?.fullName ?? 'Unknown',
    // Not derivable from the backend (no role join on participants) and
    // never actually rendered in the UI — a fixed value is harmless.
    withRole: 'funder',
    context: CONTEXT_LABEL[doc.contextType],
    avatarInitial: (other?.fullName ?? '?')[0].toUpperCase(),
  }
}

function mapMessage(doc: BackendMessage, selfId: string): ChatMessage {
  return {
    id: doc._id,
    conversationId: doc.conversationId,
    from: (typeof doc.senderId === 'object' ? doc.senderId._id : doc.senderId) === selfId ? 'me' : 'them',
    text: doc.body,
    photoUrl: doc.attachmentUrl || undefined,
    timestamp: new Date(doc.sentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    // The backend doesn't track per-message read receipts — always "read"
    // rather than fabricating a signal that doesn't exist.
    read: true,
  }
}

export function useConversationsQuery(selfId: string | null) {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async (): Promise<Conversation[]> => {
      const { data } = await api.get<{ data: BackendConversation[] }>('/conversations')
      return data.data.map((c) => mapConversation(c, selfId!))
    },
    enabled: Boolean(selfId),
    staleTime: 10_000,
  })
}

export function useConversationMessagesQuery(conversationId: string | undefined, selfId: string | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data } = await api.get<{ data: BackendMessage[] }>(`/conversations/${conversationId}/messages`)
      return data.data.map((m) => mapMessage(m, selfId!))
    },
    enabled: Boolean(conversationId && selfId),
    staleTime: 5_000,
  })
}

/** Joins the conversation's Socket.io room while mounted and merges
 * incoming `message:new` events straight into the query cache, so a
 * message sent by the other party appears without polling. */
export function useConversationRealtime(conversationId: string | undefined, selfId: string | null) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!conversationId || !selfId) return
    const socket = getSocket()
    socket.emit('conversation:join', conversationId)

    const onNew = (raw: BackendMessage) => {
      if (raw.conversationId !== conversationId) return
      const mapped = mapMessage(raw, selfId)
      qc.setQueryData<ChatMessage[]>(['messages', conversationId], (prev) => {
        if (prev?.some((m) => m.id === mapped.id)) return prev
        return [...(prev ?? []), mapped]
      })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    }
    socket.on('message:new', onNew)

    return () => {
      socket.emit('conversation:leave', conversationId)
      socket.off('message:new', onNew)
    }
  }, [conversationId, selfId, qc])
}

export function useSendMessageMutation(selfId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, body, attachmentUrl }: { conversationId: string; body: string; attachmentUrl?: string }) => {
      const { data } = await api.post<{ data: BackendMessage }>(`/conversations/${conversationId}/messages`, { body, attachmentUrl })
      return mapMessage(data.data, selfId!)
    },
    onSuccess: (msg) => {
      qc.setQueryData<ChatMessage[]>(['messages', msg.conversationId], (prev) => (prev?.some((m) => m.id === msg.id) ? prev : [...(prev ?? []), msg]))
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

/** Find-or-create a conversation for a given context (a tender, a land
 * listing, ...) with the other real participant — the entry point every
 * "Message seller" / "Message contractor" button calls. */
export function useStartConversationMutation(selfId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ contextType, contextId, otherUserId }: { contextType: 'project' | 'bid' | 'land_listing'; contextId: string; otherUserId: string }) => {
      const { data } = await api.post<{ data: BackendConversation }>('/conversations', {
        contextType,
        contextId,
        participantIds: [otherUserId],
      })
      return mapConversation(data.data, selfId!)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  })
}
