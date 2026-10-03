import { C, FONT } from './MobileLayout'
import { AppIcon } from './icons'
import { InlineMap } from './ProjectMap'
import type { LocationCaptureResult } from '../hooks/useLocationCapture'

const FAILURE_COPY: Record<string, { title: string; body: string }> = {
  denied: { title: 'Location permission denied', body: 'Enable location access in your browser settings, then retry.' },
  timeout: { title: 'Location request timed out', body: 'Your device took too long to respond. Try again, ideally with a clear view of the sky.' },
  unavailable: { title: "Couldn't determine your location", body: 'Your browser or device could not resolve a position.' },
  error: { title: 'Something went wrong', body: 'We were unable to get your location just now.' },
}

/**
 * The one shared presentational counterpart to useLocationCapture — every
 * location-dependent card in the app (milestone evidence, the location-edit
 * modal, tender/land-listing creation, verifier location confirmation,
 * verifier profile) renders this instead of its own bespoke status text, so
 * failure always surfaces the same clearly-visible red "Auto-Get My
 * Location" retry button and success always shows the same coordinates +
 * map pin + place name + formatted address. Never shows a location that
 * wasn't a real resolved success — a failed retry only ever adds an error
 * message here, it never touches whatever value the caller already had.
 */
export function LocationCaptureCard({ capture, idleLabel = 'Get my location', title, showSuccessDetails = true }: {
  capture: LocationCaptureResult
  /** Shown as the initial call-to-action when this instance never
   * auto-attempts (see useLocationCapture's `autoAttempt` option) — e.g.
   * "Use my current location" inside the location-edit modal. */
  idleLabel?: string
  title?: string
  /** False for a caller that already renders its own map/resolved-name
   * display fed by this same capture (e.g. LocationEditModal, which shows
   * one unified footer across its search/GPS/drag paths) — the locating
   * spinner and failure/retry states still render either way. */
  showSuccessDetails?: boolean
}) {
  const { status, coords, placeName, formattedAddress, resolving, retry } = capture

  return (
    <div className="space-y-2">
      {title && (
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">
          {title}
        </div>
      )}

      {(status === 'idle' || (status === 'success' && !showSuccessDetails)) && (
        <button
          onClick={retry}
          type="button"
          className="text-xs font-semibold flex items-center gap-1.5"
          style={{ fontFamily: FONT.sans, color: C.forest }}
        >
          <AppIcon name="mapPin" size={13} />
          {idleLabel}
        </button>
      )}

      {status === 'locating' && (
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3.5 h-3.5 rounded-full border-2 animate-spin"
            style={{ borderColor: C.parchmentDark, borderTopColor: C.forest }}
          />
          <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">Locating your position…</span>
        </div>
      )}

      {status === 'success' && coords && showSuccessDetails && (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <AppIcon name="mapPin" size={14} style={{ color: C.forest, marginTop: 1, flexShrink: 0 }} />
            <div className="min-w-0">
              {resolving ? (
                <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">Resolving place name…</span>
              ) : (
                <>
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium truncate">
                    {placeName || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`}
                  </div>
                  {formattedAddress && formattedAddress !== placeName && (
                    <div style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-[11px] truncate">{formattedAddress}</div>
                  )}
                </>
              )}
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border" style={{ borderColor: C.parchmentDark }}>
            <InlineMap markers={[{ id: 'captured', lat: coords.lat, lng: coords.lng, label: placeName || 'Your location' }]} heightClassName="h-32" />
          </div>
        </div>
      )}

      {(status === 'denied' || status === 'timeout' || status === 'unavailable' || status === 'error') && (
        <div className="space-y-2">
          <div>
            <div style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }} className="text-xs font-semibold">
              {FAILURE_COPY[status].title}
            </div>
            <div style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-[11px] mt-0.5">
              {FAILURE_COPY[status].body}
            </div>
          </div>
          <button
            onClick={retry}
            type="button"
            className="rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
            style={{ background: C.seal, color: '#fff', fontFamily: FONT.sans }}
          >
            <AppIcon name="mapPin" size={13} />
            Auto-Get My Location
          </button>
        </div>
      )}
    </div>
  )
}
