import { useState } from 'react'
import { C, FONT, PillButton } from './MobileLayout'
import { fmt } from '../context'

interface Props {
  projectName: string
  locationName: string
  currentMilestone: string
  milestoneIndex: number
  totalMilestones: number
  completionPercent: number
  totalBudgetXaf: number
  contractorName: string
  verifierName?: string
  className?: string
}

export function WhatsAppShareCard({
  projectName,
  locationName,
  currentMilestone,
  milestoneIndex,
  totalMilestones,
  completionPercent,
  totalBudgetXaf,
  contractorName,
  verifierName = 'Dr. Christian Nguema (ONGC #884)',
  className = '',
}: Props) {
  const [copied, setCopied] = useState(false)

  const shareText = `🏗️ *MboaTrust Project Progress Update*
🏠 *Project:* ${projectName} (${locationName})
📊 *Progress:* Milestone ${milestoneIndex}/${totalMilestones} (${completionPercent}%)
✅ *Completed:* ${currentMilestone}
👷 *Contractor:* ${contractorName}
🔍 *Civil Verification:* ${verifierName}
💰 *Protected Escrow:* ${fmt(totalBudgetXaf)}

🔒 _Secured & verified by MboaTrust Escrow Platform_`

  const handleShare = () => {
    const encoded = encodeURIComponent(shareText)
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div
      className={`rounded-3xl p-5 border shadow-sm flex flex-col gap-4 bg-white ${className}`}
      style={{ borderColor: C.parchmentDark }}
    >
      {/* WhatsApp Header Badge */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">
            💬
          </div>
          <div>
            <div style={{ fontFamily: FONT.serif }} className="font-bold text-sm text-slate-900">
              WhatsApp Family Progress Card
            </div>
            <div style={{ fontFamily: FONT.mono }} className="text-[10px] text-slate-400">
              1-Tap Branded Status Update
            </div>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold">
          {completionPercent}% Done
        </div>
      </div>

      {/* Card Preview Box */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5 text-xs font-sans shadow-inner">
        <div style={{ fontFamily: FONT.mono }} className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
          MboaTrust Verified Update
        </div>
        <div className="font-bold text-sm text-white">{projectName}</div>
        <div className="text-slate-300">
          📍 {locationName} · Milestone {milestoneIndex} of {totalMilestones}
        </div>
        <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200">
          <span className="text-emerald-400 font-bold">✓ Current Phase:</span> {currentMilestone}
        </div>
        <div className="text-[10px] text-slate-400 flex justify-between">
          <span>👷 {contractorName}</span>
          <span>🔍 {verifierName}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <PillButton onClick={handleShare} fullWidth>
          📲 Send to WhatsApp Group
        </PillButton>
        <PillButton variant="secondary" onClick={handleCopy}>
          {copied ? 'Copied! ✓' : 'Copy Text'}
        </PillButton>
      </div>
    </div>
  )
}
