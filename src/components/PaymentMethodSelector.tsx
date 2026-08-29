/**
 * PaymentMethodSelector.tsx — Brand-styled payment method selector
 * Supporting MTN MoMo, Orange Money, Stripe Card, and Flutterwave.
 */
import { CreditCard, Globe, ShieldCheck } from 'lucide-react'
import { C, FONT } from './tokens'

export type PaymentMethodId = 'mtn_momo' | 'orange_money' | 'stripe' | 'flutterwave'

export interface PaymentOption {
  id: PaymentMethodId
  label: string
  subtitle: string
  badge?: string
  brandColor: string
  icon: 'momo' | 'om' | 'stripe' | 'flw'
  requiresPhone: boolean
}

const ALL_OPTIONS: Record<PaymentMethodId, PaymentOption> = {
  mtn_momo: {
    id: 'mtn_momo',
    label: 'MTN Mobile Money',
    subtitle: 'Instant direct prompt via Cameroon MSISDN',
    badge: 'Local • XAF',
    brandColor: '#FFCC00',
    icon: 'momo',
    requiresPhone: true,
  },
  orange_money: {
    id: 'orange_money',
    label: 'Orange Money',
    subtitle: 'Secure WebPay authorization code',
    badge: 'Local • XAF',
    brandColor: '#FF6600',
    icon: 'om',
    requiresPhone: true,
  },
  stripe: {
    id: 'stripe',
    label: 'Credit / Debit Card (Stripe)',
    subtitle: 'Visa, Mastercard, AMEX — Instant processing',
    badge: 'Diaspora • EUR/USD',
    brandColor: '#635BFF',
    icon: 'stripe',
    requiresPhone: false,
  },
  flutterwave: {
    id: 'flutterwave',
    label: 'Flutterwave International',
    subtitle: 'Cards, Mobile Money, Bank Transfer & RAVE',
    badge: 'Global • Multi-currency',
    brandColor: '#F5A623',
    icon: 'flw',
    requiresPhone: false,
  },
}

export function PaymentMethodSelector({
  selected,
  onChange,
  availableMethods,
}: {
  selected: PaymentMethodId
  onChange: (id: PaymentMethodId) => void
  availableMethods?: PaymentMethodId[]
}) {
  const methodsToDisplay = availableMethods
    ? availableMethods.map((id) => ALL_OPTIONS[id]).filter(Boolean)
    : [ALL_OPTIONS.mtn_momo, ALL_OPTIONS.orange_money, ALL_OPTIONS.stripe, ALL_OPTIONS.flutterwave]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block">
          Select Payment Method
        </label>
        <span className="text-[10px] flex items-center gap-1 font-mono" style={{ color: C.forest }}>
          <ShieldCheck className="w-3 h-3 inline" /> Escrow Encrypted
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {methodsToDisplay.map((opt) => {
          const isSelected = selected === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className="relative p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between"
              style={{
                borderColor: isSelected ? opt.brandColor : C.parchmentDark,
                background: isSelected ? 'var(--color-surface)' : C.parchment,
                boxShadow: isSelected ? `0 4px 14px ${opt.brandColor}25` : 'none',
              }}
            >
              {isSelected && (
                <div
                  className="absolute top-3 right-3 w-4 h-4 rounded-full flex items-center justify-center text-white"
                  style={{ background: opt.brandColor }}
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm"
                  style={{
                    background: opt.brandColor,
                    color: opt.id === 'mtn_momo' ? '#000' : '#fff',
                  }}
                >
                  {opt.icon === 'momo' ? 'MoMo' : opt.icon === 'om' ? 'OM' : opt.icon === 'stripe' ? <CreditCard className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                </div>

                <div className="min-w-0 flex-1 pr-4">
                  <p style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold truncate">
                    {opt.label}
                  </p>
                  {opt.badge && (
                    <span
                      style={{ fontFamily: FONT.mono, color: C.inkSubtle, background: C.parchmentDark }}
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium inline-block mt-0.5"
                    >
                      {opt.badge}
                    </span>
                  )}
                </div>
              </div>

              <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs leading-relaxed">
                {opt.subtitle}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
