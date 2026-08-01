import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../context'
import { useConversationsQuery, useConversationMessagesQuery, useConversationRealtime, useSendMessageMutation } from '../api/messaging'
import { C, FONT, AppShell, Header } from '../components/MobileLayout'
import { EmptyState } from '../components/EmptyState'
import { StaggerList, StaggerItem } from '../components/Stagger'

// ── Conversation list ──────────────────────────────────────────────────────────
export function ConversationListScreen() {
  const nav = useNavigate()
  const { devUserId } = useApp()
  const { data: conversations, isLoading } = useConversationsQuery(devUserId)

  return (
    <AppShell>
      <Header title="Messages" back />

      {!isLoading && (conversations?.length ?? 0) === 0 ? (
        <EmptyState
          icon="💬"
          title="No conversations yet"
          description="Message a seller from a land listing, or a contractor from an awarded tender, to start a real conversation here."
        />
      ) : (
        <StaggerList className="divide-y sm:grid sm:grid-cols-2 sm:divide-y-0 sm:gap-3 sm:p-4">
          {(conversations ?? []).map((c) => (
            <StaggerItem key={c.id}>
              <button
                onClick={() => nav(`/messages/${c.id}`)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--color-parchment)] sm:rounded-2xl sm:border sm:px-4"
                style={{ borderColor: C.parchmentDark }}
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white font-bold" style={{ background: C.forest, fontFamily: FONT.serif }}>
                  {c.avatarInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <span style={{ fontFamily: FONT.sans, color: C.ink }} className="truncate text-sm font-semibold block">{c.withName}</span>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="truncate text-[9px] uppercase tracking-wider">{c.context}</div>
                </div>
              </button>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </AppShell>
  )
}

// ── Chat detail ─────────────────────────────────────────────────────────────────
export function ChatDetailScreen() {
  const { id } = useParams()
  const { devUserId } = useApp()
  const { data: conversations } = useConversationsQuery(devUserId)
  const conversation = conversations?.find((c) => c.id === id)
  const { data: messages } = useConversationMessagesQuery(id, devUserId)
  const sendMutation = useSendMessageMutation(devUserId)
  useConversationRealtime(id, devUserId)
  const [text, setText] = useState('')

  const send = () => {
    if (!text.trim() || !id) return
    sendMutation.mutate({ conversationId: id, body: text.trim() })
    setText('')
  }

  return (
    <AppShell noNav>
      <Header title={conversation?.withName ?? 'Conversation'} subtitle={conversation?.context} back />

      <div className="flex flex-col gap-3 px-5 py-5 sm:mx-auto sm:w-full sm:max-w-2xl" style={{ minHeight: '45vh' }}>
        <AnimatePresence initial={false}>
          {(messages ?? []).map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[75%]">
                <div className="rounded-2xl px-4 py-2.5" style={{ background: m.from === 'me' ? C.forest : C.parchment, color: m.from === 'me' ? C.white : C.ink }}>
                  {m.photoUrl && <img src={m.photoUrl} alt="Attachment" className="mb-1 h-32 w-48 rounded-xl object-cover" />}
                  {m.text && <span style={{ fontFamily: FONT.sans }} className="text-sm">{m.text}</span>}
                </div>
                <div className={`mt-1 flex items-center gap-1 ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px]">{m.timestamp}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {(messages?.length ?? 0) === 0 && (
          <div className="py-16 text-center">
            <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">No messages yet — say hello.</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t px-5 pb-6 pt-3 sm:mx-auto sm:w-full sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          className="flex-1 rounded-full border px-4 py-2.5 text-sm outline-none"
          style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
        />
        <button onClick={send} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ background: C.forest }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8H14M9 3L14 8L9 13" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </AppShell>
  )
}
