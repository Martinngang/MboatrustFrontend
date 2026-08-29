import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

// Backend stores a 3-state applicationStatus (pending/approved/rejected) —
// mapped to this frontend-facing name/scale everywhere, so every screen
// written against the old materials.tsx mock (which used this exact name
// and 'verified' label) needed zero changes when this graduated off mock
// data onto a real backend.
export type QuincaillerieVerificationStatus = 'pending' | 'verified' | 'rejected'

export interface QuincaillerieProfileRecord {
  id: string
  ownerId: string
  ownerName?: string
  businessName: string
  location: { lat: number; lng: number }
  address: string
  region: string
  registeredCategories: string[]
  verificationStatus: QuincaillerieVerificationStatus
  verificationDocUploaded: boolean
  averageRating: number
  completedOrderCount: number
  phone: string
  paymentProvider: 'mtn_momo' | 'orange_money'
  payoutPhoneNumber: string
}

interface BackendQuincaillerieProfile {
  _id: string
  ownerId: { _id: string; fullName: string; email?: string } | string
  businessName: string
  location: { lat: number; lng: number }
  address: string
  region: string
  registeredCategories: string[]
  applicationStatus: 'pending' | 'approved' | 'rejected'
  verificationDocUploaded: boolean
  averageRating: number
  completedOrderCount: number
  phone: string
  paymentProvider: 'mtn_momo' | 'orange_money'
  payoutPhoneNumber: string
}

const STATUS_MAP: Record<'pending' | 'approved' | 'rejected', QuincaillerieVerificationStatus> = {
  pending: 'pending',
  approved: 'verified',
  rejected: 'rejected',
}

function mapQuincaillerieProfile(doc: BackendQuincaillerieProfile): QuincaillerieProfileRecord {
  return {
    id: doc._id,
    ownerId: typeof doc.ownerId === 'object' ? doc.ownerId._id : doc.ownerId,
    ownerName: typeof doc.ownerId === 'object' ? doc.ownerId.fullName : undefined,
    businessName: doc.businessName,
    location: doc.location,
    address: doc.address,
    region: doc.region,
    registeredCategories: doc.registeredCategories,
    verificationStatus: STATUS_MAP[doc.applicationStatus],
    verificationDocUploaded: doc.verificationDocUploaded,
    averageRating: doc.averageRating,
    completedOrderCount: doc.completedOrderCount,
    phone: doc.phone,
    paymentProvider: doc.paymentProvider,
    payoutPhoneNumber: doc.payoutPhoneNumber,
  }
}

export function useMyQuincaillerieProfileQuery(enabled = true) {
  return useQuery({
    queryKey: ['quincaillerieProfile', 'me'],
    queryFn: async (): Promise<QuincaillerieProfileRecord | null> => {
      const { data } = await api.get<{ data: BackendQuincaillerieProfile | null }>('/quincaillerie-profiles/me')
      return data.data ? mapQuincaillerieProfile(data.data) : null
    },
    enabled,
    staleTime: 10_000,
  })
}

export function useUpsertQuincaillerieProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      businessName: string; address: string; region: string; categories: string[]
      phone: string; paymentProvider: 'mtn_momo' | 'orange_money'; payoutPhoneNumber: string; docUploaded: boolean
    }) => {
      const { data } = await api.post<{ data: BackendQuincaillerieProfile }>('/quincaillerie-profiles/me', {
        businessName: input.businessName,
        address: input.address,
        region: input.region,
        registeredCategories: input.categories,
        phone: input.phone,
        paymentProvider: input.paymentProvider,
        payoutPhoneNumber: input.payoutPhoneNumber,
        verificationDocUploaded: input.docUploaded,
      })
      return mapQuincaillerieProfile(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quincaillerieProfile'] }),
  })
}

/** Authenticated, approved-only directory — funders/recipients browse this
 * to pick a store when requesting a materials milestone. */
export function useQuincaillerieDirectoryQuery() {
  return useQuery({
    queryKey: ['quincaillerieDirectory'],
    queryFn: async (): Promise<QuincaillerieProfileRecord[]> => {
      const { data } = await api.get<{ data: BackendQuincaillerieProfile[] }>('/quincaillerie-profiles/directory')
      return data.data.map(mapQuincaillerieProfile)
    },
    staleTime: 10_000,
  })
}

/** Admin review queue. */
export function useQuincaillerieApplicationsQuery(applicationStatus?: 'pending' | 'approved' | 'rejected') {
  return useQuery({
    queryKey: ['quincaillerieApplications', applicationStatus],
    queryFn: async (): Promise<QuincaillerieProfileRecord[]> => {
      const { data } = await api.get<{ data: BackendQuincaillerieProfile[] }>('/quincaillerie-profiles', { params: { applicationStatus } })
      return data.data.map(mapQuincaillerieProfile)
    },
    staleTime: 10_000,
  })
}

export function useDecideQuincaillerieProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) => {
      const { data } = await api.post<{ data: BackendQuincaillerieProfile }>(`/quincaillerie-profiles/${id}/${decision}`)
      return mapQuincaillerieProfile(data.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quincaillerieApplications'] })
      qc.invalidateQueries({ queryKey: ['quincaillerieDirectory'] })
    },
  })
}
