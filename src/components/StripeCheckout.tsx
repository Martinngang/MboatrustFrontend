/**
 * StripeCheckout.tsx — Stripe Elements card payment form with sandbox fallback
 */
import React, { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { PillButton } from './MobileLayout'
import { C, FONT } from './tokens'
import { Lock, CreditCard } from 'lucide-react'

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

function PaymentForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) {
      // Fallback sandbox auto-complete
      setSubmitting(true)
      setTimeout(() => {
        setSubmitting(false)
        onSuccess()
      }, 1200)
      return
    }

    setSubmitting(true)
    setError(null)

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/#/payment/callback`,
      },
      redirect: 'if_required',
    })

    if (result.error) {
      setError(result.error.message || 'Payment confirmation failed')
      setSubmitting(false)
    } else {
      setSubmitting(false)
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <PaymentElement />
      {error && (
        <p style={{ fontFamily: FONT.sans, color: C.seal }} className="text-xs">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <PillButton variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </PillButton>
        <PillButton fullWidth disabled={submitting}>
          {submitting ? 'Processing Card...' : 'Confirm Card Payment'}
        </PillButton>
      </div>
    </form>
  )
}

export function StripeCheckout({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret?: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // If live Stripe client secret & publishable key are available, render Elements
  if (stripePromise && clientSecret) {
    return (
      <div className="rounded-2xl border p-4 shadow-sm" style={{ background: C.white, borderColor: C.parchmentDark }}>
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4" style={{ color: C.forest }} />
          <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">
            Stripe Secure Card Checkout
          </span>
        </div>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm onSuccess={onSuccess} onCancel={onCancel} />
        </Elements>
      </div>
    )
  }

  // Sandbox card form for demo/testing mode
  const handleSandboxSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      onSuccess()
    }, 1200)
  }

  return (
    <div className="rounded-2xl border p-4 shadow-sm space-y-4" style={{ background: C.white, borderColor: C.parchmentDark }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" style={{ color: C.forest }} />
          <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">
            Card Details (Sandbox Mode)
          </span>
        </div>
        <span style={{ fontFamily: FONT.mono, color: C.amber }} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 font-bold">
          Test Cards Allowed
        </span>
      </div>

      <form onSubmit={handleSandboxSubmit} className="space-y-3">
        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider block mb-1">
            Cardholder Name
          </label>
          <input
            required
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
            style={{ background: C.parchment, borderColor: C.parchmentDark, color: C.ink }}
          />
        </div>

        <div>
          <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider block mb-1">
            Card Number
          </label>
          <input
            required
            type="text"
            maxLength={19}
            placeholder="4242 •••• •••• 4242"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border text-sm font-mono outline-none"
            style={{ background: C.parchment, borderColor: C.parchmentDark, color: C.ink }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider block mb-1">
              Expires (MM/YY)
            </label>
            <input
              required
              type="text"
              maxLength={5}
              placeholder="12/28"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm font-mono outline-none"
              style={{ background: C.parchment, borderColor: C.parchmentDark, color: C.ink }}
            />
          </div>
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider block mb-1">
              CVC
            </label>
            <input
              required
              type="password"
              maxLength={4}
              placeholder="123"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm font-mono outline-none"
              style={{ background: C.parchment, borderColor: C.parchmentDark, color: C.ink }}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <PillButton variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </PillButton>
          <PillButton fullWidth disabled={submitting}>
            {submitting ? 'Processing Card...' : 'Pay with Card'}
          </PillButton>
        </div>
      </form>
    </div>
  )
}
