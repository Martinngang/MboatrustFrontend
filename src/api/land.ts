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

