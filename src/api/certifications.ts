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

/** Any one contractor's certifications, by id — the public portfolio view
 * a funder sees uses this (GET /contractor-certifications/:userId), separate
 * from useMyCertificationsQuery's self-only /me. */
export function useCertificationsForUserQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['certifications', 'user', userId],
    queryFn: async (): Promise<Certification[]> => {
      const { data } = await api.get<{ data: BackendCertification[] }>(`/contractor-certifications/${userId}`)
      return data.data.map(mapCertification)
    },
    enabled: Boolean(userId),
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
    mutationFn: async ({ name, issuer, file }: { name: string; issuer: string; file: File }) => {
      const form = new FormData()
      form.append('title', name)
      form.append('issuer', issuer)
      form.append('file', file)
      const { data } = await api.post<{ data: BackendCertification }>('/contractor-certifications', form)
      return mapCertification(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certifications'] }),
  })
}

/** Self-service delete of the caller's own certification — reuses
 * DELETE /contractor-certifications/:id, which the backend already allows
 * for the owning contractor, not just an admin (see the controller's
 * isOwner check). Previously only exposed via the admin-only-named hook
 * below, so a contractor who uploaded the wrong file had no way to remove
 * it themselves. */
export function useRemoveCertificationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (certId: string) => {
      await api.delete(`/contractor-certifications/${certId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certifications'] }),
  })
}

/** Admin edit of any contractor's certification (title/issuer correction) —
 * reuses PATCH /contractor-certifications/:id, which now accepts either the
 * owning contractor or an admin (see the controller's admin bypass). */
export function useAdminUpdateCertificationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ certId, title, issuer }: { certId: string; title?: string; issuer?: string }) => {
      const { data } = await api.patch<{ data: BackendCertification }>(`/contractor-certifications/${certId}`, { title, issuer })
      return mapCertification(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certifications'] }),
  })
}

export function useAdminRemoveCertificationMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (certId: string) => {
      await api.delete(`/contractor-certifications/${certId}`)
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
