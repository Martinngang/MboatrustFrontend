import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface FeeConfigRow {
  id: string
  feeType: string
  value: number
  isFlat: boolean
  updatedAt: string
}

interface BackendFeeConfig {
  _id: string
  feeType: string
  value: number
  isFlat: boolean
  updatedAt: string
}

function mapFeeConfig(c: BackendFeeConfig): FeeConfigRow {
  return { id: c._id, feeType: c.feeType, value: c.value, isFlat: c.isFlat, updatedAt: c.updatedAt }
}

// Public read (matches feeConfigRoutes.js's GET / — no auth required, every
// fee preview in the consumer app reads from it too), reused here for the
// admin editor rather than duplicating the endpoint.
export function useFeeConfigQuery() {
  return useQuery({
    queryKey: ['feeConfig'],
    queryFn: async (): Promise<FeeConfigRow[]> => {
      const { data } = await api.get<{ data: BackendFeeConfig[] }>('/fee-config')
      return data.data.map(mapFeeConfig)
    },
    staleTime: 10_000,
  })
}

export function useUpsertFeeConfigMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { feeType: string; value: number; isFlat: boolean }) => {
      const { data } = await api.put<{ data: BackendFeeConfig }>('/fee-config', input)
      return mapFeeConfig(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feeConfig'] }),
  })
}

export function useRemoveFeeConfigMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (feeType: string) => {
      await api.delete(`/fee-config/${feeType}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feeConfig'] }),
  })
}
