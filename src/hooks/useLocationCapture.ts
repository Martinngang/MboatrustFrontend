import { useCallback, useEffect, useRef, useState } from 'react'
import { useReverseGeocodeQuery } from '../api/tools'

export type LocationCaptureStatus = 'idle' | 'locating' | 'success' | 'denied' | 'timeout' | 'unavailable' | 'error'

export interface LocationCaptureResult {
  status: LocationCaptureStatus
  coords: { lat: number; lng: number } | null
  /** Resolved via the existing reverse-geocode hook — undefined while that
   * lookup is still in flight even though `coords` already succeeded. */
  placeName: string | null
  formattedAddress: string | null
  /** True only while the reverse-geocode lookup (not the GPS fix itself) is
   * still in flight — `status` alone doesn't capture this second stage. */
  resolving: boolean
  /** Re-runs the attempt. Safe to call from any state, including mid-attempt
   * (a fresh call simply supersedes the in-flight one). */
  retry: () => void
}

const DEFAULT_TIMEOUT_MS = 10_000

/**
 * The one place browser geolocation + reverse-geocoding is ever requested
 * from — every location-dependent screen (milestone evidence, the shared
 * location-edit modal, tender/land-listing creation, verifier location
 * confirmation, verifier profile) uses this instead of its own inline
 * `navigator.geolocation` call, so failure/timeout/denial handling — and the
 * "Auto-Get My Location" retry affordance — behaves identically everywhere.
 * See components/LocationCaptureCard.tsx, the one shared presentational
 * counterpart to this hook.
 *
 * Never fabricates or substitutes a location: `coords`/`placeName` only ever
 * reflect a real, successful resolution. `autoAttempt` fires the first
 * attempt on mount — pass `false` for a flow where GPS should stay an
 * explicit user action (e.g. correcting an already-set pin) and call
 * `retry()` from that action's handler instead.
 */
export function useLocationCapture({ autoAttempt = false }: { autoAttempt?: boolean } = {}): LocationCaptureResult {
  const [status, setStatus] = useState<LocationCaptureStatus>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  // Incremented on every attempt so a stale callback from a superseded
  // request can never clobber the state of a later one.
  const attemptId = useRef(0)

  const attempt = useCallback(() => {
    const thisAttempt = ++attemptId.current
    setStatus('locating')
    if (!('geolocation' in navigator)) {
      setStatus('unavailable')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (attemptId.current !== thisAttempt) return
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('success')
      },
      (err) => {
        if (attemptId.current !== thisAttempt) return
        // GeolocationPositionError codes: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT.
        setStatus(err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable')
      },
      { enableHighAccuracy: true, timeout: DEFAULT_TIMEOUT_MS }
    )
  }, [])

  useEffect(() => {
    if (autoAttempt) attempt()
    // Only ever auto-fires the very first time this hook instance mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: resolved, isLoading: resolving } = useReverseGeocodeQuery(coords?.lat, coords?.lng)

  return {
    status,
    coords,
    placeName: resolved?.placeName ?? null,
    formattedAddress: resolved?.formattedAddress ?? null,
    resolving: status === 'success' && resolving,
    retry: attempt,
  }
}
