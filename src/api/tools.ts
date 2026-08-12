import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export interface ConversionResult {
  fromCurrency: string
  toCurrency: string
  rate: number
  amountBeforeConversion: number
  convertedAmount: number
  conversionFee: number
  settledAmount: number
  feeBreakdown: { feeType: string; feeRate: number; feeAmount: number; netAmount: number } | null
}

/** Real backend conversion (GET /tools/convert) — the same rate table and
 * currency_conversion fee the backend actually applies internally during a
 * foreign-currency milestone payout (see conversionService.convertAmount),
 * not a client-side approximation of it. */
export function useCurrencyConversionQuery(amount: number, from: string, to: string) {
  return useQuery({
    queryKey: ['currencyConversion', amount, from, to],
    queryFn: async (): Promise<ConversionResult> => {
      const { data } = await api.get<{ data: ConversionResult }>('/tools/convert', { params: { amount, from, to } })
      return data.data
    },
    enabled: amount > 0 && Boolean(from) && Boolean(to),
    staleTime: 30_000,
  })
}
