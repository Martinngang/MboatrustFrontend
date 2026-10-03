import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { C, FONT } from './MobileLayout'
import { Modal } from './Modal'
import { AppIcon } from './icons'
import { useGeocodeSearchMutation, useReverseGeocodeQuery } from '../api/tools'
import { useToast } from './Toast'
import { useLocationCapture } from '../hooks/useLocationCapture'
import { LocationCaptureCard } from './LocationCaptureCard'

// Leaflet's default marker icon references its image assets via CSS-relative
// URLs that don't resolve once bundled — the classic "marker shows as a
// broken image" issue with Leaflet under Vite/webpack. Re-pointing it at the
// real bundled asset URLs (Vite resolves these image imports to hashed
// /assets/... paths) fixes it globally, once, for every map this app renders.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'

// Colored pins (via a CSS filter on the stock blue icon) so a viewer can
// tell a project's overall pin apart from a milestone's own location or an
// evidence geotag at a glance, without reading each popup — cheaper than
// shipping separate marker icon images for each kind.
const PIN_COLOR_FILTERS: Record<string, string> = {
  // Default Leaflet blue — the project/listing's own pin.
  default: '',
  // Amber/gold — a milestone's own planned location.
  milestone: 'hue-rotate(195deg) saturate(6) brightness(1.1)',
  // Green — an evidence photo's real GPS geotag (proof, not plan).
  evidence: 'hue-rotate(80deg) saturate(3)',
}

function coloredIcon(kind: string): L.DivIcon {
  const filter = PIN_COLOR_FILTERS[kind] ?? ''
  return L.divIcon({
    className: '',
    html: `<img src="${markerIcon}" style="width:25px;height:41px;filter:${filter}" />`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })
}

export interface MapMarker {
  id: string
  lat: number
  lng: number
  label: string
  /** Which color/legend bucket this pin belongs to — see PIN_COLOR_FILTERS. */
  kind?: 'default' | 'milestone' | 'evidence'
  draggable?: boolean
}

/** A real, interactive Leaflet map (OpenStreetMap tiles — free, no API key,
 * matching the geocoding service's own provider) showing one or more
 * markers. Leaflet is imperative, not a React component by nature — this
 * mounts/unmounts a real map instance on a plain div via refs. `active`
 * gates initialization so a map inside a Modal isn't created while the
 * container is still zero-size (before the open animation finishes) —
 * Leaflet reads its container's dimensions once at creation and never
 * recovers from getting that wrong on its own. */
function LeafletMap({ markers, active, onMarkerDragEnd }: {
  markers: MapMarker[]
  active: boolean
  onMarkerDragEnd?: (id: string, pos: { lat: number; lng: number }) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)

  // Mount/unmount the map instance itself only when `active` flips — never
  // re-created just because markers changed (that would reset the user's
  // own pan/zoom every time, including mid-drag).
  useEffect(() => {
    if (!active || !containerRef.current || mapRef.current) return
    const first = markers[0]
    const map = L.map(containerRef.current, {
      center: first ? [first.lat, first.lng] : [3.848, 11.502], // Yaoundé — a reasonable default center, never actually shown without a real marker
      zoom: 14,
      scrollWheelZoom: true,
    })
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map)
    markersLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    const t = window.setTimeout(() => map.invalidateSize(), 250)
    return () => {
      window.clearTimeout(t)
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Redraw markers whenever the marker list changes, without touching the
  // map instance/viewport — this is what lets a drag-to-correct pin update
  // live as the caller's state changes, and what lets adding a milestone
  // marker not reset the user's current pan/zoom.
  useEffect(() => {
    const map = mapRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    const bounds: L.LatLngTuple[] = []
    for (const m of markers) {
      bounds.push([m.lat, m.lng])
      const marker = L.marker([m.lat, m.lng], { icon: coloredIcon(m.kind ?? 'default'), draggable: Boolean(m.draggable) })
      marker.bindPopup(m.label)
      if (m.draggable && onMarkerDragEnd) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          onMarkerDragEnd(m.id, { lat: pos.lat, lng: pos.lng })
        })
      }
      marker.addTo(layer)
    }
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 })
    } else if (bounds.length === 1) {
      map.setView(bounds[0], map.getZoom() < 12 ? 14 : map.getZoom())
    }
  }, [markers, onMarkerDragEnd])

  return <div ref={containerRef} className="h-full w-full" style={{ background: C.parchment }} />
}

/** Full interactive map in a modal — the "View on Map" destination for a
 * single point (a milestone-evidence geotag, or any other one-marker use).
 * Sized generously (real zoom/pan controls need room to be usable,
 * especially on mobile) and only mounts the actual Leaflet instance while
 * open, per LeafletMap's `active` gate above. */
export function LocationMapModal({ open, onClose, lat, lng, title, address }: {
  open: boolean; onClose: () => void; lat: number; lng: number; title?: string; address?: string
}) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'Location'} size="lg">
      <div className="space-y-3">
        {address && (
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">{address}</p>
        )}
        <div className="overflow-hidden rounded-2xl border h-[60vh] min-h-[320px] sm:h-[65vh]" style={{ borderColor: C.parchmentDark }}>
          <LeafletMap markers={[{ id: 'point', lat, lng, label: title || 'Location' }]} active={open} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
            target="_blank" rel="noreferrer"
            className="text-xs font-semibold"
            style={{ fontFamily: FONT.sans, color: C.forest }}
          >
            Open in full map →
          </a>
        </div>
      </div>
    </Modal>
  )
}

/** Multi-marker read-only map — the project's own pin, plus every
 * milestone that has its own distinct location (a milestone with none just
 * doesn't get a separate pin — it's already covered by the project's). A
 * small color legend only renders when there's more than one kind of pin
 * on screen, so a simple single-pin project doesn't show a legend for
 * colors that never appear. */
export function MultiMarkerMapModal({ open, onClose, markers, title }: {
  open: boolean; onClose: () => void; markers: MapMarker[]; title?: string
}) {
  const kinds = new Set(markers.map((m) => m.kind ?? 'default'))
  return (
    <Modal open={open} onClose={onClose} title={title || 'Location'} size="lg">
      <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl border h-[60vh] min-h-[320px] sm:h-[65vh]" style={{ borderColor: C.parchmentDark }}>
          <LeafletMap markers={markers} active={open} />
        </div>
        {kinds.size > 1 && (
          <div className="flex items-center gap-4 flex-wrap">
            {kinds.has('default') && <LegendDot color="#2A81CB" label="Project" />}
            {kinds.has('milestone') && <LegendDot color="#D4A017" label="Milestone location" />}
            {kinds.has('evidence') && <LegendDot color="#3FA34D" label="Evidence submitted here" />}
          </div>
        )}
      </div>
    </Modal>
  )
}

/** Same real Leaflet map as MultiMarkerMapModal, but embedded directly
 * inline (no modal wrapper) — for a listing/project detail page that wants
 * the map always visible rather than behind a "View on Map" button.
 * `active` isn't gated on anything here (unlike the modal variants, which
 * wait for their open-animation to finish) since an inline map's container
 * has a real size from the moment it mounts. */
export function InlineMap({ markers, heightClassName = 'h-56' }: { markers: MapMarker[]; heightClassName?: string }) {
  if (markers.length === 0) {
    return (
      <div className={`${heightClassName} rounded-2xl flex items-center justify-center`} style={{ background: C.parchment }}>
        <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Map unavailable</span>
      </div>
    )
  }
  return (
    <div className={`${heightClassName} rounded-2xl overflow-hidden border`} style={{ borderColor: C.parchmentDark }}>
      <LeafletMap markers={markers} active />
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: color }} />
      <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{label}</span>
    </div>
  )
}

/** Manual pin-correction UI shared by every "Edit location" affordance
 * (project, milestone, land listing, supplier/contractor profile) — a
 * draggable marker, an address-search box hitting the real backend
 * geocoder, and a "use my current location" button (browser geolocation).
 * Saves nothing itself: the caller supplies `onSave` and handles its own
 * mutation, so this stays a dumb, reusable picker. */
export interface ResolvedLocation {
  lat: number
  lng: number
  placeName?: string | null
  formattedAddress?: string | null
  source: 'manual_pin' | 'gps' | 'geocoded_search'
}

/** Coordinates alone are never enough — every capture path here (address
 * search, GPS, manual drag) resolves and surfaces a real place name/address
 * before the caller ever gets to save it. Address search already gets one
 * back from the backend's forward-geocode in the same round trip; GPS and a
 * manual drag instead reactively reverse-geocode the dropped pin, same
 * pattern MilestoneSubmitScreen already proved out for evidence capture. */
export function LocationEditModal({ open, onClose, initialLat, initialLng, title, onSave, saving }: {
  open: boolean
  onClose: () => void
  initialLat: number | null
  initialLng: number | null
  title?: string
  onSave: (pos: ResolvedLocation) => void
  saving?: boolean
}) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  )
  const [source, setSource] = useState<ResolvedLocation['source']>('manual_pin')
  // Only populated by a search result, which already resolves a place name
  // server-side in the same call — GPS/drag instead read from the reactive
  // reverse-geocode query below.
  const [searchResolved, setSearchResolved] = useState<{ placeName: string; formattedAddress: string } | null>(null)
  const [query, setQuery] = useState('')
  const geocode = useGeocodeSearchMutation()
  const { data: reverseResolved, isLoading: resolving } = useReverseGeocodeQuery(
    source !== 'geocoded_search' ? pos?.lat : undefined,
    source !== 'geocoded_search' ? pos?.lng : undefined
  )
  const { show: showToast } = useToast()

  // Auto-fires only when this modal opens with no existing pin (a brand-new
  // location, nothing to silently overwrite) — stays button-triggered when
  // correcting an already-set one. Failure/timeout/denial surfaces the
  // shared red "Auto-Get My Location" retry button via LocationCaptureCard
  // below instead of the one-shot toast this used to show.
  const gpsCapture = useLocationCapture({ autoAttempt: initialLat == null && initialLng == null })
  useEffect(() => {
    if (gpsCapture.status === 'success' && gpsCapture.coords) {
      setPos(gpsCapture.coords)
      setSource('gps')
    }
    // Only react to a NEW successful fix, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsCapture.status, gpsCapture.coords?.lat, gpsCapture.coords?.lng])

  const resolvedName = source === 'geocoded_search' ? searchResolved?.placeName : reverseResolved?.placeName
  const resolvedAddress = source === 'geocoded_search' ? searchResolved?.formattedAddress : reverseResolved?.formattedAddress

  useEffect(() => {
    if (open) {
      setPos(initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null)
      setSource('manual_pin')
      setSearchResolved(null)
      setQuery('')
    }
  }, [open, initialLat, initialLng])

  const search = async () => {
    if (!query.trim()) return
    const result = await geocode.mutateAsync(query.trim())
    if (result) {
      setPos({ lat: result.lat, lng: result.lng })
      setSearchResolved({ placeName: result.placeName, formattedAddress: result.formattedAddress })
      setSource('geocoded_search')
    } else {
      showToast({ title: 'No match found', description: 'Try a more specific address, or drag the pin manually.', tone: 'error' })
    }
  }

  const handleSave = () => {
    if (!pos) return
    onSave({ lat: pos.lat, lng: pos.lng, placeName: resolvedName ?? null, formattedAddress: resolvedAddress ?? null, source })
  }

  return (
    <Modal open={open} onClose={onClose} title={title || 'Edit location'} size="lg">
      <div className="space-y-3">
        <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">
          Search an address, use your current location, or drag the pin to the exact spot.
        </p>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Search an address or place…"
            className="flex-1 rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
          />
          <button
            onClick={search}
            disabled={geocode.isPending}
            className="rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap"
            style={{ background: C.forest, color: C.white, fontFamily: FONT.sans, opacity: geocode.isPending ? 0.6 : 1 }}
          >
            {geocode.isPending ? 'Searching…' : 'Search'}
          </button>
        </div>
        <LocationCaptureCard capture={gpsCapture} idleLabel="Use my current location" showSuccessDetails={false} />
        <div className="overflow-hidden rounded-2xl border h-[45vh] min-h-[260px]" style={{ borderColor: C.parchmentDark }}>
          {pos ? (
            <LeafletMap
              markers={[{ id: 'pin', lat: pos.lat, lng: pos.lng, label: 'Drag to correct', draggable: true }]}
              active={open}
              onMarkerDragEnd={(_id, next) => {
                setPos(next)
                setSource('manual_pin')
              }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center" style={{ background: C.parchment }}>
              <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">
                Search an address or use your location to place a pin
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 pt-1">
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">
            {pos
              ? resolving
                ? 'Resolving place name…'
                : resolvedName
                  ? `${resolvedName} (${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)})`
                  : `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`
              : 'No pin set yet'}
          </p>
          <button
            onClick={handleSave}
            disabled={!pos || saving}
            className="rounded-xl px-4 py-2 text-xs font-semibold"
            style={{ background: C.forest, color: C.white, fontFamily: FONT.sans, opacity: !pos || saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : 'Save location'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Drop-in "Location" section for a project/contract detail screen — the
 * display name plus, when real coordinates exist, a "View on Map" action
 * that opens an interactive map showing the project's own pin AND every
 * milestone that has its own distinct location. Shared by ProjectDetailScreen
 * (funding) and ContractSummaryScreen (tender) rather than duplicating the
 * same location-name + map-button + modal wiring in both. Degrades cleanly
 * when a project has no coordinates (created before this existed, or its
 * region/town has no coordinate data) — a plain location line, no dead
 * button pretending a map is available. `onEditLocation` is optional — only
 * the project owner gets an "Edit" affordance; a contractor/viewer just sees
 * the read-only map. */
export function ProjectLocationSection({ locationName, coordinates, locationDetails, milestones, onEditLocation }: {
  locationName: string
  coordinates: { lat: number; lng: number } | null
  /** The resolved place name/address for `coordinates`, when available — see
   * Project.locationDetails on the backend. Falls back to the free-text
   * `locationName` the funder typed when this isn't set (older records, or
   * coordinates that couldn't be resolved). */
  locationDetails?: { placeName?: string | null; formattedAddress?: string | null } | null
  /** Milestones with their own distinct location — plotted as extra pins.
   * Optional so existing call sites that don't have milestone data handy
   * (or don't need this — e.g. a milestone-less funding project) keep
   * working with zero change. */
  milestones?: { id: string; title: string; location: { lat: number; lng: number } | null }[]
  onEditLocation?: () => void
}) {
  const [mapOpen, setMapOpen] = useState(false)
  const displayName = locationDetails?.placeName || locationName || 'Location not set'
  const milestoneMarkers: MapMarker[] = (milestones ?? [])
    .filter((m) => m.location)
    .map((m) => ({ id: m.id, lat: m.location!.lat, lng: m.location!.lng, label: m.title, kind: 'milestone' as const }))
  const markers: MapMarker[] = coordinates
    ? [{ id: 'project', lat: coordinates.lat, lng: coordinates.lng, label: displayName || 'Project location' }, ...milestoneMarkers]
    : milestoneMarkers

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Location</div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AppIcon name="mapPin" size={15} style={{ color: C.forest, flexShrink: 0 }} />
          <div className="min-w-0">
            <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium truncate block">{displayName}</span>
            {locationDetails?.formattedAddress && locationDetails.formattedAddress !== displayName && (
              <span style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-[11px] truncate block">{locationDetails.formattedAddress}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {markers.length > 0 ? (
            <button
              onClick={() => setMapOpen(true)}
              className="text-xs font-semibold whitespace-nowrap"
              style={{ fontFamily: FONT.sans, color: C.forest }}
            >
              View on Map →
            </button>
          ) : (
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">Map unavailable</span>
          )}
          {onEditLocation && (
            <button
              onClick={onEditLocation}
              className="text-xs font-semibold whitespace-nowrap"
              style={{ fontFamily: FONT.sans, color: C.inkMuted }}
            >
              Edit
            </button>
          )}
        </div>
      </div>
      {markers.length > 0 && (
        <MultiMarkerMapModal open={mapOpen} onClose={() => setMapOpen(false)} markers={markers} title={locationName} />
      )}
    </div>
  )
}
