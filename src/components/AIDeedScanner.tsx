import { useState, useCallback } from 'react'
import { C, FONT } from './MobileLayout'
import { scanLandTitleDeed, type AIDeedScanResult } from '../api/geminiAI'
import { useToast } from './Toast'

interface Props {
  onFileSelected?: (file: File) => void
  onScanComplete?: (result: AIDeedScanResult) => void
}

const ALERT_TYPE_CONFIG = {
  ok:            { icon: '✓', color: 'var(--status-success)' },
  missing_stamp: { icon: '⚠', color: 'var(--status-warning)' },
  mismatch:      { icon: '✕', color: 'var(--status-error)' },
  date_anomaly:  { icon: '⚠', color: 'var(--status-warning)' },
  low_confidence:{ icon: 'ℹ', color: C.inkMuted },
}

function AuthenticityBar({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--status-success)' : score >= 55 ? 'var(--status-warning)' : 'var(--status-error)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 4, background: C.parchmentDark, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontFamily: FONT.mono, fontSize: 12, color, minWidth: 36 }}>{score}/100</span>
    </div>
  )
}

export function AIDeedScanner({ onFileSelected, onScanComplete }: Props) {
  const { show: showToast } = useToast()
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<AIDeedScanResult | null>(null)

  const handleFile = useCallback(async (selected: File) => {
    setResult(null)
    const url = URL.createObjectURL(selected)
    setPreview(url)
    onFileSelected?.(selected)

    setScanning(true)
    try {
      const analysis = await scanLandTitleDeed(selected)
      setResult(analysis)
      onScanComplete?.(analysis)
    } catch {
      showToast({ title: 'AI scan failed', description: 'Could not reach the AI service. Please enter deed fields manually.', tone: 'error' })
    } finally {
      setScanning(false)
    }
  }, [onFileSelected, onScanComplete, showToast])

  return (
    <div style={{ fontFamily: FONT.sans }}>
      {/* Upload zone */}
      <label style={{
        display: 'block', border: `2px dashed ${preview ? C.forest : C.parchmentDark}`,
        borderRadius: 16, padding: preview ? 0 : 32, background: preview ? 'transparent' : C.parchment,
        cursor: 'pointer', overflow: 'hidden', textAlign: 'center', transition: 'border-color 0.2s',
      }}>
        <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {preview ? (
          <img src={preview} alt="Deed document preview"
            style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
        ) : (
          <>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
            <div style={{ color: C.inkMuted, fontSize: 14 }}>Upload Titre Foncier or Cadastral Plan</div>
            <div style={{ color: C.inkSubtle, fontSize: 11, fontFamily: FONT.mono, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
              JPG, PNG or PDF · AI will extract all fields
            </div>
          </>
        )}
      </label>

      {/* Scanning indicator */}
      {scanning && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(15,122,82,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 18, height: 18, border: `2px solid ${C.forest}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div>
            <div style={{ fontFamily: FONT.sans, fontWeight: 600, color: C.ink, fontSize: 13 }}>Gemini AI Scanning Deed…</div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle, fontSize: 10 }}>Extracting title number, plot area, stamps, beacons</div>
          </div>
        </div>
      )}

      {/* Extracted Fields Card */}
      {result && (
        <div style={{ marginTop: 12, borderRadius: 14, border: `1.5px solid ${C.parchmentDark}`, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '10px 14px', background: C.forest, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: FONT.sans, fontWeight: 600, color: '#fff', fontSize: 13 }}>📑 AI Deed Extraction</div>
            <span style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Gemini 2.0 Flash</span>
          </div>

          {/* Authenticity Score */}
          <div style={{ padding: '10px 14px', background: C.parchment, borderBottom: `1px solid ${C.parchmentDark}` }}>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>
              Document Authenticity Score
            </div>
            <AuthenticityBar score={result.authenticityScore} />
          </div>

          {/* Extracted Fields */}
          <div style={{ padding: '12px 14px', background: C.white, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Title Number (Numéro TF)', value: result.titleNumber },
              { label: 'Conservation Foncière Office', value: result.conservationOffice },
              { label: 'Registered Owner', value: result.ownerName },
              { label: 'Plot Area', value: result.plotAreaSqm ? `${result.plotAreaSqm.toLocaleString('fr-FR')} m²` : null },
              { label: 'Beacon Coordinates (Bornes)', value: result.beaconCoordinates },
              { label: 'Registration Date', value: result.registrationDate },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, borderBottom: `1px solid ${C.parchmentDark}`, paddingBottom: 6 }}>
                <span style={{ fontFamily: FONT.mono, color: C.inkSubtle, textTransform: 'uppercase' as const, letterSpacing: 0.5, fontSize: 10 }}>{label}</span>
                <span style={{ fontFamily: FONT.sans, fontWeight: 600, color: value ? C.ink : C.inkSubtle, textAlign: 'right' as const, maxWidth: '60%' }}>
                  {value ?? '— not detected'}
                </span>
              </div>
            ))}
          </div>

          {/* Alerts */}
          {result.alerts.length > 0 && (
            <div style={{ padding: '10px 14px', background: C.parchment, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {result.alerts.map((a, i) => {
                const cfg = ALERT_TYPE_CONFIG[a.type]
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: cfg.color, fontSize: 14 }}>{cfg.icon}</span>
                    <span style={{ fontFamily: FONT.sans, color: C.inkMuted, fontSize: 11 }}>{a.message}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
