import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { C, FONT } from './MobileLayout'
import { Modal } from './Modal'
import { AppIcon } from './icons'

// Leaflet's default marker icon references its image assets via CSS-relative
// URLs that don't resolve once bundled — the classic "marker shows as a
// broken image" issue with Leaflet under Vite/webpack. Re-pointing it at the
// real bundled asset URLs (Vite resolves these image imports to hashed
// /assets/... paths) fixes it globally, once, for every map this app renders.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'

/** A real, interactive Leaflet map (OpenStreetMap tiles — free, no API key,
 * matching the reverse-geocoding service's own provider) centered on one
 * marker. Leaflet is imperative, not a React component by nature — this
 * mounts/unmounts a real map instance on a plain div via refs rather than
 * pulling in react-leaflet for what's otherwise a single-marker, read-only
 * view. `active` gates initialization so a map inside a Modal isn't created
 * while the container is still zero-size (before the open animation
 * finishes) — Leaflet reads its container's dimensions once at creation and
 * never recovers from getting that wrong on its own. */
function LeafletMap({ lat, lng, label, active }: { lat: number; lng: number; label?: string; active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!active || !containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 14,
      scrollWheelZoom: true,
    })
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map)
    L.marker([lat, lng]).addTo(map).bindPopup(label || 'Project location')
    mapRef.current = map
    // The container's real size (especially inside a Modal's open
    // animation) often isn't final on the very first paint — Leaflet
    // otherwise locks in whatever it measured then, showing a partially
    // gray map until the window happens to resize.
    const t = window.setTimeout(() => map.invalidateSize(), 250)
    return () => {
      window.clearTimeout(t)
      map.remove()
      mapRef.current = null
    }
  }, [active, lat, lng, label])

  return <div ref={containerRef} className="h-full w-full" style={{ background: C.parchment }} />
}

/** Full interactive map in a modal — the "View on Map" destination. Sized
 * generously (real zoom/pan controls need room to be usable, especially on
 * mobile) and only mounts the actual Leaflet instance while open, per
 * LeafletMap's `active` gate above. */
export function LocationMapModal({ open, onClose, lat, lng, title, address }: {
  open: boolean; onClose: () => void; lat: number; lng: number; title?: string; address?: string
}) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'Project location'} size="lg">
      <div className="space-y-3">
        {address && (
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">{address}</p>
        )}
        <div className="overflow-hidden rounded-2xl border h-[60vh] min-h-[320px] sm:h-[65vh]" style={{ borderColor: C.parchmentDark }}>
          <LeafletMap lat={lat} lng={lng} label={title} active={open} />
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

/** Drop-in "Location" section for a project/contract detail screen — the
 * display name plus, when real coordinates exist, a "View on Map" action
 * that opens the interactive map above. Shared by ProjectDetailScreen
 * (funding) and ContractSummaryScreen (tender) rather than duplicating the
 * same location-name + map-button + modal wiring in both. Degrades cleanly
 * when a project has no coordinates (created before this existed, or its
 * region/town has no coordinate data) — a plain location line, no dead
 * button pretending a map is available. */
export function ProjectLocationSection({ locationName, coordinates }: {
  locationName: string
  coordinates: { lat: number; lng: number } | null
}) {
  const [mapOpen, setMapOpen] = useState(false)
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white }}>
      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Location</div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AppIcon name="mapPin" size={15} style={{ color: C.forest, flexShrink: 0 }} />
          <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium truncate">{locationName || 'Location not set'}</span>
        </div>
        {coordinates ? (
          <button
            onClick={() => setMapOpen(true)}
            className="flex-shrink-0 text-xs font-semibold whitespace-nowrap"
            style={{ fontFamily: FONT.sans, color: C.forest }}
          >
            View on Map →
          </button>
        ) : (
          <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="flex-shrink-0 text-[10px] uppercase tracking-wider">Map unavailable</span>
        )}
      </div>
      {coordinates && (
        <LocationMapModal
          open={mapOpen} onClose={() => setMapOpen(false)}
          lat={coordinates.lat} lng={coordinates.lng}
          title={locationName} address={locationName}
        />
      )}
    </div>
  )
}
