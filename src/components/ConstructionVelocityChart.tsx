import { C, FONT } from './MobileLayout'
import { fmt } from '../context'

interface Props {
  totalBudgetXaf: number
  disbursedXaf: number
  physicalProgressPercent: number
  totalDurationDays: number
  elapsedDays: number
  projectName?: string
  className?: string
}

export function ConstructionVelocityChart({
  totalBudgetXaf = 18500000,
  disbursedXaf = 11000000,
  physicalProgressPercent = 65,
  totalDurationDays = 120,
  elapsedDays = 70,
  projectName,
  className = '',
}: Props) {
  const financialPercent = Math.min(100, Math.round((disbursedXaf / totalBudgetXaf) * 100))
  const timePercent = Math.min(100, Math.round((elapsedDays / totalDurationDays) * 100))

  // Construction velocity health index
  // Health is optimal when Physical Progress >= Financial Disbursed % (i.e. not burning money ahead of work)
  const isHealthy = physicalProgressPercent >= financialPercent - 5

  return (
    <div
      className={`rounded-3xl p-5 border shadow-sm flex flex-col gap-4 bg-white ${className}`}
      style={{ borderColor: C.parchmentDark }}
    >
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-lg">📈</span>
          <div>
            <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm text-slate-900">
              Cash Burn-Down & Velocity Chart
            </div>
            <div style={{ fontFamily: FONT.mono }} className="text-[10px] text-slate-500">
              {projectName ? `${projectName} · ` : ''}Financial Disbursement vs Physical Site Pace
            </div>
          </div>
        </div>

        <div
          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
            isHealthy ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
          }`}
        >
          {isHealthy ? '✓ Healthy Velocity' : '⚠ Capital Advance'}
        </div>
      </div>

      {/* Progress Multi-Bar Comparison */}
      <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border" style={{ borderColor: C.parchmentDark }}>
        {/* 1. Physical Site Progress */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ fontFamily: FONT.sans }} className="font-semibold text-slate-700">
              🏗️ Physical Construction Completed
            </span>
            <span style={{ fontFamily: FONT.mono }} className="font-bold text-emerald-700">
              {physicalProgressPercent}%
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${physicalProgressPercent}%` }} />
          </div>
        </div>

        {/* 2. Escrow Capital Disbursed */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ fontFamily: FONT.sans }} className="font-semibold text-slate-700">
              💰 Escrow Capital Disbursed ({fmt(disbursedXaf)})
            </span>
            <span style={{ fontFamily: FONT.mono }} className="font-bold text-amber-700">
              {financialPercent}%
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${financialPercent}%` }} />
          </div>
        </div>

        {/* 3. Schedule Time Elapsed */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ fontFamily: FONT.sans }} className="font-semibold text-slate-700">
              ⏱️ Contract Duration Elapsed ({elapsedDays}/{totalDurationDays} Days)
            </span>
            <span style={{ fontFamily: FONT.mono }} className="font-bold text-blue-700">
              {timePercent}%
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${timePercent}%` }} />
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex justify-between items-center text-xs pt-1 border-t" style={{ borderColor: C.parchmentDark }}>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">
          Remaining Escrow: <span className="font-bold text-slate-900">{fmt(totalBudgetXaf - disbursedXaf)}</span>
        </div>
        <div style={{ fontFamily: FONT.mono }} className="text-[10px] text-emerald-800 font-bold">
          Est. Handover: {totalDurationDays - elapsedDays} Days Remaining
        </div>
      </div>
    </div>
  )
}
