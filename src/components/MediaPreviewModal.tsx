import { C, FONT } from './tokens'
import type { AIPhotoInspectionResult } from '../api/geminiAI'

// Full-screen "see it in full, with all its details" viewer for one evidence
// item — reachable by clicking ANY thumbnail in MilestoneSubmitScreen's
// gallery, including the AI-inspected one (previously the AI result only
// ever showed inline, small, next to a fixed-size thumbnail; this gives it
// the same full-size treatment as every other item). Mirrors the mobile
// MediaPreviewModal's layout and shown fields exactly.
export interface PreviewableMedia {
  previewUrl: string
  mediaType: 'photo' | 'video'
  captureSource: 'ar_camera' | 'gallery_upload'
  capturedAt?: string
  geotagLat?: number
  geotagLng?: number
  placeName?: string
  aiResult?: AIPhotoInspectionResult | null
  aiAnalysing?: boolean
}

const VERDICT_CONFIG = {
  pass: { color: '#1a7a4a', label: '✓ AI Inspection Passed' },
  flag: { color: '#b45309', label: '⚠ Flagged — Manual Review' },
  fail: { color: '#b91c1c', label: '✕ AI Inspection Failed' },
}

const SEVERITY_ICON = { ok: '✓', warning: '⚠', critical: '✕' }

export function MediaPreviewModal({ media, onClose }: { media: PreviewableMedia | null; onClose: () => void }) {
  if (!media) return null
  const verdict = media.aiResult ? VERDICT_CONFIG[media.aiResult.verdict] : null

  return (
    <div className="fixed inset-0 z-[950] overflow-y-auto" style={{ background: C.cream }}>
      <div className="flex justify-end p-4 sticky top-0" style={{ background: C.cream }}>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: C.parchment }}
          aria-label="Close preview"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2L14 14M14 2L2 14" stroke={C.ink} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div style={{ background: '#000' }} className="flex items-center justify-center">
        {media.mediaType === 'video' ? (
          <video src={media.previewUrl} controls autoPlay className="max-h-[70vh] w-full" />
        ) : (
          <img src={media.previewUrl} alt="Evidence" className="max-h-[70vh] w-full object-contain" />
        )}
      </div>

      <div className="p-5 space-y-3.5 max-w-xl mx-auto">
        <div className="flex items-center gap-2">
          <span style={{ color: C.forest }}>{media.captureSource === 'ar_camera' ? '📷' : '🖼'}</span>
          <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">
            {media.captureSource === 'ar_camera' ? 'Captured live with the AR camera' : 'Uploaded from gallery'}
          </span>
        </div>

        {media.capturedAt && (
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs">
            🕐 {new Date(media.capturedAt).toLocaleString()}
          </div>
        )}

        {(media.placeName || (media.geotagLat != null && media.geotagLng != null)) && (
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-xs">
            📍 {media.placeName || `${media.geotagLat!.toFixed(5)}, ${media.geotagLng!.toFixed(5)}`}
          </div>
        )}

        {media.aiAnalysing && (
          <div className="rounded-xl p-3" style={{ background: C.forest + '15' }}>
            <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">Gemini AI is inspecting this photo…</span>
          </div>
        )}

        {media.aiResult && verdict && (
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: verdict.color + '33' }}>
            <div className="flex items-center justify-between p-3" style={{ background: verdict.color + '18' }}>
              <span style={{ fontFamily: FONT.sans, color: verdict.color }} className="text-sm font-semibold">{verdict.label}</span>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ border: `2.5px solid ${verdict.color}`, fontFamily: FONT.serif, color: verdict.color }}
              >
                {media.aiResult.score}
              </div>
            </div>
            <div className="p-3" style={{ background: C.white }}>
              <p style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm">{media.aiResult.summary}</p>
            </div>
            {media.aiResult.findings.length > 0 && (
              <div className="p-3 space-y-1.5" style={{ background: C.parchment }}>
                {media.aiResult.findings.map((f, i) => (
                  <div key={i} style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">
                    {SEVERITY_ICON[f.severity]} <strong>{f.label}</strong> — {f.detail}
                  </div>
                ))}
              </div>
            )}
            {media.aiResult.fraudFlags.length > 0 && (
              <div className="p-3" style={{ background: 'var(--status-error-bg)' }}>
                {media.aiResult.fraudFlags.map((f, i) => (
                  <div key={i} style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }} className="text-xs">🚨 {f}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
