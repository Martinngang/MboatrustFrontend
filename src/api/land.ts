import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { fetchRatingSummary } from './reputation'
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
    image: doc.imageUrl || DEFAULT_IMAGE,
    description: doc.description || '',
    docs: doc.documents.map((d) => d.type),
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

/**
 * Starts a real purchase: creates a land_purchase Project linked to the
 * listing, then immediately funds it via the same escrow flow the funding
 * and tender pillars use. The architecture doc's data model has no
 * separate offer/counter-offer negotiation step before this — a "make an
 * offer" action on a verified listing genuinely is starting the purchase.
 */
export function useMakeOfferMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ listingId, amount, paymentProvider, payerPhoneNumber }: {
      listingId: string; amount: number; paymentProvider: 'mtn_momo' | 'orange_money'; payerPhoneNumber: string
    }) => {
      const { data: purchaseRes } = await api.post(
        `/land-listings/${listingId}/purchase`,
        { amount },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } }
      )
      const projectId = purchaseRes.data.project._id
      await api.post(
        `/projects/${projectId}/fund`,
        { amount, paymentProvider, payerPhoneNumber },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } }
      )
      return { projectId }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landListings'] }),
  })
}
