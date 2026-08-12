import { useState, useEffect } from 'react'
import { useFeeCalculation } from '../feeConfig'
import { useCurrencyConversionQuery } from '../api/tools'
import { C, FONT } from './MobileLayout'
import { FeeBreakdown } from './FeeBreakdown'

/**
 * Reusable exchange-rate + conversion-fee widget. Works standalone (its own
 * screen) or embedded (e.g. behind a "fund in a different currency" toggle on
 * the escrow payment screen) — both call the real GET /tools/convert
 * endpoint, the same conversionService the backend uses internally for a
 * foreign-currency milestone payout, not a client-side approximation of it.
 */
export function CurrencyConverterWidget({ defaultAmount, onResultChange }: {
  defaultAmount?: number
  onResultChange?: (xafTotal: number) => void
}) {
  const fees = useFeeCalculation()
  const currencies = fees.config.foreignCurrencies
  const [currencyCode, setCurrencyCode] = useState(currencies[0].code)
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '')

  const currency = currencies.find((c) => c.code === currencyCode) ?? currencies[0]
  const numericAmount = Number(amount) || 0
  const { data: result, isFetching } = useCurrencyConversionQuery(numericAmount, currencyCode, 'XAF')

  useEffect(() => {
    onResultChange?.(numericAmount > 0 ? (result?.settledAmount ?? 0) : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.settledAmount, numericAmount])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {currencies.map((c) => (
          <button
            key={c.code}
            onClick={() => setCurrencyCode(c.code)}
            className="flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all"
            style={{
              borderColor: currencyCode === c.code ? C.forest : C.parchmentDark,
              background: currencyCode === c.code ? 'var(--status-success-bg)' : C.white,
              color: currencyCode === c.code ? C.forest : C.inkMuted,
              fontFamily: FONT.mono,
            }}
          >
            {c.code}
          </button>
        ))}
      </div>

      <div>
        <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">
          Amount in {currency.code}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`e.g. 1000`}
          className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
          style={{ borderColor: C.parchmentDark, background: C.white, fontFamily: FONT.sans, color: C.ink }}
        />
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-1.5">
          {result ? `Live rate: 1 ${currency.code} = XAF ${result.rate.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}` : isFetching ? 'Fetching live rate…' : ''}
        </div>
      </div>

      {numericAmount > 0 && result && (
        <FeeBreakdown
          result={{
            kind: 'percentage',
            mode: 'deduct',
            amount: result.convertedAmount,
            feeRate: result.feeBreakdown?.feeRate ?? 0,
            feeAmount: result.conversionFee,
            resultAmount: result.settledAmount,
            amountLabel: `${currency.label} converted to XAF`,
            feeLabel: `Platform conversion fee (${((result.feeBreakdown?.feeRate ?? 0) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%)`,
            resultLabel: 'Amount after fees',
          }}
        />
      )}
    </div>
  )
}
