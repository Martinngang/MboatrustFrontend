import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { Offer } from '../context'

interface BackendLandOffer {
  _id: string
  listingId: string
  buyerId: { _id: string; fullName: string } | string
  offerAmount: number
  message: string
  status: 'pending' | 'countered' | 'accepted' | 'declined' | 'withdrawn'
  counterAmount: number | null
  createdAt: string
}

function mapOffer(doc: BackendLandOffer): Offer {
  return {
    id: doc._id,
    listingId: doc.listingId,
    buyerId: typeof doc.buyerId === 'object' ? doc.buyerId._id : doc.buyerId,
    buyerName: typeof doc.buyerId === 'object' ? doc.buyerId.fullName : 'Buyer',
    amount: doc.offerAmount,
    counterAmount: doc.counterAmount ?? undefined,
    message: doc.message,
    status: doc.status,
    date: new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  }
}

/** No filter = "mine" (the backend defaults to every offer the caller is a
 * party to — as buyer, or as the seller of the listing — see
 * landOfferController.getAll). Passing listingId narrows to one listing,
 * still scoped server-side to what the caller may see. */
export function useLandOffersQuery(filter: { listingId?: string } = {}, enabled = true) {
  return useQuery({
    queryKey: ['landOffers', filter],
    queryFn: async (): Promise<Offer[]> => {
      const { data } = await api.get<{ data: BackendLandOffer[] }>('/land-offers', { params: filter })
      return data.data.map(mapOffer)
    },
    enabled,
    staleTime: 10_000,
  })
}

function invalidateOffers(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['landOffers'] })
  qc.invalidateQueries({ queryKey: ['landListings'] })
}

export function useCreateLandOfferMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ listingId, offerAmount, message }: { listingId: string; offerAmount: number; message?: string }) => {
      const { data } = await api.post<{ data: BackendLandOffer }>('/land-offers', { listingId, offerAmount, message })
      return mapOffer(data.data)
    },
    onSuccess: (_result, vars) => {
      invalidateOffers(qc)
      qc.invalidateQueries({ queryKey: ['landOffers', { listingId: vars.listingId }] })
    },
  })
}

export function useCounterOfferMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ offerId, counterAmount }: { offerId: string; counterAmount: number }) => {
      const { data } = await api.post<{ data: BackendLandOffer }>(`/land-offers/${offerId}/counter`, { counterAmount })
      return mapOffer(data.data)
    },
    onSuccess: () => invalidateOffers(qc),
  })
}

export function useAcceptOfferMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (offerId: string) => {
      const { data } = await api.post<{ data: { offer: BackendLandOffer; project: { _id: string; totalAmount: number } } }>(
        `/land-offers/${offerId}/accept`
      )
      return { offer: mapOffer(data.data.offer), projectId: data.data.project._id, agreedAmount: data.data.project.totalAmount }
    },
    onSuccess: () => {
      invalidateOffers(qc)
      // Accepting creates a real Project (the buyer's next step is to fund it).
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeclineOfferMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (offerId: string) => {
      const { data } = await api.post<{ data: BackendLandOffer }>(`/land-offers/${offerId}/decline`)
      return mapOffer(data.data)
    },
    onSuccess: () => invalidateOffers(qc),
  })
}

export function useWithdrawOfferMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (offerId: string) => {
      const { data } = await api.post<{ data: BackendLandOffer }>(`/land-offers/${offerId}/withdraw`)
      return mapOffer(data.data)
    },
    onSuccess: () => invalidateOffers(qc),
  })
}
