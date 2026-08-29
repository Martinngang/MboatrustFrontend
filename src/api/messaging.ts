import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { getSocket } from './socket'

export interface BackendParticipant {
  _id: string
  fullName: string
  avatarUrl: string | null
}

export interface BackendConversation {
  _id: string | null
  contextType: 'project' | 'bid' | 'land_listing' | 'direct' | 'group'
  contextId?: string
  title: string | null
  avatarUrl: string | null
  participantIds: BackendParticipant[]
  updatedAt: string
  unreadCount?: number
  lastMessage?: BackendMessage
}

export interface BackendPublicProfile {
  _id: string
  fullName: string
  avatarUrl: string | null
}

export interface BackendAttachment {
  url: string
  type: string
  mimeType: string
  fileName?: string
  sizeBytes?: number
  durationSeconds?: number
}

export interface BackendReaction {
  userId: string
  emoji: string
}

export interface BackendMessage {
  _id: string
  conversationId: string
  senderId: BackendParticipant | string
  type: 'text' | 'image' | 'video' | 'audio' | 'file'
  body: string
  attachments: BackendAttachment[]
  replyToId: string | null
  reactions: BackendReaction[]
  editedAt: string | null
  deletedAt: string | null
  sentAt: string
}

const CONTEXT_LABEL: Record<string, string> = {
  project: 'Project',
  bid: 'Tender',
  land_listing: 'Land listing',
  direct: 'Direct',
  group: 'Group',
}

export interface Conversation {
  id: string
  // True when this conversation has never been persisted (no message sent
  // yet) — the backend returned a draft placeholder rather than a real row.
  draft: boolean
  withName: string
  withRole: string
  context: string
  avatarInitial: string
  avatarUrl?: string
  unreadCount: number
  lastMessage?: BackendMessage
  isGroup: boolean
  updatedAt: string
  participantIds: BackendParticipant[]
}

export interface ChatMessage {
  id: string
  conversationId: string
  from: 'me' | 'them'
  senderName?: string
  senderAvatar?: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file'
  text: string
  attachments: BackendAttachment[]
  timestamp: string
  rawSentAt: string
  read: boolean
  reactions: BackendReaction[]
  replyToId: string | null
  isEdited: boolean
  isDeleted: boolean
}

function mapConversation(doc: BackendConversation, selfId: string): Conversation {
  const isGroup = doc.contextType === 'group'
  const other = doc.participantIds?.find((p) => String(p._id || p) !== String(selfId))
  const name = isGroup
    ? (doc.title || 'Group Chat')
    : (other?.fullName && other.fullName.trim() ? other.fullName.trim() : 'MboaTrust User')

  const avatarUrl = isGroup
    ? (doc.avatarUrl || undefined)
    : (other?.avatarUrl || undefined)

  return {
    id: doc._id || '',
    draft: !doc._id,
    withName: name,
    withRole: 'user',
    context: CONTEXT_LABEL[doc.contextType] || doc.contextType,
    avatarInitial: (name[0] || '?').toUpperCase(),
    avatarUrl,
    unreadCount: doc.unreadCount || 0,
    lastMessage: doc.lastMessage,
    isGroup,
    updatedAt: doc.updatedAt,
    participantIds: doc.participantIds || []
  }
}

function mapMessage(doc: BackendMessage, selfId: string): ChatMessage {
  const senderObj = typeof doc.senderId === 'object' ? doc.senderId : null
  const isMe = senderObj ? String(senderObj._id) === String(selfId) : String(doc.senderId) === String(selfId)
  return {
    id: doc._id,
    conversationId: doc.conversationId,
    from: isMe ? 'me' : 'them',
    senderName: senderObj?.fullName,
    senderAvatar: senderObj?.avatarUrl || undefined,
    type: doc.type,
    text: doc.body,
    attachments: doc.attachments || [],
    timestamp: new Date(doc.sentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    rawSentAt: doc.sentAt,
    read: true,
    reactions: doc.reactions || [],
    replyToId: doc.replyToId,
    isEdited: !!doc.editedAt,
    isDeleted: !!doc.deletedAt,
  }
}

export function useConversationsQuery(selfId: string | null) {
  return useQuery({
    queryKey: ['conversations', selfId],
    queryFn: async (): Promise<Conversation[]> => {
      const { data } = await api.get<{ data: BackendConversation[] }>('/conversations')
      return data.data.map((c) => mapConversation(c, selfId!))
    },
    enabled: Boolean(selfId),
    staleTime: 10_000,
  })
}

export function useSingleConversationQuery(conversationId: string | undefined, selfId: string | null) {
  return useQuery({
    queryKey: ['conversation', conversationId, selfId],
    queryFn: async (): Promise<Conversation> => {
      const { data } = await api.get<{ data: BackendConversation }>(`/conversations/${conversationId}`)
      return mapConversation(data.data, selfId!)
    },
    enabled: Boolean(conversationId && selfId),
    staleTime: 10_000,
  })
}

export function useConversationMessagesQuery(conversationId: string | undefined, selfId: string | null) {
  return useQuery({
    queryKey: ['messages', conversationId, selfId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data } = await api.get<{ data: BackendMessage[] }>(`/conversations/${conversationId}/messages`)
      return data.data.map((m) => mapMessage(m, selfId!))
    },
    enabled: Boolean(conversationId && selfId),
    staleTime: 5_000,
  })
}

export function useConversationRealtime(conversationId: string | undefined, selfId: string | null) {
  const qc = useQueryClient()
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  useEffect(() => {
    if (!conversationId || !selfId) return
    const socket = getSocket()
    socket.emit('conversation:join', conversationId)

    const onNew = (raw: BackendMessage) => {
      if (raw.conversationId !== conversationId) return
      const mapped = mapMessage(raw, selfId)
      qc.setQueryData<ChatMessage[]>(['messages', conversationId, selfId], (prev) => {
        if (prev?.some((m) => m.id === mapped.id)) return prev
        return [...(prev ?? []), mapped]
      })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    }

    const onEdited = (raw: BackendMessage) => {
      if (raw.conversationId !== conversationId) return
      qc.setQueryData<ChatMessage[]>(['messages', conversationId, selfId], (prev) => {
        return prev?.map(m => m.id === raw._id ? mapMessage(raw, selfId) : m)
      })
    }

    const onDeleted = ({ messageId }: { messageId: string }) => {
      qc.setQueryData<ChatMessage[]>(['messages', conversationId, selfId], (prev) => {
        return prev?.map(m => m.id === messageId ? { ...m, isDeleted: true, text: 'This message was deleted' } : m)
      })
    }

    const onTypingStart = ({ userId, fullName }: { userId: string, fullName: string }) => {
      if (String(userId) === String(selfId)) return
      setTypingUsers(prev => prev.includes(fullName) ? prev : [...prev, fullName])
    }
    const onTypingStop = ({ fullName }: { userId: string, fullName: string }) => {
      setTypingUsers(prev => prev.filter(name => name !== fullName))
    }

    socket.on('message:new', onNew)
    socket.on('message:edited', onEdited)
    socket.on('message:deleted', onDeleted)
    socket.on('typing:start', onTypingStart)
    socket.on('typing:stop', onTypingStop)

    return () => {
      socket.emit('conversation:leave', conversationId)
      socket.off('message:new', onNew)
      socket.off('message:edited', onEdited)
      socket.off('message:deleted', onDeleted)
      socket.off('typing:start', onTypingStart)
      socket.off('typing:stop', onTypingStop)
    }
  }, [conversationId, selfId, qc])

  return { typingUsers }
}

export function useSendMessageMutation(selfId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, body, attachments, replyToId }: { conversationId: string; body: string; attachments?: any[], replyToId?: string }) => {
      const { data } = await api.post<{ data: BackendMessage }>(`/conversations/${conversationId}/messages`, { body, attachments, replyToId })
      return mapMessage(data.data, selfId!)
    },
    onSuccess: (msg) => {
      qc.setQueryData<ChatMessage[]>(['messages', msg.conversationId, selfId], (prev) => (prev?.some((m) => m.id === msg.id) ? prev : [...(prev ?? []), msg]))
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useStartConversationMutation(selfId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ contextType, contextId, participantIds, otherUserId, title }: { contextType: string; contextId?: string; participantIds?: string[]; otherUserId?: string; title?: string }) => {
      const pIds = participantIds || (otherUserId ? [otherUserId] : [])
      const { data } = await api.post<{ data: BackendConversation }>('/conversations', {
        contextType,
        contextId,
        participantIds: pIds,
        title
      })
      return mapConversation(data.data, selfId!)
    },
    onSuccess: (newConv) => {
      // A draft (no real _id) hasn't been persisted — nothing to cache until
      // a message is actually sent through it.
      if (newConv.draft) return
      qc.setQueryData<Conversation>(['conversation', newConv.id, selfId], newConv)
      qc.setQueryData<Conversation[]>(['conversations', selfId], (prev) => {
        if (!prev) return [newConv]
        if (prev.some(c => c.id === newConv.id)) {
          return prev.map(c => c.id === newConv.id ? newConv : c)
        }
        return [newConv, ...prev]
      })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

// Lightweight lookup for an existing 1:1 conversation with another user —
// used to redirect a freshly-opened draft chat onto a real conversation if
// one already exists (e.g. started from another tab/screen in the meantime).
export function useDirectConversationQuery(otherUserId: string | undefined, selfId: string | null) {
  return useQuery({
    queryKey: ['conversation-direct', otherUserId, selfId],
    queryFn: async (): Promise<Conversation | null> => {
      try {
        const { data } = await api.get<{ data: BackendConversation }>(`/conversations/direct/${otherUserId}`)
        return mapConversation(data.data, selfId!)
      } catch (err: any) {
        if (err?.response?.status === 404) return null
        throw err
      }
    },
    enabled: Boolean(otherUserId && selfId),
    staleTime: 5_000,
  })
}

export function useUserProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async (): Promise<BackendPublicProfile> => {
      const { data } = await api.get<{ data: BackendPublicProfile }>(`/users/${userId}`)
      return data.data
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
}

// Atomically resolves-or-creates the 1:1 conversation with recipientId and
// sends the first message into it — the only path that ever persists a new
// direct conversation, so opening a chat alone can never leave an empty row.
export function useSendDirectMessageMutation(selfId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ recipientId, contextType, contextId, body, attachments, replyToId }: {
      recipientId: string; contextType?: string; contextId?: string; body: string; attachments?: any[]; replyToId?: string
    }) => {
      const { data } = await api.post<{ data: { conversation: BackendConversation; message: BackendMessage } }>('/messages/direct', {
        recipientId, contextType, contextId, body, attachments, replyToId
      })
      return {
        conversation: mapConversation(data.data.conversation, selfId!),
        message: mapMessage(data.data.message, selfId!),
      }
    },
    onSuccess: ({ conversation, message }) => {
      qc.setQueryData<ChatMessage[]>(['messages', conversation.id, selfId], (prev) =>
        prev?.some((m) => m.id === message.id) ? prev : [...(prev ?? []), message]
      )
      qc.setQueryData<Conversation>(['conversation', conversation.id, selfId], conversation)
      qc.setQueryData<Conversation[]>(['conversations', selfId], (prev) => {
        if (!prev) return [conversation]
        if (prev.some((c) => c.id === conversation.id)) return prev.map((c) => c.id === conversation.id ? conversation : c)
        return [conversation, ...prev]
      })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

export function useSearchUsersQuery(query: string) {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: async () => {
      if (!query) return []
      const { data } = await api.get<{ data: BackendParticipant[] }>(`/users/search?q=${encodeURIComponent(query)}`)
      return data.data
    },
    enabled: query.length > 1
  })
}
