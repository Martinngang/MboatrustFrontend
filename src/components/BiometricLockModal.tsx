import { useState } from 'react'
import { C, FONT } from './MobileLayout'

interface Props {
  isOpen: boolean
  title?: string
  subtitle?: string
  onSuccess: () => void
  onCancel?: () => void
}

export function BiometricLockModal({
  isOpen,
  title = 'Authorize Escrow Security PIN',
  subtitle = 'Enter your 4-digit diaspora security PIN or use Face ID',
  onSuccess,
  onCancel,
}: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [biometricScanning, setBiometricScanning] = useState(false)

  if (!isOpen) return null

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit
      setPin(newPin)
      setError(false)
      if (newPin.length === 4) {
        // Verification simulation (Demo PIN is 1234 or any 4 digits)
        setTimeout(() => {
          onSuccess()
          setPin('')
        }, 300)
      }
    }
  }

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1))
    setError(false)
  }

  const handleBiometricAuth = () => {
    setBiometricScanning(true)
    setTimeout(() => {
      setBiometricScanning(false)
      onSuccess()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div
        className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl border flex flex-col items-center gap-5"
        style={{ borderColor: C.parchmentDark }}
      >
        {/* Shield Icon */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl shadow-lg" style={{ background: C.forestDark }}>
          🔒
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <div style={{ fontFamily: FONT.serif }} className="text-lg font-bold text-slate-900">
            {title}
          </div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">
            {subtitle}
          </p>
        </div>

        {/* 4 PIN Dots */}
        <div className="flex gap-4 my-2">
          {[0, 1, 2, 3].map((idx) => {
            const filled = pin.length > idx
            return (
              <div
                key={idx}
                className="w-4 h-4 rounded-full transition-all border-2"
                style={{
                  background: filled ? C.forest : 'transparent',
                  borderColor: error ? C.seal : C.forest,
                  transform: filled ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            )
          })}
        </div>

        {/* 12-Key Pad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-lg font-bold text-slate-800 transition-all shadow-sm"
              style={{ fontFamily: FONT.mono }}
            >
              {d}
            </button>
          ))}

          {/* Biometric Button */}
          <button
            onClick={handleBiometricAuth}
            className="h-14 rounded-2xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-lg flex items-center justify-center transition-all border border-emerald-200"
            title="Use Face ID"
          >
            {biometricScanning ? '⏳' : '👤'}
          </button>

          {/* Zero */}
          <button
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-lg font-bold text-slate-800 transition-all shadow-sm"
            style={{ fontFamily: FONT.mono }}
          >
            0
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-sm font-bold text-slate-600 transition-all shadow-sm flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        {/* Cancel option */}
        {onCancel && (
          <button onClick={onCancel} className="text-xs font-semibold text-slate-500 hover:text-slate-700 mt-1">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
