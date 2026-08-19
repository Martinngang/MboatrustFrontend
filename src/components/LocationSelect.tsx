import { useEffect, useMemo, useState } from 'react'
import { SearchableSelect } from './SearchableSelect'
import {
  getAllCountries, getCitiesOfCountry, getCameroonRegions, getTownsOfCameroonRegion,
  preloadLocationData, isLocationDataLoaded,
} from '../utils/locationData'

/** country-state-city's dataset is dynamically imported (see
 * locationData.ts) rather than bundled eagerly — this hook triggers that
 * load on first mount and flips once it resolves, so every picker below
 * starts in a "loading" state for the (rare, one-time-per-session) moment
 * before the chunk arrives, then renders instantly from cache after that. */
function useLocationDataReady(): boolean {
  const [ready, setReady] = useState(isLocationDataLoaded)
  useEffect(() => {
    if (ready) return
    let cancelled = false
    preloadLocationData().then(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [ready])
  return ready
}

/** Worldwide Country → City pair — for anything about where a person
 * actually lives (currently: a diaspora funder's country of residence
 * during onboarding), as opposed to the Cameroon-only fields below. City is
 * disabled until a country is chosen and is reset every time the country
 * changes, since a previously-picked city almost certainly doesn't exist in
 * the new country's list. */
export function CountryCitySelect({
  countryValue, cityValue, onCountryChange, onCityChange, countryError, cityError,
}: {
  countryValue: string
  cityValue: string
  onCountryChange: (isoCode: string) => void
  onCityChange: (city: string) => void
  countryError?: string
  cityError?: string
}) {
  const ready = useLocationDataReady()
  const countries = useMemo(() => (ready ? getAllCountries() : []), [ready])
  const cities = useMemo(() => (ready ? getCitiesOfCountry(countryValue) : []), [ready, countryValue])

  const handleCountryChange = (isoCode: string) => {
    onCountryChange(isoCode)
    onCityChange('')
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SearchableSelect
        label="Country" placeholder="Search countries…" disabledHint={ready ? undefined : 'Loading countries…'}
        value={countryValue} onChange={handleCountryChange} options={countries} disabled={!ready} error={countryError}
      />
      <SearchableSelect
        label="City" placeholder="Search cities…" disabledHint={!ready ? 'Loading…' : 'Select a country first'}
        value={cityValue} onChange={onCityChange} options={cities}
        disabled={!ready || !countryValue} error={cityError}
        emptyMessage="No cities found for this country"
      />
    </div>
  )
}

/** Cameroon-only Region → Town pair — every project/listing/coverage-area
 * location field in the app is scoped to Cameroon, so this uses the real 10
 * administrative regions and their real localities rather than the
 * worldwide list. Same disabled-until-parent-picked + reset-on-change
 * behavior as CountryCitySelect. */
export function RegionTownSelect({
  regionValue, townValue, onRegionChange, onTownChange, regionError, townError, townLabel = 'City / Town',
}: {
  regionValue: string
  townValue: string
  onRegionChange: (isoCode: string) => void
  onTownChange: (town: string) => void
  regionError?: string
  townError?: string
  townLabel?: string
}) {
  const ready = useLocationDataReady()
  const regions = useMemo(() => (ready ? getCameroonRegions() : []), [ready])
  const towns = useMemo(() => (ready ? getTownsOfCameroonRegion(regionValue) : []), [ready, regionValue])

  const handleRegionChange = (isoCode: string) => {
    onRegionChange(isoCode)
    onTownChange('')
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SearchableSelect
        label="Region" placeholder="Search regions…" disabledHint={ready ? undefined : 'Loading regions…'}
        value={regionValue} onChange={handleRegionChange} options={regions} disabled={!ready} error={regionError}
      />
      <SearchableSelect
        label={townLabel} placeholder="Search towns…" disabledHint={!ready ? 'Loading…' : 'Select a region first'}
        value={townValue} onChange={onTownChange} options={towns}
        disabled={!ready || !regionValue} error={townError}
        emptyMessage="No towns found for this region"
      />
    </div>
  )
}

/** A single Cameroon region picker, no dependent town field — for coverage-
 * area fields (contractor/verifier "which regions do you serve") where only
 * the region itself is stored, never a specific town. */
export function RegionSelect({ value, onChange, error, label = 'Region' }: {
  value: string
  onChange: (isoCode: string) => void
  error?: string
  label?: string
}) {
  const ready = useLocationDataReady()
  const regions = useMemo(() => (ready ? getCameroonRegions() : []), [ready])
  return (
    <SearchableSelect
      label={label} placeholder="Search regions…" disabledHint={ready ? undefined : 'Loading regions…'}
      value={value} onChange={onChange} options={regions} disabled={!ready} error={error}
    />
  )
}
