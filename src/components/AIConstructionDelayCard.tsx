import { useState } from 'react'
import { C, FONT } from './MobileLayout'
import { predictConstructionDelay, type WeatherRiskAnalysis } from '../utils/constructionDelayPredictor'
import { fmt } from '../context'

interface Props {
  regionName?: string
  milestoneType?: 'foundation' | 'framing' | 'roofing' | 'finishing'
  className?: string
}

const RISK_CONFIG: Record<WeatherRiskAnalysis['riskLevel'], { color: string; bg: string; badge: string }> = {
  Low: { color: '#0F7A52', bg: '#dcfce7', badge: '✓ Low Weather Risk' },
  Medium: { color: '#C9971E', bg: '#fef3c7', badge: '⚠ Moderate Rainfall Risk' },
  High: { color: '#ea580c', bg: '#ffedd5', badge: '⛈ High Rain Season Delay' },
  Severe: { color: '#b91c1c', bg: '#fee2e2', badge: '🚨 Severe Monsoon Delay Risk' },
}

export function AIConstructionDelayCard({
  regionName = 'Centre',
  milestoneType = 'foundation',
  className = '',
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())

  const analysis = predictConstructionDelay(regionName, milestoneType, selectedMonth)
  const cfg = RISK_CONFIG[analysis.riskLevel]

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className={`rounded-3xl border overflow-hidden shadow-sm bg-white ${className}`} style={{ borderColor: C.parchmentDark }}>
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <span className="text-base">🌦️</span>
          <div>
            <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm">
              AI Rainy Season Delay Forecast
            </div>
            <div style={{ fontFamily: FONT.mono }} className="text-[10px] text-slate-400">
              Cameroon Civil Meteorological Intelligence
            </div>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: cfg.bg, color: cfg.color, fontFamily: FONT.mono }}>
          {cfg.badge}
        </div>
      </div>

      {/* Month Selector Bar */}
      <div className="px-4 py-3 bg-slate-50 border-b flex gap-1.5 overflow-x-auto" style={{ borderColor: C.parchmentDark }}>
        {months.map((m, idx) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(idx)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
              selectedMonth === idx ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-600 hover:bg-slate-200 border'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Metric Tiles */}
      <div className="p-4 grid grid-cols-3 gap-3 border-b bg-amber-50/20" style={{ borderColor: C.parchmentDark }}>
        <div className="p-2.5 rounded-2xl bg-white border" style={{ borderColor: C.parchmentDark }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider">
            Rainfall Index
          </div>
          <div style={{ fontFamily: FONT.serif }} className="text-base font-bold text-slate-900 mt-0.5">
            {analysis.monthlyRainfallMm} mm/mo
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-white border" style={{ borderColor: C.parchmentDark }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider">
            Predicted Delay
          </div>
          <div style={{ fontFamily: FONT.serif, color: cfg.color }} className="text-base font-bold mt-0.5">
            +{analysis.predictedDelayDays} Days
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-white border" style={{ borderColor: C.parchmentDark }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider">
            Escrow Buffer
          </div>
          <div style={{ fontFamily: FONT.serif, color: C.forest }} className="text-base font-bold mt-0.5">
            {fmt(analysis.recommendedEscrowBufferXaf)}
          </div>
        </div>
      </div>

      {/* Curing & Supply Chain Notes */}
      <div className="p-4 space-y-3">
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-1">
            Concrete Curing & Technical Analysis
          </div>
          <p style={{ fontFamily: FONT.sans, color: C.ink }} className="text-xs leading-relaxed">
            {analysis.curingVulnerability}
          </p>
        </div>

        {/* Actionable Mitigations List */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-1.5">
            Recommended Civil Mitigations
          </div>
          <div className="space-y-1.5">
            {analysis.mitigationTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>
                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
