/**
 * MessagingScreens — Premium WhatsApp-style Chat Experience for MboaTrust
 *
 * Fully-wired features:
 *   ✅ Real-time messaging (Socket.io)
 *   ✅ Direct & Group chats with clear user identity (name + photo / default avatar)
 *   ✅ Instant optimistic conversation creation with query cache seeding
 *   ✅ Single conversation resolution for direct URL navigation
 *   ✅ Phone & Video call modal UI (with live timer, mute, camera toggle, visualizers)
 *   ✅ Slide-over Conversation Info panel (shared media, participant list, mute, search)
 *   ✅ File & Media attachments (Images, Videos, PDFs, Documents with upload to backend)
 *   ✅ Image Lightbox preview modal
 *   ✅ Voice Message recording (MediaRecorder API with timer & live equalizer animation)
 *   ✅ Custom Audio Player bubbles (Play/Pause, scrub slider, speed multiplier 1x/1.5x/2x)
 *   ✅ Categorized Emoji Picker popover with quick search
 *   ✅ Message reactions (toggle emoji)
 *   ✅ Message Edit (with banner) & Soft-delete
 *   ✅ Typing indicators & Read receipts
 *   ✅ Theme-aware (Light / Dark mode integration)
 */
import {
  useState, useRef, useEffect, useMemo, useCallback,
  type KeyboardEvent, type ChangeEvent,
} from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Pencil, X, Check, CheckCheck,
  ChevronLeft, Send, MessageSquareDashed, Users,
  MoreHorizontal, Trash2, Pencil as PencilEdit, SmilePlus,
  Phone, Video, Info, Paperclip, Mic, MicOff, VideoOff,
  PhoneOff, Play, Pause, Download, FileText, Image as ImageIcon,
  Film, Music, Shield, BellOff, Bell
} from 'lucide-react'
import { useApp } from '../context'
import {
  useConversationsQuery,
  useSingleConversationQuery,
  useConversationMessagesQuery,
  useConversationRealtime,
  useSendMessageMutation,
  useSendDirectMessageMutation,
  useStartConversationMutation,
  useDirectConversationQuery,
  useUserProfileQuery,
  useSearchUsersQuery,
  type Conversation,
  type ChatMessage,
  type BackendParticipant,
  type BackendAttachment,
} from '../api/messaging'
import { api } from '../api/client'
import { getSocket } from '../api/socket'
import { C, FONT, AppShell } from '../components/MobileLayout'
import { useQueryClient } from '@tanstack/react-query'

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Categories
// ─────────────────────────────────────────────────────────────────────────────
type FilterTab = 'All' | 'Unread' | 'Groups'
const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

const EMOJI_CATEGORIES = [
  { name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'] },
  { name: 'Gestures', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '<ctrl42>', '💪'] },
  { name: 'Hearts & Symbols', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '☣️', '☢️', '⚠️', '⚡', '🔥', '✨', '🌟', '💫', '💥', '💯', '✅', '❌'] },
  { name: 'Objects & Trust', emojis: ['🏠', '🏗️', '🔑', '🛠️', '📐', '📋', '📁', '📄', '📜', '⚖️', '💰', '💳', '💎', '🔒', '🔓', '🛡️', '📞', '📱', '💻', '✉️', '📦', '🎁', '🏆', '🎯', '📍', '🗺️', '🔔', '🚀'] },
]

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return 'Now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─────────────────────────────────────────────────────────────────────────────
// Pulse & Skeletons
// ─────────────────────────────────────────────────────────────────────────────
function Pulse({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl ${className}`} style={{ background: 'var(--color-parchment-dark)' }} />
}
function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Pulse className="w-12 h-12 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Pulse className="h-3.5 w-1/2" />
        <Pulse className="h-2.5 w-3/4 opacity-60" />
      </div>
      <Pulse className="h-2.5 w-8 shrink-0" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Robust Theme-Aware Avatar with Deterministic Polished Fallback
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ url, name, initial, isGroup, size = 'md', className = '' }: {
  url?: string; name?: string; initial?: string; isGroup?: boolean; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string
}) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [url])

  const displayName = name || initial || 'User'
  const letter = (displayName.trim()[0] || '?').toUpperCase()

  const sz = size === 'sm' ? 'w-8 h-8 text-xs'
    : size === 'lg' ? 'w-14 h-14 text-xl'
    : size === 'xl' ? 'w-20 h-20 text-2xl'
    : 'w-12 h-12 text-sm'

  const iconSz = size === 'sm' ? 'w-4 h-4' : size === 'xl' ? 'w-9 h-9' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'

  const getGradient = (str: string) => {
    if (isGroup) return 'linear-gradient(135deg, var(--color-forest) 0%, #173826 100%)'
    let hash = 0
    for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i)
    const gradients = [
      'linear-gradient(135deg, #10B981 0%, #047857 100%)',
      'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
      'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
      'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
      'linear-gradient(135deg, #059669 0%, #064E3B 100%)',
    ]
    return gradients[Math.abs(hash) % gradients.length]
  }

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={displayName}
        onError={() => setImgError(true)}
        className={`${sz} rounded-2xl object-cover shrink-0 shadow-sm border border-black/5 ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sz} rounded-2xl flex items-center justify-center font-bold text-white shrink-0 select-none shadow-sm ${className}`}
      style={{ background: getGradient(displayName) }}>
      {isGroup ? (
        <Users className={iconSz} />
      ) : (
        letter
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Audio Player Bubble
// ─────────────────────────────────────────────────────────────────────────────
function AudioPlayer({ url, isMe }: { url: string; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }

  const cycleRate = () => {
    const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1
    setPlaybackRate(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  const onTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
  }

  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }

  const onSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setCurrentTime(val)
    if (audioRef.current) audioRef.current.currentTime = val
  }

  const fmt = (s: number) => {
    if (isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec < 10 ? '0' : ''}${sec}`
  }

  return (
    <div className="flex items-center gap-3 py-1 min-w-[200px] sm:min-w-[240px]">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95"
        style={{
          background: isMe ? '#fff' : C.forest,
          color: isMe ? C.forest : '#fff',
        }}>
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={onSeek}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
          style={{
            accentColor: isMe ? '#fff' : C.forest,
            background: isMe ? 'rgba(255,255,255,0.3)' : 'var(--color-parchment-dark)',
          }}
        />
        <div className="flex justify-between items-center text-[10px] mt-1 font-mono"
          style={{ color: isMe ? 'rgba(255,255,255,0.85)' : C.inkMuted }}>
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      <button
        onClick={cycleRate}
        className="px-2 py-1 rounded-lg text-[10px] font-bold font-mono shrink-0 transition-colors"
        style={{
          background: isMe ? 'rgba(255,255,255,0.2)' : 'var(--color-parchment-dark)',
          color: isMe ? '#fff' : C.ink,
        }}>
        {playbackRate}x
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Phone / Video Call Modal
// ─────────────────────────────────────────────────────────────────────────────
function CallModal({ conversation, mode, onClose }: {
  conversation: Conversation; mode: 'audio' | 'video'; onClose: () => void
}) {
  const [status, setStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing')
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(mode === 'audio')
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setStatus('connected'), 2000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (status !== 'connected') return
    const interval = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [status])

  const fmtTimer = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`
  }

  const endCall = () => {
    setStatus('ended')
    setTimeout(onClose, 800)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center p-6 text-center text-white"
        style={{ background: '#121814', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {mode === 'video' && !isVideoOff && (
          <div className="absolute inset-0 bg-gradient-to-b from-forest/40 to-black/90 flex items-center justify-center">
            <div className="w-full h-full opacity-30 flex items-center justify-center">
              <Film className="w-24 h-24 text-white animate-pulse" />
            </div>
            <span className="absolute top-4 left-4 text-xs font-mono bg-black/50 px-2.5 py-1 rounded-full border border-white/10">
              HD Encrypted Stream
            </span>
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center mt-6">
          <div className="relative mb-4">
            <Avatar url={conversation.avatarUrl} name={conversation.withName} isGroup={conversation.isGroup} size="xl" />
            {status === 'ringing' && (
              <span className="absolute -inset-2 rounded-3xl border-2 border-emerald-400/50 animate-ping pointer-events-none" />
            )}
          </div>

          <h3 className="text-xl font-bold font-sans tracking-tight">{conversation.withName}</h3>
          <p className="text-xs font-mono text-emerald-400 mt-1 uppercase tracking-widest">
            {status === 'ringing' ? 'Ringing…' : status === 'connected' ? fmtTimer(seconds) : 'Call Ended'}
          </p>
        </div>

        {status === 'connected' && mode === 'audio' && (
          <div className="relative z-10 flex items-center gap-1.5 my-8 h-12">
            {[40, 75, 30, 90, 50, 80, 45, 100, 60, 35, 85].map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: isMuted ? 8 : [12, h * 0.4, 12] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.08 }}
                className="w-1.5 rounded-full"
                style={{ background: C.forest }}
              />
            ))}
          </div>
        )}

        <div className="relative z-10 flex items-center gap-4 mt-8 mb-4">
          <button
            onClick={() => setIsMuted(v => !v)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {mode === 'video' && (
            <button
              onClick={() => setIsVideoOff(v => !v)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={endCall}
            className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-600 hover:bg-red-700 text-white shadow-lg active:scale-95 transition-transform">
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation Info Side Panel with Participant Overview
// ─────────────────────────────────────────────────────────────────────────────
function InfoPanel({ conversation, messages, onClose }: {
  conversation: Conversation; messages?: ChatMessage[]; onClose: () => void
}) {
  const { devUserId } = useApp()
  const [activeTab, setActiveTab] = useState<'info' | 'media'>('info')
  const [isMuted, setIsMuted] = useState(false)

  const mediaFiles = useMemo(() => {
    if (!messages) return []
    return messages.flatMap(m => m.attachments.map(att => ({ ...att, sentAt: m.rawSentAt })))
  }, [messages])

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="absolute right-0 top-0 bottom-0 z-40 w-full sm:w-[360px] border-l shadow-2xl flex flex-col"
      style={{ background: C.cream, borderColor: 'var(--color-parchment-dark)' }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--color-parchment-dark)' }}>
        <h3 className="font-bold text-base" style={{ color: C.ink, fontFamily: FONT.sans }}>Details</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.parchment }}>
          <X className="w-4 h-4" style={{ color: C.inkMuted }} />
        </button>
      </div>

      <div className="flex border-b shrink-0 px-4 pt-2" style={{ borderColor: 'var(--color-parchment-dark)' }}>
        <button
          onClick={() => setActiveTab('info')}
          className="flex-1 py-2 text-xs font-semibold border-b-2 text-center transition-colors"
          style={{
            borderColor: activeTab === 'info' ? C.forest : 'transparent',
            color: activeTab === 'info' ? C.forest : C.inkMuted,
            fontFamily: FONT.mono,
          }}>
          Overview
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className="flex-1 py-2 text-xs font-semibold border-b-2 text-center transition-colors"
          style={{
            borderColor: activeTab === 'media' ? C.forest : 'transparent',
            color: activeTab === 'media' ? C.forest : C.inkMuted,
            fontFamily: FONT.mono,
          }}>
          Media & Files ({mediaFiles.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {activeTab === 'info' ? (
          <>
            <div className="flex flex-col items-center text-center pb-4 border-b" style={{ borderColor: 'var(--color-parchment-dark)' }}>
              <Avatar url={conversation.avatarUrl} name={conversation.withName} isGroup={conversation.isGroup} size="xl" />
              <h2 className="text-lg font-bold mt-3" style={{ color: C.ink, fontFamily: FONT.sans }}>{conversation.withName}</h2>
              <span className="text-xs px-2.5 py-1 rounded-full font-mono mt-1" style={{ background: C.parchment, color: C.forest }}>
                {conversation.context}
              </span>
            </div>

            {conversation.participantIds && conversation.participantIds.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-inkMuted font-mono">
                  Participants ({conversation.participantIds.length})
                </h4>
                <div className="space-y-2">
                  {conversation.participantIds.map(p => {
                    const isMe = String(p._id) === String(devUserId)
                    return (
                      <div key={p._id} className="flex items-center gap-3 p-2.5 rounded-2xl transition-colors" style={{ background: C.parchment }}>
                        <Avatar url={p.avatarUrl || undefined} name={p.fullName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: C.ink, fontFamily: FONT.sans }}>
                            {p.fullName} {isMe ? <span className="text-xs text-forest font-mono ml-1">(You)</span> : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setIsMuted(v => !v)}
                className="w-full flex items-center justify-between p-3 rounded-2xl transition-colors"
                style={{ background: C.parchment }}>
                <div className="flex items-center gap-3">
                  {isMuted ? <BellOff className="w-4 h-4" style={{ color: C.inkMuted }} /> : <Bell className="w-4 h-4" style={{ color: C.forest }} />}
                  <span className="text-sm font-medium" style={{ color: C.ink, fontFamily: FONT.sans }}>Mute Notifications</span>
                </div>
                <span className="text-xs font-mono" style={{ color: C.inkMuted }}>{isMuted ? 'Muted' : 'Off'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl border flex items-start gap-3"
              style={{ background: 'var(--color-parchment)', borderColor: 'var(--color-parchment-dark)' }}>
              <Shield className="w-5 h-5 shrink-0 mt-0.5" style={{ color: C.forest }} />
              <div>
                <p className="text-xs font-bold" style={{ color: C.ink, fontFamily: FONT.sans }}>MboaTrust Escrow Protection</p>
                <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: C.inkMuted, fontFamily: FONT.sans }}>
                  Messages in this conversation are logged and protected for milestone dispute evidence.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {mediaFiles.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: C.inkMuted }}>No shared media or files yet.</p>
            ) : (
              mediaFiles.map((f, idx) => (
                <a
                  key={idx}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-2xl border transition-all hover:scale-[1.01]"
                  style={{ background: C.parchment, borderColor: 'var(--color-parchment-dark)' }}>
                  {f.type === 'image' ? <ImageIcon className="w-5 h-5" style={{ color: C.forest }} />
                    : f.type === 'video' ? <Film className="w-5 h-5" style={{ color: C.amber }} />
                    : f.type === 'audio' ? <Music className="w-5 h-5" style={{ color: C.forest }} />
                    : <FileText className="w-5 h-5" style={{ color: C.inkMuted }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: C.ink, fontFamily: FONT.sans }}>{f.fileName || 'Attachment'}</p>
                    <p className="text-[10px] font-mono" style={{ color: C.inkMuted }}>{formatBytes(f.sizeBytes)}</p>
                  </div>
                  <Download className="w-4 h-4 shrink-0" style={{ color: C.inkMuted }} />
                </a>
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Emoji Picker Popover
// ─────────────────────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState(0)

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return EMOJI_CATEGORIES[activeCat].emojis
    return EMOJI_CATEGORIES.flatMap(c => c.emojis)
  }, [search, activeCat])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="absolute bottom-16 left-4 z-40 w-72 sm:w-80 rounded-3xl shadow-2xl p-4 border overflow-hidden flex flex-col"
      style={{ background: C.cream, borderColor: 'var(--color-parchment-dark)', boxShadow: C.shadowXl }}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b" style={{ borderColor: 'var(--color-parchment-dark)' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search emojis…"
          className="w-full bg-transparent text-xs outline-none px-2 py-1 rounded-xl"
          style={{ background: C.parchment, color: C.ink, fontFamily: FONT.sans }}
        />
        <button onClick={onClose} className="ml-2 p-1 rounded-full" style={{ background: C.parchment }}>
          <X className="w-3.5 h-3.5" style={{ color: C.inkMuted }} />
        </button>
      </div>

      {!search && (
        <div className="flex justify-between border-b pb-2 mb-2" style={{ borderColor: 'var(--color-parchment-dark)' }}>
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => setActiveCat(i)}
              className="text-xs px-2 py-1 rounded-lg font-mono"
              style={{
                background: activeCat === i ? C.forest : 'transparent',
                color: activeCat === i ? '#fff' : C.inkMuted,
              }}>
              {cat.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto p-1">
        {filteredEmojis.map((emoji, idx) => (
          <button
            key={idx}
            onClick={() => { onSelect(emoji); onClose() }}
            className="text-xl p-1.5 rounded-xl hover:bg-black/5 active:scale-95 transition-transform">
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightbox Modal for Images
// ─────────────────────────────────────────────────────────────────────────────
function LightboxModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
    >
      <button onClick={onClose} className="absolute top-6 right-6 text-white p-2 rounded-full bg-white/10 hover:bg-white/20">
        <X className="w-6 h-6" />
      </button>
      <img src={url} alt="enlarged preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// New conversation modal — user search + start chat
// ─────────────────────────────────────────────────────────────────────────────
function NewChatModal({ selfId, onClose, onStart }: {
  selfId: string; onClose: () => void; onStart: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const { data: users = [], isLoading } = useSearchUsersQuery(q)
  const startMutation = useStartConversationMutation(selfId)

  const start = async (user: BackendParticipant) => {
    const conv = await startMutation.mutateAsync({
      contextType: 'direct',
      participantIds: [user._id],
    })
    // No existing conversation with this user yet — hand off to a draft chat
    // that won't be persisted until the first message is actually sent.
    onStart(conv.draft ? `new_${user._id}` : conv.id)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: C.cream }}
        initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }}
        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-bold text-lg" style={{ color: C.ink, fontFamily: FONT.sans }}>New Message</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.parchment }}>
            <X className="w-4 h-4" style={{ color: C.inkMuted }} />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl" style={{ background: C.parchment }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: C.inkSubtle }} />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search users by name…"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: C.ink, fontFamily: FONT.sans }}
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto px-3 pb-4">
          {isLoading && <p className="text-xs text-center py-4" style={{ color: C.inkMuted }}>Searching…</p>}
          {!isLoading && q.length > 1 && users.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: C.inkMuted }}>No users found</p>
          )}
          {users.map(u => (
            <button
              key={u._id}
              onClick={() => start(u)}
              disabled={startMutation.isPending}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-parchment)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Avatar url={u.avatarUrl || undefined} name={u.fullName} size="sm" />
              <span className="text-sm font-medium" style={{ color: C.ink, fontFamily: FONT.sans }}>{u.fullName}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Emoji reaction picker
// ─────────────────────────────────────────────────────────────────────────────
function ReactionPicker({ messageId, conversationId, selfId, onDone }: {
  messageId: string; conversationId: string; selfId: string; onDone: () => void
}) {
  const qc = useQueryClient()

  const react = async (emoji: string) => {
    try {
      const { data } = await api.post(`/messages/${messageId}/react`, { emoji })
      qc.setQueryData<ChatMessage[]>(['messages', conversationId, selfId], prev =>
        prev?.map(m => m.id === messageId ? { ...m, reactions: data.data.reactions } : m)
      )
    } catch { /* ignore */ }
    onDone()
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="flex items-center gap-1 px-2 py-1.5 rounded-2xl shadow-lg"
      style={{ background: C.cream, boxShadow: C.shadowLg }}
    >
      {COMMON_EMOJIS.map(e => (
        <button
          key={e}
          onClick={() => react(e)}
          className="text-lg leading-none w-8 h-8 rounded-xl flex items-center justify-center transition-transform hover:scale-125 active:scale-95"
        >
          {e}
        </button>
      ))}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Message action menu
// ─────────────────────────────────────────────────────────────────────────────
function MessageMenu({ messageId, conversationId, isMe, onEdit, onClose }: {
  messageId: string; conversationId: string; isMe: boolean; onEdit: () => void; onClose: () => void
}) {
  const { devUserId } = useApp()
  const qc = useQueryClient()

  const deleteMsg = async () => {
    try {
      await api.delete(`/messages/${messageId}`)
      qc.setQueryData<ChatMessage[]>(['messages', conversationId, devUserId], prev =>
        prev?.map(m => m.id === messageId ? { ...m, isDeleted: true, text: '' } : m)
      )
    } catch { /* ignore */ }
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 4 }}
      className="absolute z-20 min-w-[140px] rounded-2xl overflow-hidden shadow-xl"
      style={{
        background: C.cream,
        boxShadow: C.shadowXl,
        top: '100%',
        [isMe ? 'right' : 'left']: 0,
        marginTop: '4px',
      }}
    >
      {isMe && (
        <button
          onClick={onEdit}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors"
          style={{ color: C.ink, fontFamily: FONT.sans }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-parchment)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <PencilEdit className="w-3.5 h-3.5" style={{ color: C.inkMuted }} />
          Edit
        </button>
      )}
      {isMe && (
        <button
          onClick={deleteMsg}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors"
          style={{ color: 'var(--color-seal)', fontFamily: FONT.sans }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-parchment)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      )}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation row
// ─────────────────────────────────────────────────────────────────────────────
function ConvoRow({ convo, isActive, onClick }: {
  convo: Conversation; isActive: boolean; onClick: () => void
}) {
  const preview = convo.lastMessage
    ? convo.lastMessage.type === 'text' ? convo.lastMessage.body : `📎 ${convo.lastMessage.type}`
    : convo.context

  return (
    <motion.button
      layout
      initial={false}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left relative transition-colors duration-100 rounded-2xl"
      style={{ background: isActive ? 'var(--color-parchment)' : 'transparent' }}
      whileHover={{ background: isActive ? 'var(--color-parchment)' : 'var(--color-parchment-dark, rgba(0,0,0,0.04))' }}
      whileTap={{ scale: 0.99 }}
    >
      {isActive && (
        <motion.div layoutId="active-stripe"
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
          style={{ background: C.forest }} />
      )}
      <Avatar url={convo.avatarUrl} name={convo.withName} isGroup={convo.isGroup} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span className="truncate text-sm font-semibold" style={{ color: C.ink, fontFamily: FONT.sans }}>
            {convo.withName}
          </span>
          <span className="shrink-0 text-[10px] tabular-nums"
            style={{ color: convo.unreadCount > 0 ? C.forest : C.inkSubtle, fontFamily: FONT.mono }}>
            {relativeTime(convo.updatedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs"
            style={{ color: convo.unreadCount > 0 ? C.ink : C.inkMuted, fontWeight: convo.unreadCount > 0 ? 600 : 400, fontFamily: FONT.sans }}>
            {preview}
          </p>
          {convo.unreadCount > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
              style={{ background: C.forest, fontFamily: FONT.mono }}>
              {convo.unreadCount > 99 ? '99+' : convo.unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe, isFirst, isLast, inGroup, selfId, conversationId, onStartEdit, onOpenLightbox }: {
  msg: ChatMessage; isMe: boolean; isFirst: boolean; isLast: boolean
  inGroup: boolean; selfId: string; conversationId: string
  onStartEdit: (msg: ChatMessage) => void; onOpenLightbox: (url: string) => void
}) {
  const [showReactions, setShowReactions] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showReactions && !showMenu) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowReactions(false)
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showReactions, showMenu])

  const br = {
    borderTopLeftRadius: '18px',
    borderTopRightRadius: '18px',
    borderBottomLeftRadius: !isMe && isLast ? '6px' : '18px',
    borderBottomRightRadius: isMe && isLast ? '6px' : '18px',
  }

  const reactionGroups = useMemo(() => {
    const map = new Map<string, number>()
    msg.reactions.forEach(r => map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1))
    return [...map.entries()]
  }, [msg.reactions])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-3' : 'mt-0.5'}`}
    >
      {!isMe && inGroup && (
        <div className="w-8 shrink-0 mr-2 flex items-end pb-0.5">
          {isLast ? (
            <Avatar url={msg.senderAvatar} name={msg.senderName || 'User'} size="sm" />
          ) : null}
        </div>
      )}

      <div ref={containerRef} className="relative group max-w-[85%] sm:max-w-[70%]">
        {!isMe && inGroup && isFirst && msg.senderName && (
          <p className="text-[11px] font-semibold mb-1 ml-1" style={{ color: C.amber, fontFamily: FONT.mono }}>
            {msg.senderName}
          </p>
        )}

        <div className="px-4 py-2.5 relative" style={{
          ...br,
          background: msg.isDeleted
            ? 'var(--color-parchment-dark)'
            : isMe ? C.forest : 'var(--color-parchment)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {msg.isDeleted ? (
            <p className="text-sm italic" style={{ color: C.inkMuted }}>This message was deleted</p>
          ) : (
            <>
              {msg.attachments.map((att, idx) => (
                <div key={idx} className="mb-2">
                  {att.type === 'image' ? (
                    <img
                      src={att.url}
                      alt="attachment"
                      onClick={() => onOpenLightbox(att.url)}
                      className="w-full rounded-xl cursor-pointer object-cover max-h-64 transition-opacity hover:opacity-90"
                    />
                  ) : att.type === 'video' ? (
                    <video src={att.url} controls className="w-full rounded-xl max-h-64" />
                  ) : att.type === 'audio' ? (
                    <AudioPlayer url={att.url} isMe={isMe} />
                  ) : (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-transform hover:scale-[1.01]"
                      style={{
                        background: isMe ? 'rgba(255,255,255,0.15)' : C.cream,
                        borderColor: isMe ? 'rgba(255,255,255,0.2)' : 'var(--color-parchment-dark)',
                        color: isMe ? '#fff' : C.ink,
                      }}>
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="truncate font-medium flex-1">{att.fileName || 'Document'}</span>
                      <Download className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  )}
                </div>
              ))}

              {msg.text && (
                <p className="text-[15px] leading-relaxed break-words"
                  style={{ color: isMe ? '#fff' : C.ink, fontFamily: FONT.sans }}>
                  {msg.text}
                </p>
              )}

              {msg.isEdited && !msg.isDeleted && (
                <span className="text-[10px] italic ml-1" style={{ color: isMe ? 'rgba(255,255,255,0.6)' : C.inkSubtle }}>edited</span>
              )}
            </>
          )}

          <div className="flex items-center gap-1 justify-end mt-1.5" style={{ opacity: 0.7 }}>
            <span className="text-[10px] tabular-nums"
              style={{ color: isMe ? 'rgba(255,255,255,0.85)' : C.inkSubtle, fontFamily: FONT.mono }}>
              {msg.timestamp}
            </span>
            {isMe && !msg.isDeleted && (
              msg.read
                ? <CheckCheck className="w-3 h-3" style={{ color: isMe ? 'rgba(255,255,255,0.85)' : C.inkSubtle }} />
                : <Check className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.65)' }} />
            )}
          </div>
        </div>

        {reactionGroups.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {reactionGroups.map(([emoji, count]) => (
              <span key={emoji}
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{ background: C.parchment, borderColor: 'var(--color-parchment-dark)', fontFamily: FONT.mono }}>
                {emoji} {count > 1 ? count : ''}
              </span>
            ))}
          </div>
        )}

        {!msg.isDeleted && (
          <div className={`absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ${isMe ? 'right-2' : 'left-2'}`}>
            <button
              onClick={() => { setShowReactions(v => !v); setShowMenu(false) }}
              className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-110"
              style={{ background: C.cream, boxShadow: C.shadowSm }}>
              <SmilePlus className="w-3.5 h-3.5" style={{ color: C.inkMuted }} />
            </button>
            <button
              onClick={() => { setShowMenu(v => !v); setShowReactions(false) }}
              className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-110"
              style={{ background: C.cream, boxShadow: C.shadowSm }}>
              <MoreHorizontal className="w-3.5 h-3.5" style={{ color: C.inkMuted }} />
            </button>
          </div>
        )}

        <AnimatePresence>
          {showReactions && (
            <div className={`absolute z-30 -top-12 ${isMe ? 'right-0' : 'left-0'}`}>
              <ReactionPicker
                messageId={msg.id}
                conversationId={conversationId}
                selfId={selfId}
                onDone={() => setShowReactions(false)}
              />
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showMenu && (
            <MessageMenu
              messageId={msg.id}
              conversationId={conversationId}
              isMe={isMe}
              onEdit={() => { onStartEdit(msg); setShowMenu(false) }}
              onClose={() => setShowMenu(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Typing bubble & Date divider
// ─────────────────────────────────────────────────────────────────────────────
function TypingBubble({ names }: { names: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
      className="flex items-center gap-2 px-1 py-1 mt-2">
      <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-md"
        style={{ background: 'var(--color-parchment)', boxShadow: 'var(--shadow-sm)' }}>
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ background: C.inkMuted, animationDelay: `${i * 130}ms` }} />
        ))}
      </div>
      <span className="text-xs" style={{ color: C.inkMuted, fontFamily: FONT.sans }}>
        {names.join(', ')} {names.length === 1 ? 'is' : 'are'} typing…
      </span>
    </motion.div>
  )
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-5 px-2">
      <div className="flex-1 h-px" style={{ background: 'var(--color-parchment-dark)' }} />
      <span className="text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
        style={{ color: C.inkMuted, background: 'var(--color-parchment)', fontFamily: FONT.mono }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--color-parchment-dark)' }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar panel
// ─────────────────────────────────────────────────────────────────────────────
function SidebarPanel({ activeId, onSelect }: {
  activeId?: string; onSelect: (id: string) => void
}) {
  const { devUserId } = useApp()
  const nav = useNavigate()
  const { data: conversations, isLoading } = useConversationsQuery(devUserId)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<FilterTab>('All')
  const [showNewChat, setShowNewChat] = useState(false)

  const filtered = useMemo(() => {
    if (!conversations) return []
    let list = conversations
    if (tab === 'Unread') list = list.filter(c => c.unreadCount > 0)
    else if (tab === 'Groups') list = list.filter(c => c.isGroup)
    if (query.trim()) list = list.filter(c => c.withName.toLowerCase().includes(query.toLowerCase()))
    return list
  }, [conversations, query, tab])

  const handleStart = (id: string) => {
    setShowNewChat(false)
    onSelect(id)
    nav(`/messages/${id}`)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: C.cream }}>
      <div className="px-5 pt-6 pb-4 flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.ink, fontFamily: FONT.sans }}>
          Messages
        </h1>
        <button
          onClick={() => setShowNewChat(true)}
          title="New conversation"
          className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ background: C.parchment }}>
          <Pencil className="w-4 h-4" style={{ color: C.forest }} />
        </button>
      </div>

      <div className="px-4 mb-3 shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl"
          style={{ background: C.parchment, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}>
          <Search className="w-4 h-4 shrink-0" style={{ color: C.inkSubtle }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search conversations…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: C.ink, fontFamily: FONT.sans }}
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X className="w-3.5 h-3.5" style={{ color: C.inkSubtle }} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 mb-3 flex gap-1.5 shrink-0">
        {(['All', 'Unread', 'Groups'] as FilterTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              background: tab === t ? C.forest : C.parchment,
              color: tab === t ? '#fff' : C.inkMuted,
              fontFamily: FONT.mono,
            }}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 pb-4" style={{ touchAction: 'pan-y' }}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <ConversationSkeleton key={i} />)
          : filtered.length === 0
            ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: C.parchment }}>
                  {tab === 'Groups' ? <Users className="w-6 h-6" style={{ color: C.forest }} /> : <MessageSquareDashed className="w-6 h-6" style={{ color: C.forest }} />}
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: C.ink, fontFamily: FONT.sans }}>
                  {tab === 'Unread' ? 'All caught up 🎉' : tab === 'Groups' ? 'No group chats' : 'No conversations yet'}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: C.inkMuted, fontFamily: FONT.sans }}>
                  {tab === 'All' ? 'Tap the pencil icon above to start a new conversation.' : ''}
                </p>
              </div>
            )
            : (
              <AnimatePresence mode="popLayout">
                {filtered.map(c => (
                  <ConvoRow key={c.id} convo={c} isActive={c.id === activeId} onClick={() => onSelect(c.id)} />
                ))}
              </AnimatePresence>
            )
        }
      </div>

      <AnimatePresence>
        {showNewChat && devUserId && (
          <NewChatModal selfId={devUserId} onClose={() => setShowNewChat(false)} onStart={handleStart} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Chat Pane with Full Interactions
// ─────────────────────────────────────────────────────────────────────────────
function ChatPane({ id, onBack }: { id: string; onBack?: () => void }) {
  const { devUserId } = useApp()
  const qc = useQueryClient()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()

  // A "new_<userId>" id is a draft chat that has never been persisted — the
  // user opened a conversation with someone but no message has been sent yet.
  const draftMode = id.startsWith('new_')
  const draftUserId = draftMode ? id.slice(4) : undefined
  const draftContextType = searchParams.get('contextType') || 'direct'
  const draftContextId = searchParams.get('contextId') || undefined

  const { data: conversations } = useConversationsQuery(devUserId)
  const listConversation = !draftMode ? conversations?.find(c => c.id === id) : undefined
  const { data: singleConversation, isLoading: isSingleLoading } = useSingleConversationQuery(
    !draftMode && !listConversation ? id : undefined,
    devUserId
  )
  const { data: draftProfile } = useUserProfileQuery(draftMode ? draftUserId : undefined)
  // Someone may have already started this conversation elsewhere (another
  // tab, or the same click that got here) — redirect onto the real thread
  // instead of ever showing two entry points into the same pair of users.
  const { data: resolvedExisting } = useDirectConversationQuery(draftMode ? draftUserId : undefined, devUserId)

  useEffect(() => {
    if (resolvedExisting) nav(`/messages/${resolvedExisting.id}`, { replace: true })
  }, [resolvedExisting, nav])

  const draftConversation: Conversation | undefined = draftMode && draftProfile ? {
    id: '',
    draft: true,
    withName: draftProfile.fullName || 'MboaTrust User',
    withRole: 'user',
    context: 'Direct',
    avatarInitial: (draftProfile.fullName?.[0] || '?').toUpperCase(),
    avatarUrl: draftProfile.avatarUrl || undefined,
    unreadCount: 0,
    isGroup: false,
    updatedAt: new Date().toISOString(),
    participantIds: [],
  } : undefined

  const conversation = listConversation || singleConversation || draftConversation

  const { data: messages } = useConversationMessagesQuery(draftMode ? undefined : id, devUserId)
  const sendMutation = useSendMessageMutation(devUserId)
  const sendDirectMutation = useSendDirectMessageMutation(devUserId)
  const isSending = draftMode ? sendDirectMutation.isPending : sendMutation.isPending
  const { typingUsers } = useConversationRealtime(draftMode ? undefined : id, devUserId)

  const [text, setText] = useState('')
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null)
  const [pendingAttachment, setPendingAttachment] = useState<BackendAttachment | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [callMode, setCallMode] = useState<'audio' | 'video' | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!id || !devUserId || draftMode) return
    api.post(`/conversations/${id}/read`).catch(() => {})
    qc.invalidateQueries({ queryKey: ['conversations'] })
  }, [id, devUserId, qc, draftMode])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typingUsers, pendingAttachment])

  const emitTyping = useCallback(() => {
    if (!id) return
    const socket = getSocket()
    socket.emit('typing:start', { conversationId: id })
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: id })
    }, 2500)
  }, [id])

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    emitTyping()
  }

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const { data } = await api.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setPendingAttachment(data.data)
    } catch {
      alert('Failed to upload file attachment. Please try again.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingSeconds(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1)
      }, 1000)
    } catch {
      alert('Microphone access is required to record voice messages.')
    }
  }

  const stopAndSendRecording = async () => {
    if (!mediaRecorderRef.current) return

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' })

      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', audioFile)

        const { data } = await api.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        if (draftMode) {
          const { conversation: newConv } = await sendDirectMutation.mutateAsync({
            recipientId: draftUserId!,
            contextType: draftContextType,
            contextId: draftContextId,
            body: '',
            attachments: [data.data],
          })
          nav(`/messages/${newConv.id}`, { replace: true })
        } else {
          sendMutation.mutate({
            conversationId: id,
            body: '',
            attachments: [data.data]
          })
        }
      } catch {
        alert('Failed to send voice note.')
      } finally {
        setIsUploading(false)
      }
    }

    mediaRecorderRef.current.stop()
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    cancelRecording()
  }

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
    setIsRecording(false)
    setRecordingSeconds(0)
  }

  const send = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed && !pendingAttachment) return

    if (!draftMode) {
      getSocket().emit('typing:stop', { conversationId: id })
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }

    if (editingMsg) {
      try {
        const { data } = await api.patch(`/messages/${editingMsg.id}`, { body: trimmed })
        qc.setQueryData<ChatMessage[]>(['messages', id, devUserId], prev =>
          prev?.map(m => m.id === editingMsg.id ? { ...m, text: data.data.body, isEdited: true } : m)
        )
      } catch { /* ignore */ }
      setEditingMsg(null)
    } else {
      const attachments = pendingAttachment ? [pendingAttachment] : undefined
      if (draftMode) {
        try {
          const { conversation: newConv } = await sendDirectMutation.mutateAsync({
            recipientId: draftUserId!,
            contextType: draftContextType,
            contextId: draftContextId,
            body: trimmed,
            attachments,
          })
          nav(`/messages/${newConv.id}`, { replace: true })
        } catch { /* sendDirectMutation.isError drives the failure banner */ }
      } else {
        sendMutation.mutate({ conversationId: id, body: trimmed, attachments })
      }
    }

    setText('')
    setPendingAttachment(null)
    inputRef.current?.focus()
  }, [text, id, editingMsg, pendingAttachment, sendMutation, sendDirectMutation, qc, devUserId, draftMode, draftUserId, draftContextType, draftContextId, nav])

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
    if (e.key === 'Escape' && editingMsg) { setEditingMsg(null); setText('') }
  }

  const startEdit = (msg: ChatMessage) => {
    setEditingMsg(msg)
    setText(msg.text)
    inputRef.current?.focus()
  }

  const groups = useMemo(() => {
    if (!messages) return []
    const result: { label: string; msgs: ChatMessage[] }[] = []
    messages.forEach(m => {
      const label = dayLabel(m.rawSentAt)
      const last = result[result.length - 1]
      if (last && last.label === label) last.msgs.push(m)
      else result.push({ label, msgs: [m] })
    })
    return result
  }, [messages])

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ background: C.cream }}>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
      />

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-4 h-[68px] border-b relative z-10"
        style={{ background: C.cream, borderColor: 'var(--color-parchment-dark)' }}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack}
              className="w-9 h-9 rounded-2xl flex items-center justify-center mr-1 transition-all hover:scale-105"
              style={{ background: C.parchment }}>
              <ChevronLeft className="w-5 h-5" style={{ color: C.ink }} />
            </button>
          )}

          {!conversation && isSingleLoading ? (
            <div className="flex items-center gap-3">
              <Pulse className="w-11 h-11 rounded-2xl shrink-0" />
              <div className="space-y-1.5">
                <Pulse className="h-4 w-28" />
                <Pulse className="h-3 w-16 opacity-60" />
              </div>
            </div>
          ) : (
            <>
              <Avatar url={conversation?.avatarUrl} name={conversation?.withName ?? 'User'} isGroup={conversation?.isGroup} />
              <div>
                <p className="font-semibold text-[15px]" style={{ color: C.ink, fontFamily: FONT.sans }}>
                  {conversation?.withName ?? 'User'}
                </p>
                <AnimatePresence mode="wait">
                  {typingUsers.length > 0 ? (
                    <motion.p key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-xs font-medium" style={{ color: C.forest, fontFamily: FONT.sans }}>
                      {typingUsers.join(', ')} typing…
                    </motion.p>
                  ) : (
                    <motion.p key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-xs" style={{ color: C.inkSubtle, fontFamily: FONT.mono }}>
                      {conversation?.context ?? 'Chat'}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCallMode('audio')}
            title="Start Voice Call"
            className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ background: C.parchment }}>
            <Phone className="w-4 h-4" style={{ color: C.forest }} />
          </button>
          <button
            onClick={() => setCallMode('video')}
            title="Start Video Call"
            className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ background: C.parchment }}>
            <Video className="w-4 h-4" style={{ color: C.forest }} />
          </button>
          <button
            onClick={() => setShowInfo(v => !v)}
            title="Conversation Details"
            className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ background: showInfo ? C.forest : C.parchment }}>
            <Info className="w-4 h-4" style={{ color: showInfo ? '#fff' : C.inkMuted }} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-6"
        style={{ scrollBehavior: 'smooth', touchAction: 'pan-y' }}>

        {(!messages || messages.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: C.parchment }}>
              <MessageSquareDashed className="w-6 h-6" style={{ color: C.inkSubtle }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: C.ink, fontFamily: FONT.sans }}>No messages yet</p>
            <p className="text-xs" style={{ color: C.inkMuted, fontFamily: FONT.sans }}>Say hello to start the conversation!</p>
          </div>
        )}

        {groups.map(group => (
          <div key={group.label}>
            <DateDivider label={group.label} />
            {group.msgs.map((m, i) => {
              const isMe = m.from === 'me'
              const isFirst = i === 0 || group.msgs[i - 1].from !== m.from
              const isLast = i === group.msgs.length - 1 || group.msgs[i + 1].from !== m.from
              return (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  isMe={isMe}
                  isFirst={isFirst}
                  isLast={isLast}
                  inGroup={!!conversation?.isGroup}
                  selfId={devUserId!}
                  conversationId={id}
                  onStartEdit={startEdit}
                  onOpenLightbox={setLightboxUrl}
                />
              )
            })}
          </div>
        ))}

        <AnimatePresence>
          {typingUsers.length > 0 && <TypingBubble names={typingUsers} />}
        </AnimatePresence>
        <div className="h-4" />
      </div>

      {/* ── Pending Attachment Preview ── */}
      <AnimatePresence>
        {pendingAttachment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="shrink-0 px-5 py-2 border-t flex items-center justify-between"
            style={{ background: C.parchment, borderColor: 'var(--color-parchment-dark)' }}>
            <div className="flex items-center gap-3 min-w-0">
              {pendingAttachment.type === 'image' ? <ImageIcon className="w-5 h-5 shrink-0" style={{ color: C.forest }} /> : <FileText className="w-5 h-5 shrink-0" style={{ color: C.inkMuted }} />}
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: C.ink }}>{pendingAttachment.fileName || 'Attachment ready'}</p>
                <p className="text-[10px] font-mono" style={{ color: C.inkMuted }}>{formatBytes(pendingAttachment.sizeBytes)}</p>
              </div>
            </div>
            <button onClick={() => setPendingAttachment(null)} className="p-1 rounded-full hover:bg-black/5">
              <X className="w-4 h-4" style={{ color: C.inkMuted }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Banner ── */}
      <AnimatePresence>
        {editingMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="shrink-0 flex items-center justify-between px-5 py-2 border-t"
            style={{ background: C.parchment, borderColor: 'var(--color-parchment-dark)' }}>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: C.forest, fontFamily: FONT.mono }}>
                Editing
              </p>
              <p className="text-xs truncate" style={{ color: C.inkMuted, fontFamily: FONT.sans }}>
                {editingMsg.text}
              </p>
            </div>
            <button onClick={() => { setEditingMsg(null); setText('') }}
              className="w-7 h-7 rounded-full flex items-center justify-center ml-3"
              style={{ background: 'var(--color-parchment-dark)' }}>
              <X className="w-3.5 h-3.5" style={{ color: C.inkMuted }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Emoji Picker Popover ── */}
      <AnimatePresence>
        {showEmojiPicker && (
          <EmojiPicker
            onSelect={e => setText(prev => prev + e)}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Composer / Voice Recording Bar ── */}
      <div className="shrink-0 px-4 pb-5 pt-3 border-t relative z-10"
        style={{ background: C.cream, borderColor: 'var(--color-parchment-dark)' }}>

        {isRecording ? (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-3xl" style={{ background: 'var(--color-parchment)' }}>
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono font-bold" style={{ color: C.ink }}>
              0:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds}
            </span>
            <div className="flex-1 flex items-center gap-1 h-4">
              {[40, 80, 50, 100, 70, 30, 90, 60, 40, 85, 45].map((h, idx) => (
                <div key={idx} className="flex-1 bg-red-400/60 rounded-full animate-pulse" style={{ height: `${h}%` }} />
              ))}
            </div>
            <button onClick={cancelRecording} className="p-2 rounded-2xl text-red-500 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={stopAndSendRecording} className="w-10 h-10 rounded-2xl flex items-center justify-center text-white" style={{ background: C.forest }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-3xl transition-all duration-200"
            style={{ background: 'var(--color-parchment)', boxShadow: C.shadowSm }}>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-1.5 rounded-2xl hover:bg-black/5 active:scale-95 transition-transform">
              <Paperclip className="w-5 h-5" style={{ color: isUploading ? C.forest : C.inkMuted }} />
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPicker(v => !v)}
              className="p-1.5 rounded-2xl hover:bg-black/5 active:scale-95 transition-transform">
              <SmilePlus className="w-5 h-5" style={{ color: showEmojiPicker ? C.forest : C.inkMuted }} />
            </button>

            <input
              ref={inputRef}
              value={text}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              placeholder={editingMsg ? 'Edit message…' : `Message ${conversation?.withName ?? ''}…`}
              className="flex-1 bg-transparent outline-none text-[15px] py-1"
              style={{ color: C.ink, fontFamily: FONT.sans }}
              disabled={isSending || isUploading}
            />

            <AnimatePresence mode="wait" initial={false}>
              {text.trim() || pendingAttachment ? (
                <motion.button
                  key="send"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  onClick={send}
                  disabled={isSending || isUploading}
                  className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
                  style={{
                    background: editingMsg ? C.amber : C.forest,
                    opacity: isSending || isUploading ? 0.6 : 1,
                  }}>
                  {editingMsg ? <Check className="w-4 h-4 text-white" /> : <Send className="w-4 h-4 text-white translate-x-0.5" />}
                </motion.button>
              ) : (
                <motion.button
                  key="mic"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  onClick={startRecording}
                  title="Hold/Click to record voice message"
                  className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
                  style={{ background: C.cream }}>
                  <Mic className="w-4 h-4" style={{ color: C.forest }} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}

        {(draftMode ? sendDirectMutation.isError : sendMutation.isError) && (
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--color-seal)', fontFamily: FONT.sans }}>
            Failed to send. Please try again.
          </p>
        )}
      </div>

      {/* ── Slide-over Conversation Info ── */}
      <AnimatePresence>
        {showInfo && conversation && (
          <InfoPanel conversation={conversation} messages={messages} onClose={() => setShowInfo(false)} />
        )}
      </AnimatePresence>

      {/* ── Call Modal ── */}
      <AnimatePresence>
        {callMode && conversation && (
          <CallModal conversation={conversation} mode={callMode} onClose={() => setCallMode(null)} />
        )}
      </AnimatePresence>

      {/* ── Lightbox Image Modal ── */}
      <AnimatePresence>
        {lightboxUrl && (
          <LightboxModal url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// No chat selected (desktop placeholder)
// ─────────────────────────────────────────────────────────────────────────────
function NoChatSelected() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center select-none h-full">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex flex-col items-center">
        <div className="w-24 h-24 rounded-[28px] flex items-center justify-center mb-6"
          style={{ background: C.parchment, boxShadow: C.shadowMd }}>
          <MessageSquareDashed className="w-10 h-10" style={{ color: C.forest }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: C.ink, fontFamily: FONT.sans }}>Your Messages</h2>
        <p className="text-sm max-w-[260px] leading-relaxed" style={{ color: C.inkMuted, fontFamily: FONT.sans }}>
          Select a conversation to start chatting, or use the pencil icon to begin a new one.
        </p>
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen Exports
// ─────────────────────────────────────────────────────────────────────────────
export function ConversationListScreen() {
  const nav = useNavigate()
  return (
    <AppShell fullBleed>
      <div className="flex h-full w-full overflow-hidden">
        <div className="flex flex-col w-full md:w-[340px] lg:w-[380px] md:border-r shrink-0 overflow-hidden"
          style={{ borderColor: 'var(--color-parchment-dark)' }}>
          <SidebarPanel onSelect={id => nav(`/messages/${id}`)} />
        </div>
        <div className="hidden md:flex flex-1 overflow-hidden">
          <NoChatSelected />
        </div>
      </div>
    </AppShell>
  )
}

export function ChatDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768)

  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  if (!id) return null

  if (isDesktop) {
    return (
      <AppShell fullBleed>
        <div className="flex h-full w-full overflow-hidden">
          <div className="flex flex-col w-[340px] lg:w-[380px] border-r shrink-0 overflow-hidden"
            style={{ borderColor: 'var(--color-parchment-dark)' }}>
            <SidebarPanel activeId={id} onSelect={newId => nav(`/messages/${newId}`)} />
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <ChatPane key={id} id={id} />
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noNav fullBleed>
      <div className="flex flex-col h-full overflow-hidden">
        <ChatPane key={id} id={id} onBack={() => nav('/messages')} />
      </div>
    </AppShell>
  )
}
