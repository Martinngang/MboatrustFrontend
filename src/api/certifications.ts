import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export type CertificationStatus = 'pending' | 'verified' | 'rejected'

export interface Certification {
  id: string
  contractorId: string
  contractorName?: string
  name: string
  issuer: string
  dateUploaded: string
  status: CertificationStatus
}

interface BackendCertification {
  _id: string
  userId: { _id: string; fullName: string } | string
  title: string
  issuer: string
  verified: boolean
  rejected: boolean
  createdAt: string
}

function mapCertification(doc: BackendCertification): Certification {
  return {
    id: doc._id,
    contractorId: typeof doc.userId === 'object' ? doc.userId._id : doc.userId,
    contractorName: typeof doc.userId === 'object' ? doc.userId.fullName : undefined,
    name: doc.title,
    issuer: doc.issuer,
    dateUploaded: new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    status: doc.verified ? 'verified' : doc.rejected ? 'rejected' : 'pending',
  }
}

export function useMyCertificationsQuery() {
  return useQuery({
    queryKey: ['certifications', 'me'],
    queryFn: async (): Promise<Certification[]> => {
      const { data } = await api.get<{ data: BackendCertification[] }>('/contractor-certifications/me')
      return data.data.map(mapCertification)
    },
    staleTime: 10_000,
  })
}

/** Admin review queue — every contractor's certifications platform-wide. */
export function useAllCertificationsQuery() {
  return useQuery({
    queryKey: ['certifications', 'all'],
    queryFn: async (): Promise<Certification[]> => {
      const { data } = await api.get<{ data: BackendCertification[] }>('/contractor-certifications')
      return data.data.map(mapCertification)
    },
    staleTime: 10_000,
  })
}

export function useCreateCertificationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, issuer }: { name: string; issuer: string }) => {
      const { data } = await api.post<{ data: BackendCertification }>('/contractor-certifications', { title: name, issuer })
      return mapCertification(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certifications'] }),
  })
}

export function useDecideCertificationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ certId, status }: { certId: string; status: 'verified' | 'rejected' }) => {
      const { data } = await api.post<{ data: BackendCertification }>(`/contractor-certifications/${certId}/${status === 'verified' ? 'verify' : 'reject'}`)
      return mapCertification(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certifications'] }),
  })
}
