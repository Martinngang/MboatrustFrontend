import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { api } from './client'
import { fetchRatingSummary } from './reputation'
import { getNextPageParam, type PageMeta } from './pagination'
import type { LandListing } from '../context'

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=400&h=250&fit=crop&auto=format'

interface BackendDocument { type: string; fileUrl: string; verificationStatus: string }
interface BackendLandListing {
  _id: string
  title: string
  region: string
  city: string
  titleType: string
  description: string
  imageUrl: string
  sizeSqm: number
  price: number
  location: { lat: number | null; lng: number | null }
  documents: BackendDocument[]
  verificationStatus: string
  disputeFlag: boolean
  disputeReason: string
  duplicateOfListingId: string | null
  linkedProjectId: string | null
  sellerId: { _id: string; fullName: string } | string
}

// A brand new seller with zero ratings yet shouldn't display as "0 stars" —
// a neutral 4.5 is a reasonable prior until they earn real ratings.
const NEW_SELLER_RATING = 4.5

function mapListing(doc: BackendLandListing, sellerRating: number): LandListing {
  return {
    id: doc._id,
    title: doc.title || 'Untitled listing',
    region: doc.region,
    city: doc.city,
    size: `${doc.sizeSqm} m²`,
    price: doc.price,
    verified: doc.verificationStatus === 'verified',
    titleType: doc.titleType || 'Documents under verification',
    seller: typeof doc.sellerId === 'object' ? doc.sellerId.fullName : 'Unknown',
    sellerId: typeof doc.sellerId === 'object' ? doc.sellerId._id : doc.sellerId,
    sellerRating,
    disputed: doc.disputeFlag,
    disputeReason: doc.disputeReason || undefined,
    duplicateOfListingId: doc.duplicateOfListingId || undefined,
    linkedProjectId: doc.linkedProjectId || undefined,
    image: doc.imageUrl || DEFAULT_IMAGE,
    description: doc.description || '',
    docs: doc.documents.map((d) => d.type),
    documentStatuses: doc.documents.map((d) => ({ type: d.type, verificationStatus: d.verificationStatus })),
  }
}

export function useLandListingsQuery() {
  return useQuery({
    queryKey: ['landListings'],
    queryFn: async (): Promise<LandListing[]> => {
      const { data } = await api.get<{ data: BackendLandListing[] }>('/land-listings')
      const ratings = await Promise.all(
        data.data.map((l) => (typeof l.sellerId === 'object' ? fetchRatingSummary(l.sellerId._id) : Promise.resolve({ average: null, count: 0 })))
      )
      return data.data.map((l, i) => mapListing(l, ratings[i].average ?? NEW_SELLER_RATING))
    },
    staleTime: 10_000,
  })
}

/** Paginated feed for BrowseLandScreen specifically — useLandListingsQuery
 * above stays as-is (used broadly across the app for dashboards/admin
 * lookups that legitimately want the full small dataset); only the
 * high-traffic browse screen needs real "load more" instead of silently
 * capping at the backend's default page size. */
export function useLandListingsInfiniteQuery(limit = 12) {
  return useInfiniteQuery({
    queryKey: ['landListings', 'infinite'],
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<{ items: LandListing[]; meta: PageMeta }> => {
      const { data } = await api.get<{ data: BackendLandListing[]; meta: PageMeta }>('/land-listings', { params: { page: pageParam, limit } })
      const ratings = await Promise.all(
        data.data.map((l) => (typeof l.sellerId === 'object' ? fetchRatingSummary(l.sellerId._id) : Promise.resolve({ average: null, count: 0 })))
      )
      return { items: data.data.map((l, i) => mapListing(l, ratings[i].average ?? NEW_SELLER_RATING)), meta: data.meta }
    },
    initialPageParam: 1,
    getNextPageParam,
    staleTime: 10_000,
  })
}

function parseSizeSqm(size: string): number {
  const n = parseFloat(size)
  return Number.isFinite(n) && n > 0 ? n : 1
}

export interface CreateListingInput {
  title: string
  region: string
  city: string
  size: string
  price: number
  titleType: string
  description: string
}

export function useCreateListingMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (l: CreateListingInput): Promise<LandListing> => {
      const { data } = await api.post<{ data: BackendLandListing }>('/land-listings', {
        title: l.title,
        region: l.region,
        city: l.city,
        titleType: l.titleType,
        description: l.description,
        sizeSqm: parseSizeSqm(l.size),
        price: l.price,
      })
      return mapListing(data.data, NEW_SELLER_RATING)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landListings'] }),
  })
}

export function useAddLandDocumentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ listingId, file, type }: { listingId: string; file: File; type: string }): Promise<LandListing> => {
      const form = new FormData()
      form.append('file', file)
      form.append('type', type)
      const { data } = await api.post<{ data: BackendLandListing }>(`/land-listings/${listingId}/documents`, form)
      const sellerId = typeof data.data.sellerId === 'object' ? data.data.sellerId._id : data.data.sellerId
      const rating = await fetchRatingSummary(sellerId)
      return mapListing(data.data, rating.average ?? NEW_SELLER_RATING)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landListings'] }),
  })
}

/** Admin/verifier-only — will 403 for any other role, which is correct RBAC
 * behavior rather than a bug: only a verifier should be able to mark a
 * listing verified or flagged. */
export function useUpdateVerificationStatusMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ listingId, verificationStatus, disputeReason }: {
      listingId: string; verificationStatus: 'unverified' | 'pending' | 'verified' | 'flagged'; disputeReason?: string
    }) => {
      const { data } = await api.patch(`/land-listings/${listingId}/verification-status`, { verificationStatus, disputeReason })
      const sellerId = typeof data.data.sellerId === 'object' ? data.data.sellerId._id : data.data.sellerId
      const rating = await fetchRatingSummary(sellerId)
      return mapListing(data.data, rating.average ?? NEW_SELLER_RATING)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landListings'] }),
  })
}

// ── Recommended for you (opt-in, additive to the main browse feed) ──────
export interface RecommendedListing {
  listingId: string
  title: string
  region: string
  city: string
  price: number
  sizeSqm: number
  imageUrl: string
  verificationStatus: string
  score: { total: number; breakdown: Record<string, number> }
}

// ── Admin management ─────────────────────────────────────────────────────
export interface AdminLandListingRow {
  id: string
  title: string
  region: string
  city: string
  sellerName: string
  price: number
  verificationStatus: string
  disputeFlag: boolean
  createdAt: string
}

interface BackendAdminLandListing {
  _id: string
  title: string
  region: string
  city: string
  price: number
  verificationStatus: string
  disputeFlag: boolean
  sellerId: { fullName: string } | string
  createdAt: string
}

/** Admin's own list — search + status filter, no per-row rating fetch
 * (useLandListingsQuery's N+1 is fine for consumer browse, wasteful for a
 * management table that doesn't show star ratings). */
export function useAdminLandListingsQuery(filter: { search?: string; verificationStatus?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['adminLandListings', filter],
    queryFn: async (): Promise<{ listings: AdminLandListingRow[]; total: number }> => {
      const { data } = await api.get<{ data: BackendAdminLandListing[]; meta: { total: number } }>('/land-listings', {
        params: { ...filter, limit: filter.limit ?? 200 },
      })
      return {
        listings: data.data.map((l) => ({
          id: l._id,
          title: l.title || 'Untitled listing',
          region: l.region,
          city: l.city,
          sellerName: typeof l.sellerId === 'object' ? l.sellerId.fullName : 'Unknown',
          price: l.price,
          verificationStatus: l.verificationStatus,
          disputeFlag: l.disputeFlag,
          createdAt: l.createdAt,
        })),
        total: data.meta.total,
      }
    },
    staleTime: 10_000,
  })
}

export interface AdminUpdateListingInput {
  title?: string
  region?: string
  city?: string
  price?: number
  description?: string
}

/** Admin edit of any listing's core fields — reuses the same PATCH
 * /land-listings/:id a seller edits their own listing through; the backend
 * now accepts either the owning seller or an admin (see
 * landListingController.update's admin bypass). */
export function useAdminUpdateListingMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ listingId, input }: { listingId: string; input: AdminUpdateListingInput }) => {
      const { data } = await api.patch<{ data: BackendAdminLandListing }>(`/land-listings/${listingId}`, input)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminLandListings'] }),
  })
}

export function useAdminRemoveListingMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (listingId: string) => {
      await api.delete(`/land-listings/${listingId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminLandListings'] }),
  })
}

export interface AdminLandOffer {
  id: string
  buyerName: string
  offerAmount: number
  status: string
  createdAt: string
}

export function useLandOffersForListingQuery(listingId: string | undefined) {
  return useQuery({
    queryKey: ['landOffers', 'forListing', listingId],
    queryFn: async (): Promise<AdminLandOffer[]> => {
      const { data } = await api.get<{ data: { _id: string; buyerId: { fullName: string } | string; offerAmount: number; status: string; createdAt: string }[] }>(`/land-listings/${listingId}/offers`)
      return data.data.map((o) => ({
        id: o._id,
        buyerName: typeof o.buyerId === 'object' ? o.buyerId.fullName : 'Unknown',
        offerAmount: o.offerAmount,
        status: o.status,
        createdAt: o.createdAt,
      }))
    },
    enabled: Boolean(listingId),
    staleTime: 10_000,
  })
}

export interface AdminVisitRequest {
  id: string
  requestedByName: string
  status: string
  confirmedDate: string | null
  createdAt: string
}

export function useVisitRequestsForListingQuery(listingId: string | undefined) {
  return useQuery({
    queryKey: ['visitRequests', 'forListing', listingId],
    queryFn: async (): Promise<AdminVisitRequest[]> => {
      const { data } = await api.get<{ data: { _id: string; requestedBy: { fullName: string } | string; status: string; confirmedDate: string | null; createdAt: string }[] }>(`/land-listings/${listingId}/visit-requests`)
      return data.data.map((v) => ({
        id: v._id,
        requestedByName: typeof v.requestedBy === 'object' ? v.requestedBy.fullName : 'Unknown',
        status: v.status,
        confirmedDate: v.confirmedDate,
        createdAt: v.createdAt,
      }))
    },
    enabled: Boolean(listingId),
    staleTime: 10_000,
  })
}

export function useRecommendedListingsQuery(enabled = true) {
  return useQuery({
    queryKey: ['recommendedListings'],
    queryFn: async (): Promise<RecommendedListing[]> => {
      const { data } = await api.get<{ data: RecommendedListing[] }>('/land-listings/recommended')
      return data.data
    },
    enabled,
    staleTime: 30_000,
  })
}

