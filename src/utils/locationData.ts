/** Real, authoritative country/region/city data (country-state-city — ISO
 * country codes, real administrative regions, real localities), not a
 * hand-maintained list. Two scopes are exposed: worldwide country→city
 * (diaspora funders live anywhere) and Cameroon-only region→town (every
 * project/listing/coverage-area field in the app is Cameroon-based).
 *
 * The package ships its entire worldwide dataset as plain JS — importing it
 * eagerly inflated the main bundle from a few hundred KB to over 10MB and
 * broke the PWA's precache limit. It's dynamically imported instead, on
 * first actual use, so it becomes its own lazy-loaded chunk that the vast
 * majority of page loads (anyone not touching a location picker) never
 * fetch at all. Consumers call `preloadLocationData()` and re-render once
 * it resolves; every getter below reads from an in-memory cache that's
 * empty (returns []) until that resolves, then synchronous forever after —
 * which is safe for `getCameroonRegionName`/`getCountryName` specifically
 * because they're only ever called after a user has already picked a value
 * out of an already-loaded, already-rendered dropdown. */

export interface LocationOption {
  value: string
  label: string
}

const CAMEROON_ISO = 'CM'

type CountryStateCityModule = typeof import('country-state-city')

let cache: CountryStateCityModule | null = null
let loadPromise: Promise<CountryStateCityModule> | null = null

export function isLocationDataLoaded(): boolean {
  return cache !== null
}

export function preloadLocationData(): Promise<CountryStateCityModule> {
  if (!loadPromise) {
    loadPromise = import('country-state-city').then((mod) => {
      cache = mod
      return mod
    })
  }
  return loadPromise
}

export function getAllCountries(): LocationOption[] {
  if (!cache) return []
  return cache.Country.getAllCountries()
    .map((c) => ({ value: c.isoCode, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function getCitiesOfCountry(countryIsoCode: string): LocationOption[] {
  if (!cache || !countryIsoCode) return []
  const cities = cache.City.getCitiesOfCountry(countryIsoCode) ?? []
  return cities
    .map((c) => ({ value: c.name, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function getCameroonRegions(): LocationOption[] {
  if (!cache) return []
  return cache.State.getStatesOfCountry(CAMEROON_ISO)
    .map((s) => ({ value: s.isoCode, label: s.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function getTownsOfCameroonRegion(regionIsoCode: string): LocationOption[] {
  if (!cache || !regionIsoCode) return []
  return cache.City.getCitiesOfState(CAMEROON_ISO, regionIsoCode)
    .map((c) => ({ value: c.name, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function getCameroonRegionName(regionIsoCode: string): string {
  if (!cache) return ''
  return cache.State.getStatesOfCountry(CAMEROON_ISO).find((s) => s.isoCode === regionIsoCode)?.name ?? ''
}

export function getCountryName(countryIsoCode: string): string {
  if (!cache) return ''
  return cache.Country.getAllCountries().find((c) => c.isoCode === countryIsoCode)?.name ?? ''
}
