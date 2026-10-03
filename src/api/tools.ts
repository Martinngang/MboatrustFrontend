import { useMutation, useQuery } from '@tanstack/react-query'
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

export interface ReverseGeocodeResult {
  placeName: string | null
  formattedAddress: string | null
}

/** Real backend reverse-geocode (GET /tools/reverse-geocode) — resolves a
 * GPS fix to a short place name AND the geocoder's full formatted address via
 * the backend's Nominatim wrapper (see geocodingService.js) instead of
 * showing raw coordinates. A given lat/lng pair always resolves to the same
 * name, so this is cached indefinitely once fetched rather than treated as
 * something that goes stale. */
export function useReverseGeocodeQuery(lat: number | undefined, lng: number | undefined) {
  return useQuery({
    queryKey: ['reverseGeocode', lat, lng],
    queryFn: async (): Promise<ReverseGeocodeResult> => {
      const { data } = await api.get<{ data: ReverseGeocodeResult }>('/tools/reverse-geocode', { params: { lat, lng } })
      return data.data
    },
    enabled: lat != null && lng != null,
    staleTime: Infinity,
  })
}

export interface GeocodeResult {
  lat: number
  lng: number
  placeName: string
  formattedAddress: string
}

/** Real backend forward-geocode (GET /tools/geocode) — resolves a typed
 * address/place name to coordinates, trying Google first when configured
 * and always falling back to free Nominatim (see geocodingService.js). A
 * mutation, not a query: this is fired on-demand by a "search" button in
 * the manual-pin-correction UI, not something to auto-fetch as the user
 * types (that would burn through Nominatim's rate limit on every
 * keystroke). Resolves to null (never throws) when nothing matches — the
 * caller shows "no results" and lets the user drop the pin manually instead. */
export function useGeocodeSearchMutation() {
  return useMutation({
    mutationFn: async (query: string): Promise<GeocodeResult | null> => {
      const { data } = await api.get<{ data: { result: GeocodeResult | null } }>('/tools/geocode', { params: { query } })
      return data.data.result
    },
  })
}
