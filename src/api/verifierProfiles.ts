import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export type VerifierApplicationStatus = 'pending' | 'approved' | 'rejected'

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

export function useUpsertVerifierProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ specialties, regions, bio, file }: { specialties: string[]; regions: string[]; bio?: string; file?: File | null }) => {
      let response
      if (file) {
        const form = new FormData()
        form.append('specialties', JSON.stringify(specialties))
        form.append('regions', JSON.stringify(regions))
        if (bio) form.append('bio', bio)
        form.append('file', file)
        response = await api.post<{ data: BackendVerifierProfile }>('/verifier-profiles/me', form)
      } else {
        response = await api.post<{ data: BackendVerifierProfile }>('/verifier-profiles/me', { specialties, regions, bio })
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
