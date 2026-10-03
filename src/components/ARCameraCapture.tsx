import { useEffect, useRef, useState } from 'react'
import { C, FONT } from './tokens'

// Live camera + a HUD (text/graphic overlay shown ON SCREEN during capture,
// composited by React elements drawn on top of the <video> preview) — NOT
// true ARKit/ARCore 3D tracking, which the user explicitly declined
// (mobile-only, no web equivalent). The saved photo/video file itself is
// left completely untouched by the overlay; the HUD's content (project/
// milestone/time/place) instead travels alongside the file as the same
// structured fields already used for a gallery pick (see the `onCaptured`
// shape below) — strictly more useful to a reviewer than pixels burned into
// the image. Mirrors MboaTrustAPP/components/ARCameraCapture.tsx exactly
// (same props, same emitted shape) so both platforms behave identically.
//
// Feature-detected end to end: if `navigator.mediaDevices.getUserMedia` is
// missing (older browser, insecure/non-HTTPS context, camera denied),
// `onUnavailable` fires instead of rendering, so the caller
// (ContractorScreens.tsx's MilestoneSubmitScreen) falls back to the existing
// file-input gallery picker. Never assume this "just works" everywhere.
const MAX_VIDEO_SECONDS = 15

export interface CapturedMedia {
  file: File
  previewUrl: string
  mediaType: 'photo' | 'video'
  captureSource: 'ar_camera' | 'gallery_upload'
  capturedAt?: string
  geotagLat?: number
  geotagLng?: number
  placeName?: string
}

interface ARCameraCaptureProps {
  visible: boolean
  onClose: () => void
  onCaptured: (media: CapturedMedia) => void
  onUnavailable: () => void
  projectTitle: string
  milestoneName: string
  milestoneNumber: number
  geo: { lat: number; lng: number; label: string } | null
  placeName?: string | null
}

export function ARCameraCapture({
  visible,
  onClose,
  onCaptured,
  onUnavailable,
  projectTitle,
  milestoneName,
  milestoneNumber,
  geo,
  placeName,
}: ARCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<'picture' | 'video'>('picture')
  const [isRecording, setIsRecording] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(MAX_VIDEO_SECONDS)
  const [now, setNow] = useState(() => new Date())

  // Live clock — ticks every second while the HUD is on screen, purely
  // visual (not persisted; `capturedAt` is stamped fresh at the moment of
  // actual capture below).
  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [visible])

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => {
    if (!visible) {
      setReady(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        if (!('mediaDevices' in navigator) || !navigator.mediaDevices?.getUserMedia) {
          onUnavailable()
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: true,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setReady(true)
      } catch {
        // Denied, no camera, insecure context, or anything else unexpected —
        // never crash the submit flow over a camera that isn't there.
        if (!cancelled) onUnavailable()
      }
    })()
    return () => {
      cancelled = true
      stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const closeAndReset = () => {
    stopStream()
    setMode('picture')
    setIsRecording(false)
    setSecondsLeft(MAX_VIDEO_SECONDS)
    if (tickRef.current) clearInterval(tickRef.current)
    onClose()
  }

  const takePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `ar-evidence-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCaptured({
          file,
          previewUrl: URL.createObjectURL(blob),
          mediaType: 'photo',
          captureSource: 'ar_camera',
          capturedAt: new Date().toISOString(),
          geotagLat: geo?.lat,
          geotagLng: geo?.lng,
          placeName: placeName ?? undefined,
        })
        closeAndReset()
      },
      'image/jpeg',
      0.85,
    )
  }

  const startVideo = () => {
    const stream = streamRef.current
    if (!stream || isRecording) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType })
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const file = new File([blob], `ar-evidence-${Date.now()}.webm`, { type: 'video/webm' })
      onCaptured({
        file,
        previewUrl: URL.createObjectURL(blob),
        mediaType: 'video',
        captureSource: 'ar_camera',
        capturedAt: new Date().toISOString(),
        geotagLat: geo?.lat,
        geotagLng: geo?.lng,
        placeName: placeName ?? undefined,
      })
      closeAndReset()
    }
    recorder.start()
    setIsRecording(true)
    setSecondsLeft(MAX_VIDEO_SECONDS)
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          recorder.stop()
          if (tickRef.current) clearInterval(tickRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  const stopVideo = () => {
    recorderRef.current?.stop()
    if (tickRef.current) clearInterval(tickRef.current)
  }

  if (!visible) return null

  const dateLabel = now.toLocaleString()
  const locationLabel = placeName || (geo ? geo.label : 'Location unavailable')

  return (
    <div className="fixed inset-0 z-[999] bg-black" style={{ position: 'fixed', inset: 0 }}>
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        </div>
      )}

      {/* HUD overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-12 pointer-events-none">
        <div className="rounded-xl px-3.5 py-3" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div style={{ fontFamily: FONT.sans, color: '#fff' }} className="text-[15px] font-bold truncate">{projectTitle}</div>
          <div style={{ fontFamily: FONT.sans, color: '#E8E6E0' }} className="text-xs truncate">Milestone {milestoneNumber}: {milestoneName}</div>
          <div style={{ fontFamily: FONT.mono, color: '#E8E6E0' }} className="text-[11px] mt-1">{dateLabel}</div>
          <div style={{ fontFamily: FONT.mono, color: '#E8E6E0' }} className="text-[11px] truncate">📍 {locationLabel}</div>
        </div>
      </div>

      {isRecording && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: 'rgba(178,58,46,0.9)' }}>
          <span className="w-2 h-2 rounded-full bg-white" />
          <span style={{ fontFamily: FONT.sans, color: '#fff' }} className="text-xs font-bold">REC · 0:{String(secondsLeft).padStart(2, '0')}</span>
        </div>
      )}

      <button
        onClick={closeAndReset}
        className="absolute top-12 right-4 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        aria-label="Close camera"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 2L16 16M16 2L2 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-10 pt-5 flex flex-col items-center gap-4">
        {!isRecording && (
          <div className="flex rounded-full p-1 gap-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <button
              onClick={() => setMode('picture')}
              className="px-4 py-2 rounded-full text-xs font-semibold"
              style={{ background: mode === 'picture' ? '#fff' : 'transparent', color: mode === 'picture' ? '#111' : '#fff', fontFamily: FONT.sans }}
            >
              Photo
            </button>
            <button
              onClick={() => setMode('video')}
              className="px-4 py-2 rounded-full text-xs font-semibold"
              style={{ background: mode === 'video' ? '#fff' : 'transparent', color: mode === 'video' ? '#111' : '#fff', fontFamily: FONT.sans }}
            >
              Video
            </button>
          </div>
        )}

        <button
          onClick={mode === 'picture' ? takePhoto : isRecording ? stopVideo : startVideo}
          disabled={!ready}
          className="rounded-full flex items-center justify-center"
          style={{ width: 76, height: 76, border: '4px solid #fff', opacity: ready ? 1 : 0.4 }}
          aria-label={mode === 'picture' ? 'Take photo' : isRecording ? 'Stop recording' : 'Start recording'}
        >
          <span
            style={{
              width: isRecording ? 28 : 60,
              height: isRecording ? 28 : 60,
              borderRadius: isRecording ? 6 : 30,
              background: mode === 'video' ? C.seal : '#fff',
              display: 'block',
            }}
          />
        </button>
      </div>
    </div>
  )
}
