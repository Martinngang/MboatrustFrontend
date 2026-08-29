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
  /** City-center coordinates, when the underlying dataset has them (most
   * cities do; a handful of very small localities don't). Country/region
   * options never carry these — only city/town options do. Approximate by
   * nature (a city center, not a street address), but real and free —
   * good enough to place a project on a map without a geocoding call or a
   * dedicated "pick a point" UI neither this app has nor asked for. */
  lat?: number
  lng?: number
}

/** Parses country-state-city's lat/lng (always strings, sometimes null/
 * missing for minor localities) into real numbers, or undefined when
 * there's nothing usable — never NaN, which would silently break a map
 * component expecting a real coordinate or a clean "no location" state. */
function parseCoord(raw: string | null | undefined): number | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
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
    .map((c) => ({ value: c.name, label: c.name, lat: parseCoord(c.latitude), lng: parseCoord(c.longitude) }))
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
    .map((c) => ({ value: c.name, label: c.name, lat: parseCoord(c.latitude), lng: parseCoord(c.longitude) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Looks up the coordinates behind an already-picked (region, town) pair —
 * for a creation form that only stores the town's string value, not the
 * full LocationOption RegionTownSelect resolved it from. Returns null when
 * the underlying dataset has no coordinates for that specific town (some
 * minor localities don't) or the town/region no longer resolves at all. */
export function getTownCoords(regionIsoCode: string, townName: string): { lat: number; lng: number } | null {
  const match = getTownsOfCameroonRegion(regionIsoCode).find((t) => t.value === townName)
  return match?.lat != null && match?.lng != null ? { lat: match.lat, lng: match.lng } : null
}

export function getCameroonRegionName(regionIsoCode: string): string {
  if (!cache) return ''
  return cache.State.getStatesOfCountry(CAMEROON_ISO).find((s) => s.isoCode === regionIsoCode)?.name ?? ''
}

export function getCountryName(countryIsoCode: string): string {
  if (!cache) return ''
  return cache.Country.getAllCountries().find((c) => c.isoCode === countryIsoCode)?.name ?? ''
}
