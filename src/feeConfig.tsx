import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

// ── Mock monetization config ──────────────────────────────────────────────────
// Everything here is a stand-in for values that will eventually come from a
// real pricing/config API. The shape is deliberately flat and JSON-serializable
// so swapping DEFAULT_FEE_CONFIG for a fetched object later is a one-line change
// — no component below cares where the numbers came from.

export interface ForeignCurrency {
  code: string
  label: string
  /** Mock rate: how many XAF 1 unit of this currency buys. */
  xafRate: number
}

export interface FeeConfig {
  transactionFeeRate: number // milestone release platform fee, e.g. 0.03 = 3%
  conversionSpreadRate: number // currency conversion platform spread, e.g. 0.025 = 2.5%
  contractorSuccessFeeRate: number // contractor milestone payout success fee, e.g. 0.05 = 5%
  landSuccessFeeRate: number // land sale success fee, e.g. 0.02 = 2%
  verifierVisitFee: number // flat, XAF — in-person verifier visit add-on (funding + land)
  perBidFee: number // flat, XAF — per-bid fee for Free-plan contractors
  verifiedBadgeFee: number // flat, XAF — contractor "Get Verified" upgrade
  listingFee: number // flat, XAF — publish a land listing
  proContractorMonthlyPrice: number // flat, XAF/month — Pro Contractor plan
  diasporaSubscriptionMonthlyPrice: number // flat, XAF/month — diaspora power-user plan
  foreignCurrencies: ForeignCurrency[]
}

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  transactionFeeRate: 0.03,
  conversionSpreadRate: 0.025,
  contractorSuccessFeeRate: 0.05,
  landSuccessFeeRate: 0.02,
  verifierVisitFee: 15000,
  perBidFee: 2000,
  verifiedBadgeFee: 10000,
  listingFee: 20000,
  proContractorMonthlyPrice: 25000,
  diasporaSubscriptionMonthlyPrice: 15000,
  foreignCurrencies: [
    { code: 'EUR', label: 'Euro (EUR)', xafRate: 655.96 },
    { code: 'USD', label: 'US Dollar (USD)', xafRate: 610.25 },
  ],
}

export type ContractorPlan = 'free' | 'pro'

interface FeeConfigContextValue {
  config: FeeConfig
  updateConfig: (patch: Partial<FeeConfig>) => void
  resetConfig: () => void

  // Simulated account/plan state — no backend, just demo toggles that other
  // screens read to decide what fee UI to show.
  contractorPlan: ContractorPlan
  setContractorPlan: (plan: ContractorPlan) => void
  contractorVerified: boolean
  setContractorVerified: (v: boolean) => void
  diasporaSubscribed: boolean
  setDiasporaSubscribed: (v: boolean) => void
}

const FeeConfigContext = createContext<FeeConfigContextValue>({} as FeeConfigContextValue)

export function FeeConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<FeeConfig>(DEFAULT_FEE_CONFIG)
  const [contractorPlan, setContractorPlan] = useState<ContractorPlan>('free')
  const [contractorVerified, setContractorVerified] = useState(false)
  const [diasporaSubscribed, setDiasporaSubscribed] = useState(false)

  const updateConfig = (patch: Partial<FeeConfig>) => setConfig((c) => ({ ...c, ...patch }))
  const resetConfig = () => setConfig(DEFAULT_FEE_CONFIG)

  return (
    <FeeConfigContext.Provider
      value={{
        config, updateConfig, resetConfig,
        contractorPlan, setContractorPlan,
        contractorVerified, setContractorVerified,
        diasporaSubscribed, setDiasporaSubscribed,
      }}
    >
      {children}
    </FeeConfigContext.Provider>
  )
}

export const useFeeConfig = () => useContext(FeeConfigContext)

// ── Formatting helper ──────────────────────────────────────────────────────────
export function pct(rate: number) {
  const p = rate * 100
  return `${Number.isInteger(p) ? p : Math.round(p * 10) / 10}%`
}

// ── Shared fee calculation ──────────────────────────────────────────────────────
// The one function every fee-bearing screen calls. Percentage fees default to
// `deduct` (fee comes out of a payout), flat fees default to `add` (fee is
// charged on top) — but callers can always override.

export interface FeeResult {
  kind: 'percentage' | 'flat'
  mode: 'deduct' | 'add'
  amount: number
  feeRate?: number
  feeAmount: number
  resultAmount: number
  amountLabel: string
  feeLabel: string
  resultLabel: string
}

export function calculateFee(params: {
  amount?: number
  feeRate?: number
  flatFee?: number
  amountLabel?: string
  feeLabel: string
  resultLabel: string
  mode?: 'deduct' | 'add'
}): FeeResult {
  const {
    amount = 0,
    feeRate,
    flatFee,
    amountLabel = 'Amount',
    feeLabel,
    resultLabel,
  } = params
  const kind: FeeResult['kind'] = feeRate !== undefined ? 'percentage' : 'flat'
  const mode = params.mode ?? (kind === 'percentage' ? 'deduct' : 'add')
  const feeAmount = kind === 'percentage' ? Math.round(amount * (feeRate ?? 0)) : Math.round(flatFee ?? 0)
  const resultAmount = mode === 'deduct' ? amount - feeAmount : amount + feeAmount

  return { kind, mode, amount, feeRate, feeAmount, resultAmount, amountLabel, feeLabel, resultLabel }
}

/**
 * Pillar-specific convenience calculators, all built on `calculateFee` and all
 * reading live rates from FeeConfigContext. This is the single call site every
 * screen should use — no screen computes fee math on its own.
 */
export function useFeeCalculation() {
  const { config, contractorPlan, contractorVerified, diasporaSubscribed } = useFeeConfig()

  return useMemo(() => ({
    config,
    contractorPlan,
    contractorVerified,
    diasporaSubscribed,

    /** Funding pillar — releasing an approved milestone from escrow. */
    milestoneRelease: (amount: number, amountLabel = 'Milestone amount') =>
      calculateFee({
        amount, feeRate: config.transactionFeeRate, mode: 'deduct', amountLabel,
        feeLabel: `Platform fee (${pct(config.transactionFeeRate)})`,
        resultLabel: 'Recipient receives',
      }),

    /** Funding pillar — funding in a foreign currency, converted + spread applied. */
    currencyConversion: (foreignAmount: number, currencyCode: string) => {
      const currency = config.foreignCurrencies.find((c) => c.code === currencyCode) ?? config.foreignCurrencies[0]
      const xafAmount = Math.round(foreignAmount * currency.xafRate)
      const result = calculateFee({
        amount: xafAmount, feeRate: config.conversionSpreadRate, mode: 'add',
        amountLabel: `${currency.label} converted to XAF`,
        feeLabel: `Platform conversion fee (${pct(config.conversionSpreadRate)})`,
        resultLabel: 'Total charged',
      })
      return { ...result, currency, foreignAmount }
    },

    /** Funding + land pillar — optional in-person verifier visit add-on. */
    verifierVisit: () =>
      calculateFee({
        flatFee: config.verifierVisitFee, mode: 'add',
        amountLabel: 'Verifier visit fee',
        feeLabel: 'In-person verifier visit',
        resultLabel: 'Add-on cost',
      }),

    /** Contractor pillar — per-bid fee, only charged on the Free plan. */
    perBid: () =>
      calculateFee({
        flatFee: contractorPlan === 'pro' ? 0 : config.perBidFee, mode: 'add',
        amountLabel: 'Per-bid fee',
        feeLabel: contractorPlan === 'pro' ? 'Included in Pro plan' : 'Per-bid fee',
        resultLabel: 'Total to submit bid',
      }),

    /** Contractor pillar — success fee on a milestone payout. */
    contractorPayout: (amount: number, amountLabel = 'Milestone payout') =>
      calculateFee({
        amount, feeRate: config.contractorSuccessFeeRate, mode: 'deduct', amountLabel,
        feeLabel: `Platform success fee (${pct(config.contractorSuccessFeeRate)})`,
        resultLabel: 'You receive',
      }),

    /** Contractor pillar — one-time verified badge upgrade. */
    verifiedBadge: () =>
      calculateFee({
        flatFee: config.verifiedBadgeFee, mode: 'add',
        amountLabel: 'Verified badge fee',
        feeLabel: 'One-time verification fee',
        resultLabel: 'Total to get verified',
      }),

    /** Land pillar — publishing a listing. */
    listingFee: () =>
      calculateFee({
        flatFee: config.listingFee, mode: 'add',
        amountLabel: 'Listing fee',
        feeLabel: 'Platform listing fee',
        resultLabel: 'Total to publish',
      }),

    /** Land pillar — success fee once a sale completes. */
    landSale: (amount: number, amountLabel = 'Sale price') =>
      calculateFee({
        amount, feeRate: config.landSuccessFeeRate, mode: 'deduct', amountLabel,
        feeLabel: `Platform success fee (${pct(config.landSuccessFeeRate)})`,
        resultLabel: 'Seller receives',
      }),
  }), [config, contractorPlan, contractorVerified, diasporaSubscribed])
}
