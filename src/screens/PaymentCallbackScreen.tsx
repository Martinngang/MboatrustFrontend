/**
 * PaymentCallbackScreen.tsx — Redirect callback page for Flutterwave/Orange Money payments
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell, PillButton } from '../components/MobileLayout'
import { C, FONT } from '../components/tokens'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export function PaymentCallbackScreen() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying')
  const txRef = params.get('tx_ref') || params.get('order_id') || params.get('pay_token')
  const rawStatus = params.get('status')

  useEffect(() => {
    // Simulate verification delay
    const timer = setTimeout(() => {
      if (rawStatus === 'cancelled' || rawStatus === 'failed') {
        setStatus('failed')
      } else {
        setStatus('success')
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [rawStatus])

  return (
    <AppShell noNav>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        {status === 'verifying' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 animate-spin mb-4" style={{ color: C.forest }} />
            <h2 style={{ fontFamily: FONT.serif }} className="text-xl font-bold mb-2">
              Verifying Payment...
            </h2>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              Please wait while we confirm your transaction status with the payment provider.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: C.forest }}>
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-2">
              Payment Confirmed
            </h1>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm max-w-sm mb-6">
              Your funds have been secured in escrow and logged into the audit ledger.
            </p>
            {txRef && (
              <div className="rounded-xl border p-3 w-full max-w-xs mb-6 font-mono text-xs" style={{ background: C.parchment, borderColor: C.parchmentDark }}>
                Reference: {txRef}
              </div>
            )}
            <PillButton onClick={() => nav('/home')} fullWidth>
              Return to Dashboard
            </PillButton>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-red-500/10">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold mb-2 text-red-600">
              Payment Cancelled or Failed
            </h1>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm max-w-sm mb-6">
              The payment process was not completed. No charges were made to your account.
            </p>
            <PillButton onClick={() => nav(-1)} fullWidth>
              Try Again
            </PillButton>
          </div>
        )}
      </div>
    </AppShell>
  )
}
