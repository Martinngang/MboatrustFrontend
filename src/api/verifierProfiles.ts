import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { mapTaskLocationDetails, type VerificationTaskLocationDetails } from './reputation'

export type VerifierApplicationStatus = 'pending' | 'approved' | 'rejected'

interface BackendLocationDetails {
  placeName?: string
  formattedAddress?: string
  source?: string
}

export interface VerifierProfileRecord {
  id: string
  userId: string
  userName?: string
  specialties: string[]
  regions: string[]
  bio: string
  idDocumentUrl: string
  applicationStatus: VerifierApplicationStatus
  isAvailable: boolean
  /** The verifier's own service-area location, when set — see
   * verifierProfileController.upsertMine. */
  coordinates?: { lat: number; lng: number } | null
  locationDetails?: VerificationTaskLocationDetails | null
}

interface BackendVerifierProfile {
  _id: string
  userId: { _id: string; fullName: string; email?: string } | string
  specialties: string[]
  regions: string[]
  bio: string
  idDocumentUrl: string
  applicationStatus: VerifierApplicationStatus
  isAvailable: boolean
  location?: { lat: number | null; lng: number | null } | null
  locationDetails?: BackendLocationDetails | null
}

function mapVerifierProfile(doc: BackendVerifierProfile): VerifierProfileRecord {
  return {
    id: doc._id,
    userId: typeof doc.userId === 'object' ? doc.userId._id : doc.userId,
    userName: typeof doc.userId === 'object' ? doc.userId.fullName : undefined,
    specialties: doc.specialties,
    regions: doc.regions,
    bio: doc.bio,
    idDocumentUrl: doc.idDocumentUrl,
    applicationStatus: doc.applicationStatus,
    isAvailable: doc.isAvailable,
    coordinates: doc.location?.lat != null && doc.location?.lng != null ? { lat: doc.location.lat, lng: doc.location.lng } : null,
    locationDetails: mapTaskLocationDetails(doc.locationDetails),
  }
}

export function useMyVerifierProfileQuery(enabled = true) {
  return useQuery({
    queryKey: ['verifierProfile', 'me'],
    queryFn: async (): Promise<VerifierProfileRecord | null> => {
      const { data } = await api.get<{ data: BackendVerifierProfile | null }>('/verifier-profiles/me')
      return data.data ? mapVerifierProfile(data.data) : null
    },
    enabled,
    staleTime: 10_000,
  })
}

export interface UpsertVerifierProfileInput {
  specialties: string[]
  regions: string[]
  bio?: string
  file?: File | null
  /** Already resolved client-side by useLocationCapture — never stored
   * without an accompanying place name/address attempt. */
  location?: { lat: number; lng: number } | null
  placeName?: string | null
  formattedAddress?: string | null
  locationSource?: string
}

export function useUpsertVerifierProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ specialties, regions, bio, file, location, placeName, formattedAddress, locationSource }: UpsertVerifierProfileInput) => {
      let response
      if (file) {
        const form = new FormData()
        form.append('specialties', JSON.stringify(specialties))
        form.append('regions', JSON.stringify(regions))
        if (bio) form.append('bio', bio)
        if (location) form.append('location', JSON.stringify(location))
        if (placeName) form.append('placeName', placeName)
        if (formattedAddress) form.append('formattedAddress', formattedAddress)
        if (locationSource) form.append('locationSource', locationSource)
        form.append('file', file)
        response = await api.post<{ data: BackendVerifierProfile }>('/verifier-profiles/me', form)
      } else {
        response = await api.post<{ data: BackendVerifierProfile }>('/verifier-profiles/me', { specialties, regions, bio, location, placeName, formattedAddress, locationSource })
      }
      return mapVerifierProfile(response.data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verifierProfile'] }),
  })
}

/** Admin review queue. */
export function useVerifierApplicationsQuery(applicationStatus?: VerifierApplicationStatus) {
  return useQuery({
    queryKey: ['verifierApplications', applicationStatus],
    queryFn: async (): Promise<VerifierProfileRecord[]> => {
      const { data } = await api.get<{ data: BackendVerifierProfile[] }>('/verifier-profiles', { params: { applicationStatus } })
      return data.data.map(mapVerifierProfile)
    },
    staleTime: 10_000,
  })
}

/** Admin edit of any verifier's profile fields — reuses PATCH
 * /verifier-profiles/:userId (see verifierProfileController.adminUpdate),
 * separate from the self-service upsert above; never touches
 * applicationStatus (approve/reject own that). */
export function useAdminUpdateVerifierProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, specialties, regions, bio }: { userId: string; specialties: string[]; regions: string[]; bio: string }) => {
      const { data } = await api.patch<{ data: BackendVerifierProfile }>(`/verifier-profiles/${userId}`, { specialties, regions, bio })
      return mapVerifierProfile(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verifierApplications'] }),
  })
}

export function useDecideVerifierApplicationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) => {
      const { data } = await api.post<{ data: BackendVerifierProfile }>(`/verifier-profiles/${id}/${decision}`)
      return mapVerifierProfile(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verifierApplications'] }),
  })
}
