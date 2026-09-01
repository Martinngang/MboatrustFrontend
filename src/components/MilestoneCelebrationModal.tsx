import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { C, FONT, PillButton } from './MobileLayout'
import { fmt } from '../context'

interface Props {
  isOpen: boolean
  milestoneTitle: string
  amountXaf: number
  projectName: string
  contractorName: string
  onClose: () => void
  onShareWhatsApp?: () => void
}

export function MilestoneCelebrationModal({
  isOpen,
  milestoneTitle,
  amountXaf,
  projectName,
  contractorName,
  onClose,
  onShareWhatsApp,
}: Props) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number }[]>([])

  useEffect(() => {
    if (isOpen) {
      const colors = ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#F43F5E']
      const p = Array.from({ length: 36 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 320,
        y: -Math.random() * 240 - 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        delay: Math.random() * 0.4,
      }))
      setParticles(p)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border text-center flex flex-col items-center gap-4 overflow-hidden"
          style={{ borderColor: C.parchmentDark }}
        >
          {/* Confetti Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  opacity: 0,
                  rotate: Math.random() * 360,
                }}
                transition={{ duration: 1.6, delay: p.delay, ease: 'easeOut' }}
                className="absolute top-1/2 left-1/2 rounded-sm"
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                }}
              />
            ))}
          </div>

          {/* Animated Gold Trophy / Seal */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-xl border-4 border-amber-300"
            style={{ background: 'radial-gradient(circle, #FDE68A 0%, #D97706 100%)' }}
          >
            🏆
          </motion.div>

          {/* Title */}
          <div>
            <div style={{ fontFamily: FONT.mono }} className="text-[10px] uppercase tracking-widest text-emerald-800 font-bold">
              Milestone Escrow Released
            </div>
            <h2 style={{ fontFamily: FONT.serif }} className="text-xl font-bold text-slate-900 mt-1">
              Milestone Complete!
            </h2>
            <p style={{ fontFamily: FONT.sans }} className="text-xs text-slate-600 mt-1">
              {milestoneTitle}
            </p>
          </div>

          {/* Amount Badge */}
          <div className="w-full py-3 px-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div style={{ fontFamily: FONT.mono }} className="text-[9px] uppercase text-emerald-900 font-bold">
              Disbursed to {contractorName}
            </div>
            <div style={{ fontFamily: FONT.serif, color: C.forest }} className="text-xl font-bold mt-0.5">
              {fmt(amountXaf)}
            </div>
            <div style={{ fontFamily: FONT.mono }} className="text-[9px] text-slate-500 mt-0.5">
              {projectName} · BEAC Escrow Settled
            </div>
          </div>

          {/* Actions */}
          <div className="w-full space-y-2 pt-2">
            {onShareWhatsApp && (
              <PillButton onClick={onShareWhatsApp} fullWidth>
                📲 Share Celebration on WhatsApp
              </PillButton>
            )}
            <PillButton variant="ghost" onClick={onClose} fullWidth>
              Done
            </PillButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
