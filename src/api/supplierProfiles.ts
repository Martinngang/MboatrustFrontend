import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

// Backend stores a 3-state applicationStatus (pending/approved/rejected) —
// mapped to this frontend-facing name/scale everywhere, so every screen
// written against the old materials.tsx mock (which used this exact name
// and 'verified' label) needed zero changes when this graduated off mock
// data onto a real backend.
export type SupplierVerificationStatus = 'pending' | 'verified' | 'rejected'

export interface SupplierProfileRecord {
  id: string
  ownerId: string
  ownerName?: string
  businessName: string
  location: { lat: number; lng: number }
  address: string
  region: string
  registeredCategories: string[]
  verificationStatus: SupplierVerificationStatus
  verificationDocUploaded: boolean
  averageRating: number
  completedOrderCount: number
  phone: string
  paymentProvider: 'mtn_momo' | 'orange_money'
  payoutPhoneNumber: string
}

interface BackendSupplierProfile {
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

const STATUS_MAP: Record<'pending' | 'approved' | 'rejected', SupplierVerificationStatus> = {
  pending: 'pending',
  approved: 'verified',
  rejected: 'rejected',
}

function mapSupplierProfile(doc: BackendSupplierProfile): SupplierProfileRecord {
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

export function useMySupplierProfileQuery(enabled = true) {
  return useQuery({
    queryKey: ['supplierProfile', 'me'],
    queryFn: async (): Promise<SupplierProfileRecord | null> => {
      const { data } = await api.get<{ data: BackendSupplierProfile | null }>('/supplier-profiles/me')
      return data.data ? mapSupplierProfile(data.data) : null
    },
    enabled,
    staleTime: 10_000,
  })
}

export function useUpsertSupplierProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      businessName: string; address: string; region: string; categories: string[]
      phone: string; paymentProvider: 'mtn_momo' | 'orange_money'; payoutPhoneNumber: string; docUploaded: boolean
    }) => {
      const { data } = await api.post<{ data: BackendSupplierProfile }>('/supplier-profiles/me', {
        businessName: input.businessName,
        address: input.address,
        region: input.region,
        registeredCategories: input.categories,
        phone: input.phone,
        paymentProvider: input.paymentProvider,
        payoutPhoneNumber: input.payoutPhoneNumber,
        verificationDocUploaded: input.docUploaded,
      })
      return mapSupplierProfile(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplierProfile'] }),
  })
}

/** Authenticated, approved-only directory — funders/contractors browse this
 * to pick a store when requesting a materials milestone. */
export function useSupplierDirectoryQuery() {
  return useQuery({
    queryKey: ['supplierDirectory'],
    queryFn: async (): Promise<SupplierProfileRecord[]> => {
      const { data } = await api.get<{ data: BackendSupplierProfile[] }>('/supplier-profiles/directory')
      return data.data.map(mapSupplierProfile)
    },
    staleTime: 10_000,
  })
}

/** Admin review queue. */
export function useSupplierApplicationsQuery(applicationStatus?: 'pending' | 'approved' | 'rejected') {
  return useQuery({
    queryKey: ['supplierApplications', applicationStatus],
    queryFn: async (): Promise<SupplierProfileRecord[]> => {
      const { data } = await api.get<{ data: BackendSupplierProfile[] }>('/supplier-profiles', { params: { applicationStatus } })
      return data.data.map(mapSupplierProfile)
    },
    staleTime: 10_000,
  })
}

export function useDecideSupplierProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) => {
      const { data } = await api.post<{ data: BackendSupplierProfile }>(`/supplier-profiles/${id}/${decision}`)
      return mapSupplierProfile(data.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplierApplications'] })
      qc.invalidateQueries({ queryKey: ['supplierDirectory'] })
    },
  })
}
