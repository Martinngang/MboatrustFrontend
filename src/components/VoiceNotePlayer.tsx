import { useState, useEffect } from 'react'
import { C, FONT } from './MobileLayout'

interface Props {
  senderName?: string
  senderRole?: string
  durationSeconds?: number
  audioUrl?: string
  createdAt?: string
  className?: string
}

export function VoiceNotePlayer({
  senderName = 'Emmanuel Njang (Contractor)',
  senderRole = 'Site Foreman',
  durationSeconds = 42,
  createdAt = 'Today, 10:15 AM',
  className = '',
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSec, setCurrentSec] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1)

  // Waveform bars simulation
  const bars = [4, 8, 14, 18, 12, 6, 16, 22, 18, 10, 14, 20, 24, 16, 8, 12, 18, 14, 6, 10, 16, 22, 12, 8]

  useEffect(() => {
    let timer: any
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentSec((prev) => {
          if (prev >= durationSeconds) {
            setIsPlaying(false)
            return 0
          }
          return prev + 1 * playbackSpeed
        })
      }, 1000 / playbackSpeed)
    }
    return () => clearInterval(timer)
  }, [isPlaying, durationSeconds, playbackSpeed])

  const togglePlay = () => {
    setIsPlaying((p) => !p)
  }

  const cycleSpeed = () => {
    setPlaybackSpeed((s) => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))
  }

  const progressPercent = Math.min(100, (currentSec / durationSeconds) * 100)

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div
      className={`rounded-2xl p-3 border shadow-sm flex flex-col gap-2.5 max-w-sm ${className}`}
      style={{ background: C.cream, borderColor: C.parchmentDark }}
    >
      {/* Header Info */}
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: C.forest }}>
            🎙️
          </div>
          <div>
            <div style={{ fontFamily: FONT.sans }} className="font-semibold text-slate-900 leading-tight">
              {senderName}
            </div>
            <div style={{ fontFamily: FONT.mono }} className="text-[9px] text-slate-500">
              {senderRole} · {createdAt}
            </div>
          </div>
        </div>

        {/* Speed Switcher */}
        <button
          onClick={cycleSpeed}
          className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all"
        >
          {playbackSpeed}x
        </button>
      </div>

      {/* Waveform & Player Row */}
      <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-100">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md transition-all active:scale-95 flex-shrink-0"
          style={{ background: isPlaying ? C.amber : C.forest }}
        >
          {isPlaying ? (
            <span className="text-xs font-bold">❚❚</span>
          ) : (
            <span className="text-xs font-bold ml-0.5">▶</span>
          )}
        </button>

        {/* Dynamic Waveform Bars */}
        <div className="flex-1 flex items-center gap-1 h-8 overflow-hidden cursor-pointer" onClick={togglePlay}>
          {bars.map((bHeight, idx) => {
            const barProgress = (idx / bars.length) * 100
            const active = barProgress <= progressPercent
            return (
              <div
                key={idx}
                className="w-1 rounded-full transition-all"
                style={{
                  height: bHeight,
                  background: active ? C.forest : '#CBD5E1',
                  transform: isPlaying && active ? 'scaleY(1.15)' : 'scaleY(1)',
                }}
              />
            )
          })}
        </div>

        {/* Duration Timer */}
        <div style={{ fontFamily: FONT.mono }} className="text-xs font-bold text-slate-600 min-w-[36px] text-right">
          {isPlaying ? formatTime(currentSec) : formatTime(durationSeconds)}
        </div>
      </div>
    </div>
  )
}
