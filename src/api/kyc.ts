import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

/** Transactions above this amount are blocked pending identity verification.
 * Client-side gate only — the backend has no matching server-side threshold
 * to sync to, so this stays a hand-set constant. */
export const KYC_LARGE_TXN_THRESHOLD = 1000000

/** Real account state (User.kycStatus) — no separate KYC-case model on the
 * backend, and no admin review step: verification runs synchronously
 * against Smile Identity inside POST /kyc/verify (see useSubmitKycMutation)
 * and the result is written straight onto the user. */
export function useMyKycStatusQuery() {
  return useQuery({
    queryKey: ['me', 'kycStatus'],
    queryFn: async (): Promise<KycStatus> => {
      const { data } = await api.get<{ data: { kycStatus: KycStatus } }>('/users/me')
      return data.data.kycStatus
    },
    staleTime: 10_000,
  })
}

export function useUploadKycDocumentMutation() {
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post<{ data: { url: string } }>('/users/me/documents', form)
      return data.data.url
    },
  })
}

export interface KycResult {
  verified: boolean
  resultText: string | null
  confidenceValue: string | null
}

export function useSubmitKycMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { idType: string; idNumber: string; country?: string; documentUrl?: string }): Promise<KycResult> => {
      const { data } = await api.post<{ data: { user: unknown; kycResult: { verified: boolean; resultText: string | null; confidenceValue: string | null } } }>('/kyc/verify', input)
      return data.data.kycResult
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'kycStatus'] }),
  })
}
