import { createContext, useContext, useState, type ReactNode } from 'react'

export interface ChatMessage {
  id: string
  conversationId: string
  from: 'me' | 'them'
  text: string
  photoUrl?: string
  timestamp: string
  read: boolean
}

export interface Conversation {
  id: string
  withName: string
  withRole: 'recipient' | 'contractor' | 'seller' | 'funder'
  context: string
  avatarInitial: string
}

const SEED_CONVERSATIONS: Conversation[] = [
  { id: 'c1', withName: 'Emmanuel Njang', withRole: 'recipient', context: 'Borehole — Bamenda North', avatarInitial: 'E' },
  { id: 'c2', withName: 'Fon Ayuk Construction', withRole: 'contractor', context: 'Water pump installation — Ngaoundéré', avatarInitial: 'F' },
  { id: 'c3', withName: 'Christophe Essama', withRole: 'seller', context: '800m² residential plot — Bastos', avatarInitial: 'C' },
]

const SEED_MESSAGES: Record<string, ChatMessage[]> = {
  c1: [
    { id: 'sm1', conversationId: 'c1', from: 'them', text: 'Good morning! Drilling started today, will send photos this evening.', timestamp: 'Mon, 09:14', read: true },
    { id: 'sm2', conversationId: 'c1', from: 'me', text: 'Wonderful, thank you for the update.', timestamp: 'Mon, 09:20', read: true },
    { id: 'sm3', conversationId: 'c1', from: 'them', text: 'Milestone 2 proof has been submitted for review.', timestamp: 'Fri, 14:23', read: false },
  ],
  c2: [
    { id: 'sm4', conversationId: 'c2', from: 'them', text: 'We can start within 48 hours of contract signing.', timestamp: 'Wed, 11:02', read: true },
  ],
  c3: [
    { id: 'sm5', conversationId: 'c3', from: 'them', text: 'Happy to schedule a site visit whenever works for you.', timestamp: 'Yesterday, 16:40', read: false },
  ],
}

interface MessagingContextValue {
  conversations: Conversation[]
  messages: Record<string, ChatMessage[]>
  sendMessage: (conversationId: string, text: string, photoUrl?: string) => void
  markRead: (conversationId: string) => void
  lastMessage: (conversationId: string) => ChatMessage | undefined
  unreadCount: (conversationId: string) => number
}

const MessagingContext = createContext<MessagingContextValue>({} as MessagingContextValue)

let idCounter = 1000
const nextId = () => `msg${idCounter++}`

export function MessagingProvider({ children }: { children: ReactNode }) {
  const [conversations] = useState<Conversation[]>(SEED_CONVERSATIONS)
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(SEED_MESSAGES)

  const sendMessage = (conversationId: string, text: string, photoUrl?: string) => {
    const msg: ChatMessage = { id: nextId(), conversationId, from: 'me', text, photoUrl, timestamp: 'Just now', read: true }
    setMessages((m) => ({ ...m, [conversationId]: [...(m[conversationId] ?? []), msg] }))
  }
  const markRead = (conversationId: string) => {
    setMessages((m) => ({ ...m, [conversationId]: (m[conversationId] ?? []).map((msg) => ({ ...msg, read: true })) }))
  }
  const lastMessage = (conversationId: string) => {
    const list = messages[conversationId] ?? []
    return list[list.length - 1]
  }
  const unreadCount = (conversationId: string) => (messages[conversationId] ?? []).filter((m) => !m.read && m.from === 'them').length

  return (
    <MessagingContext.Provider value={{ conversations, messages, sendMessage, markRead, lastMessage, unreadCount }}>
      {children}
    </MessagingContext.Provider>
  )
}

export const useMessaging = () => useContext(MessagingContext)
