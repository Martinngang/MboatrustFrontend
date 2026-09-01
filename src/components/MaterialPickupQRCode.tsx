import { useState } from 'react'
import { C, FONT, PillButton } from './MobileLayout'
import { fmt } from '../context'

interface Props {
  orderId?: string
  orderNumber: string
  projectName: string
  supplierName: string
  totalAmount: number
  items: { name: string; quantity: number; unit: string }[]
  onClose?: () => void
}

export function MaterialPickupQRCode({
  orderNumber,
  projectName,
  supplierName,
  totalAmount,
  items,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false)
  const verificationCode = `MB-PICKUP-${orderNumber.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase()}`

  const copyCode = () => {
    navigator.clipboard.writeText(verificationCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border" style={{ borderColor: C.parchmentDark }}>
        {/* Header */}
        <div className="p-5 text-center text-white" style={{ background: C.forestDark }}>
          <div style={{ fontFamily: FONT.mono }} className="text-[10px] uppercase tracking-widest text-emerald-200">
            Material Pickup Voucher
          </div>
          <div style={{ fontFamily: FONT.serif }} className="text-xl font-bold mt-1">
            {supplierName}
          </div>
          <div style={{ fontFamily: FONT.sans }} className="text-xs text-white/80 mt-0.5">
            {projectName}
          </div>
        </div>

        {/* QR Code Card */}
        <div className="p-6 flex flex-col items-center gap-4 bg-amber-50/40">
          <div className="p-4 bg-white rounded-2xl shadow-md border-2 border-dashed flex flex-col items-center" style={{ borderColor: C.forest }}>
            {/* Visual SVG QR Matrix */}
            <svg width="180" height="180" viewBox="0 0 180 180" className="w-44 h-44">
              <rect width="180" height="180" fill="#FFFFFF" rx="8" />
              {/* Position Detection Patterns */}
              {/* Top-Left */}
              <rect x="15" y="15" width="45" height="45" fill="#0A5B3D" rx="6" />
              <rect x="23" y="23" width="29" height="29" fill="#FFFFFF" rx="4" />
              <rect x="29" y="29" width="17" height="17" fill="#0A5B3D" rx="2" />

              {/* Top-Right */}
              <rect x="120" y="15" width="45" height="45" fill="#0A5B3D" rx="6" />
              <rect x="128" y="23" width="29" height="29" fill="#FFFFFF" rx="4" />
              <rect x="134" y="29" width="17" height="17" fill="#0A5B3D" rx="2" />

              {/* Bottom-Left */}
              <rect x="15" y="120" width="45" height="45" fill="#0A5B3D" rx="6" />
              <rect x="23" y="128" width="29" height="29" fill="#FFFFFF" rx="4" />
              <rect x="29" y="134" width="17" height="17" fill="#0A5B3D" rx="2" />

              {/* Data Matrix Dots */}
              <rect x="70" y="20" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="90" y="20" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="80" y="35" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="100" y="35" width="10" height="10" fill="#0A5B3D" rx="2" />
              
              <rect x="20" y="70" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="35" y="80" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="20" y="90" width="10" height="10" fill="#0A5B3D" rx="2" />

              <rect x="70" y="70" width="40" height="40" fill="#C9971E" rx="8" />
              <circle cx="90" cy="90" r="12" fill="#FFFFFF" />
              <path d="M85 90L89 94L96 86" stroke="#0A5B3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              <rect x="125" y="70" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="145" y="70" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="135" y="85" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="155" y="95" width="10" height="10" fill="#0A5B3D" rx="2" />

              <rect x="70" y="125" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="90" y="135" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="75" y="150" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="100" y="150" width="10" height="10" fill="#0A5B3D" rx="2" />

              <rect x="125" y="125" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="145" y="135" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="130" y="150" width="10" height="10" fill="#0A5B3D" rx="2" />
              <rect x="150" y="150" width="10" height="10" fill="#0A5B3D" rx="2" />
            </svg>

            <button
              onClick={copyCode}
              className="mt-3 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-mono font-bold text-gray-800 transition-all flex items-center gap-1.5"
            >
              <span>{verificationCode}</span>
              <span className="text-[10px] text-gray-500">{copied ? '✓ Copied' : 'Copy'}</span>
            </button>
          </div>

          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs text-center px-4 leading-relaxed">
            Present this QR code to the storekeeper at <strong>{supplierName}</strong> to verify and collect your materials without cash.
          </p>
        </div>

        {/* Bill of Materials Summary */}
        <div className="p-4 bg-white border-t border-b max-h-48 overflow-y-auto space-y-2" style={{ borderColor: C.parchmentDark }}>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">
            Authorized Items ({items.length})
          </div>
          {items.map((it, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-gray-100 last:border-0">
              <span style={{ fontFamily: FONT.sans, color: C.ink }}>{it.name}</span>
              <span style={{ fontFamily: FONT.mono, color: C.forest }} className="font-bold">
                {it.quantity} {it.unit}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 text-xs font-bold" style={{ fontFamily: FONT.sans, color: C.ink }}>
            <span>Escrow Value</span>
            <span style={{ color: C.forest }}>{fmt(totalAmount)}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-gray-50 flex gap-2">
          {onClose && (
            <PillButton onClick={onClose} fullWidth>
              Done / Close Voucher
            </PillButton>
          )}
        </div>
      </div>
    </div>
  )
}
