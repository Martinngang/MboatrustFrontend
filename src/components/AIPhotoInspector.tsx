import { useState, useCallback } from 'react'
import { C, FONT } from './MobileLayout'
import { inspectConstructionPhoto, type AIPhotoInspectionResult } from '../api/geminiAI'
import { useToast } from './Toast'

interface Props {
  label?: string
  onFileSelected?: (file: File) => void
  onAnalysisComplete?: (result: AIPhotoInspectionResult) => void
}

const VERDICT_CONFIG = {
  pass:  { bg: 'var(--status-success-bg)', text: 'var(--status-success)', label: '✓ AI Inspection Passed' },
  flag:  { bg: 'var(--status-warning-bg)', text: 'var(--status-warning)', label: '⚠ Flagged — Manual Review' },
  fail:  { bg: 'var(--status-error-bg)',   text: 'var(--status-error)',   label: '✕ AI Inspection Failed' },
}

const SEVERITY_COLOR = {
  ok:       C.inkSubtle,
  warning:  'var(--status-warning)',
  critical: 'var(--status-error)',
}

export function AIPhotoInspector({ label = 'Site Photo', onFileSelected, onAnalysisComplete }: Props) {
  const { show: showToast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [result, setResult] = useState<AIPhotoInspectionResult | null>(null)

  const handleFile = useCallback(async (selected: File) => {
    setFile(selected)
    setResult(null)

    const url = URL.createObjectURL(selected)
    setPreview(url)
    onFileSelected?.(selected)

    setAnalysing(true)
    try {
      const analysis = await inspectConstructionPhoto(selected)
      setResult(analysis)
      onAnalysisComplete?.(analysis)
    } catch {
      showToast({ title: 'AI analysis failed', description: 'Could not reach the AI service. The photo was still saved.', tone: 'error' })
    } finally {
      setAnalysing(false)
    }
  }, [onFileSelected, onAnalysisComplete, showToast])

  const verdict = result ? VERDICT_CONFIG[result.verdict] : null

  return (
    <div style={{ fontFamily: FONT.sans }}>
      {/* Upload zone */}
      <label
        style={{
          display: 'block',
          border: `2px dashed ${file ? C.forest : C.parchmentDark}`,
          borderRadius: 16,
          padding: file ? 0 : 32,
          background: file ? 'transparent' : C.parchment,
          cursor: 'pointer',
          overflow: 'hidden',
          textAlign: 'center',
          transition: 'border-color 0.2s',
        }}
      >
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {preview ? (
          <img src={preview} alt="Site photo preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }} />
        ) : (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <div style={{ color: C.inkMuted, fontSize: 14, fontFamily: FONT.sans }}>{label}</div>
            <div style={{ color: C.inkSubtle, fontSize: 11, fontFamily: FONT.mono, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
              Tap to upload · JPG or PNG
            </div>
          </>
        )}
      </label>

      {/* AI Loading shimmer */}
      {analysing && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(15,122,82,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 18, height: 18, border: `2px solid ${C.forest}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div>
            <div style={{ fontFamily: FONT.sans, fontWeight: 600, color: C.ink, fontSize: 13 }}>Gemini AI Inspecting…</div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle, fontSize: 10 }}>Analysing concrete, rebar, fraud indicators</div>
          </div>
        </div>
      )}

      {/* AI Result Card */}
      {result && verdict && (
        <div style={{ marginTop: 12, borderRadius: 14, overflow: 'hidden', border: `1.5px solid ${verdict.text}22` }}>
          {/* Verdict banner */}
          <div style={{ padding: '10px 14px', background: verdict.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: FONT.sans, fontWeight: 600, color: verdict.text, fontSize: 13 }}>{verdict.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: FONT.mono, color: verdict.text, fontSize: 11 }}>AI Score</span>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: `3px solid ${verdict.text}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT.serif, fontWeight: 700, color: verdict.text, fontSize: 13,
              }}>
                {result.score}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ padding: '10px 14px', background: C.white, borderBottom: `1px solid ${C.parchmentDark}` }}>
            <p style={{ fontFamily: FONT.sans, color: C.ink, fontSize: 13, margin: 0 }}>{result.summary}</p>
          </div>

          {/* Findings */}
          {result.findings.length > 0 && (
            <div style={{ padding: '10px 14px', background: C.parchment, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.findings.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, marginTop: 1 }}>
                    {f.severity === 'ok' ? '✓' : f.severity === 'warning' ? '⚠' : '✕'}
                  </span>
                  <div>
                    <div style={{ fontFamily: FONT.sans, fontWeight: 600, color: SEVERITY_COLOR[f.severity], fontSize: 12 }}>{f.label}</div>
                    <div style={{ fontFamily: FONT.sans, color: C.inkMuted, fontSize: 11 }}>{f.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fraud flags */}
          {result.fraudFlags.length > 0 && (
            <div style={{ padding: '8px 14px', background: 'var(--status-error-bg)' }}>
              <div style={{ fontFamily: FONT.sans, fontWeight: 600, color: 'var(--status-error)', fontSize: 12, marginBottom: 4 }}>🚨 Fraud Indicators Detected</div>
              {result.fraudFlags.map((f, i) => (
                <div key={i} style={{ fontFamily: FONT.sans, color: 'var(--status-error)', fontSize: 11 }}>• {f}</div>
              ))}
            </div>
          )}

          {/* GPS note */}
          {result.gpsNote && (
            <div style={{ padding: '6px 14px', background: C.parchmentDark }}>
              <span style={{ fontFamily: FONT.mono, color: C.inkMuted, fontSize: 10 }}>📍 {result.gpsNote}</span>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
