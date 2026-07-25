import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMessaging } from '../messaging'
import { C, FONT, AppShell, Header } from '../components/MobileLayout'

// ── Conversation list ──────────────────────────────────────────────────────────
export function ConversationListScreen() {
  const nav = useNavigate()
  const { conversations, lastMessage, unreadCount } = useMessaging()

  return (
    <AppShell>
      <Header title="Messages" back />

      <div className="divide-y sm:grid sm:grid-cols-2 sm:divide-y-0 sm:gap-3 sm:p-4" style={{ borderColor: C.parchmentDark }}>
        {conversations.map((c) => {
          const last = lastMessage(c.id)
          const unread = unreadCount(c.id)
          return (
            <button
              key={c.id}
              onClick={() => nav(`/messages/${c.id}`)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--color-parchment)] sm:rounded-2xl sm:border sm:px-4"
              style={{ borderColor: C.parchmentDark }}
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white font-bold" style={{ background: C.forest, fontFamily: FONT.serif }}>
                {c.avatarInitial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontFamily: FONT.sans, color: C.ink }} className="truncate text-sm font-semibold">{c.withName}</span>
                  {last && <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="whitespace-nowrap text-[10px]">{last.timestamp}</span>}
                </div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="truncate text-[9px] uppercase tracking-wider">{c.context}</div>
                {last && (
                  <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-0.5 truncate text-xs">
                    {last.from === 'me' ? 'You: ' : ''}{last.photoUrl && !last.text ? '📷 Photo' : last.text}
                  </p>
                )}
              </div>
              {unread > 0 && (
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: C.amber, fontFamily: FONT.mono }}>
                  {unread}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </AppShell>
  )
}

// ── Chat detail ─────────────────────────────────────────────────────────────────
const SAMPLE_ATTACHMENT = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&h=200&fit=crop&auto=format'

export function ChatDetailScreen() {
  const { id } = useParams()
  const { conversations, messages, sendMessage, markRead } = useMessaging()
  const conversation = conversations.find((c) => c.id === id) ?? conversations[0]
  const list = messages[conversation.id] ?? []
  const [text, setText] = useState('')

  useEffect(() => { markRead(conversation.id) }, [conversation.id])

  const send = () => {
    if (!text.trim()) return
    sendMessage(conversation.id, text.trim())
    setText('')
  }
  const attachPhoto = () => sendMessage(conversation.id, '', SAMPLE_ATTACHMENT)

  return (
    <AppShell noNav>
      <Header title={conversation.withName} subtitle={conversation.context} back />

      <div className="flex flex-col gap-3 px-5 py-5 sm:mx-auto sm:w-full sm:max-w-2xl" style={{ minHeight: '45vh' }}>
        {list.map((m) => (
          <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[75%]">
              <div className="rounded-2xl px-4 py-2.5" style={{ background: m.from === 'me' ? C.forest : C.parchment, color: m.from === 'me' ? C.white : C.ink }}>
                {m.photoUrl && <img src={m.photoUrl} alt="Attachment" className="mb-1 h-32 w-48 rounded-xl object-cover" />}
                {m.text && <span style={{ fontFamily: FONT.sans }} className="text-sm">{m.text}</span>}
              </div>
              <div className={`mt-1 flex items-center gap-1 ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px]">{m.timestamp}</span>
                {m.from === 'me' && (
                  <svg width="14" height="9" viewBox="0 0 16 10" fill="none">
                    <path d="M1 5L4.5 8.5L9 2" stroke={m.read ? C.forest : C.inkSubtle} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 5L9.5 8.5L14 2" stroke={m.read ? C.forest : C.inkSubtle} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="py-16 text-center">
            <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">No messages yet — say hello.</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t px-5 pb-6 pt-3 sm:mx-auto sm:w-full sm:max-w-2xl" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <button onClick={attachPhoto} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ background: C.parchment }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="5" width="14" height="10" rx="1.5" stroke={C.inkSubtle} strokeWidth="1.3" />
            <circle cx="9" cy="10" r="2.5" stroke={C.inkSubtle} strokeWidth="1.2" />
          </svg>
        </button>
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
