import { lazy, Suspense } from 'react'
import { useApp, type LandListing } from '../context'
import { SkeletonCard } from './Skeleton'
import type { MapMarker } from './ProjectMap'

// Code-split for the same reason ProjectMap's own consumers do — Leaflet is
// ~170KB and shouldn't be in the main bundle for screens that never render
// a map.
const InlineMap = lazy(() => import('./ProjectMap').then((m) => ({ default: m.InlineMap })))

/** Real map showing this listing's own pin plus other real, geocoded
 * listings nearby — replaces the previous static background-image mockup
 * (fixed percentage pin positions, not tied to any real coordinate).
 * Degrades to InlineMap's own "Map unavailable" state when this listing has
 * no coordinates yet (created before geocoding existed, or never
 * successfully resolved) rather than showing a misleading fake map. */
export function NeighboringListingsMap({ listing }: { listing: LandListing }) {
  const { landListings } = useApp()
  const others = landListings.filter((l) => l.id !== listing.id && l.coordinates).slice(0, 8)

  const markers: MapMarker[] = [
    ...(listing.coordinates ? [{ id: listing.id, lat: listing.coordinates.lat, lng: listing.coordinates.lng, label: listing.title }] : []),
    ...others.map((l) => ({ id: l.id, lat: l.coordinates!.lat, lng: l.coordinates!.lng, label: `${l.title} — ${(l.price / 1000000).toFixed(1)}M`, kind: 'default' as const })),
  ]

  return (
    <Suspense fallback={<SkeletonCard />}>
      <InlineMap markers={markers} heightClassName="h-56" />
    </Suspense>
  )
}
