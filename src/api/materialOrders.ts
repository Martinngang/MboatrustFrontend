import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface MaterialOrderItem {
  /** Null when hand-typed rather than picked from the store's own catalog. */
  inventoryItemId: string | null
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export type MaterialOrderStatus = 'requested' | 'confirmed' | 'rejected' | 'out_for_delivery' | 'delivered' | 'cancelled'

export interface DeliveryConfirmation {
  geotag: { lat: number; lng: number } | null
  timestamp: string
  confirmedBy: string
  confirmedByName: string
}

export interface MaterialOrderRecord {
  id: string
  projectId: string
  projectTitle: string
  milestoneId: string
  milestoneTitle: string
  supplierId: string
  supplierName: string
  requestedBy: string
  requestedByName: string
  items: MaterialOrderItem[]
  totalAmount: number
  status: MaterialOrderStatus
  rejectionReason: string
  deliveryAddress: string
  estimatedDeliveryDate: string | null
  /** Synthetic marker (not a real generated file) — mirrors the "structured
   * data, not a bolted-on file" convention the former mock established: a
   * confirmed order's own items/totalAmount/confirmedAt already render as
   * the receipt (see MaterialOrderCard), this just flags "there is one". */
  digitalReceiptUrl: string | null
  deliveryConfirmation: DeliveryConfirmation | null
  createdAt: string
  confirmedAt: string | null
}

interface BackendRef { _id: string }
interface BackendMaterialOrder {
  _id: string
  projectId: (BackendRef & { title: string; milestones: { _id: string; name: string }[] }) | null
  milestoneId: string
  supplierId: (BackendRef & { businessName: string }) | null
  requestedBy: (BackendRef & { fullName: string }) | null
  items: MaterialOrderItem[]
  totalAmount: number
  status: MaterialOrderStatus
  rejectionReason: string
  deliveryAddress: string
  estimatedDeliveryDate: string | null
  deliveryConfirmation: {
    geotag: { lat: number | null; lng: number | null } | null
    timestamp: string | null
    confirmedBy: (BackendRef & { fullName: string }) | null
  } | null
  createdAt: string
  confirmedAt: string | null
}

function mapOrder(doc: BackendMaterialOrder): MaterialOrderRecord {
  const milestone = doc.projectId?.milestones.find((m) => m._id === doc.milestoneId)
  return {
    id: doc._id,
    projectId: doc.projectId?._id ?? '',
    projectTitle: doc.projectId?.title ?? 'Project',
    milestoneId: doc.milestoneId,
    milestoneTitle: milestone?.name ?? '',
    supplierId: doc.supplierId?._id ?? '',
    supplierName: doc.supplierId?.businessName ?? 'Supplier',
    requestedBy: doc.requestedBy?._id ?? '',
    requestedByName: doc.requestedBy?.fullName ?? '',
    items: doc.items ?? [],
    totalAmount: doc.totalAmount,
    status: doc.status,
    rejectionReason: doc.rejectionReason ?? '',
    deliveryAddress: doc.deliveryAddress ?? '',
    estimatedDeliveryDate: doc.estimatedDeliveryDate,
    digitalReceiptUrl: doc.confirmedAt ? `receipt-${doc._id}` : null,
    deliveryConfirmation: doc.deliveryConfirmation && doc.deliveryConfirmation.timestamp
      ? {
          geotag: doc.deliveryConfirmation.geotag?.lat != null && doc.deliveryConfirmation.geotag?.lng != null
            ? { lat: doc.deliveryConfirmation.geotag.lat, lng: doc.deliveryConfirmation.geotag.lng }
            : null,
          timestamp: doc.deliveryConfirmation.timestamp,
          confirmedBy: doc.deliveryConfirmation.confirmedBy?._id ?? '',
          confirmedByName: doc.deliveryConfirmation.confirmedBy?.fullName ?? '',
        }
      : null,
    createdAt: doc.createdAt,
    confirmedAt: doc.confirmedAt,
  }
}

export interface RequestMaterialOrderInput {
  projectId: string
  milestoneId: string
  supplierId: string
  items: Omit<MaterialOrderItem, 'subtotal'>[]
  deliveryAddress?: string
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['materialOrders'] })
}

export function useCreateMaterialOrderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: RequestMaterialOrderInput) => {
      const { data } = await api.post<{ data: BackendMaterialOrder }>('/material-orders', input)
      return mapOrder(data.data)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

/** The current user's own requests, across every project — "my requests". */
export function useMyMaterialOrdersQuery(enabled = true) {
  return useQuery({
    queryKey: ['materialOrders', 'mine'],
    queryFn: async (): Promise<MaterialOrderRecord[]> => {
      const { data } = await api.get<{ data: BackendMaterialOrder[] }>('/material-orders/mine')
      return data.data.map(mapOrder)
    },
    enabled,
    staleTime: 5_000,
  })
}

/** Incoming orders for the caller's own supplier — the store owner's dashboard queue. */
export function useMaterialOrdersForMySupplierQuery(status?: MaterialOrderStatus | 'all', enabled = true) {
  return useQuery({
    queryKey: ['materialOrders', 'forSupplier', status],
    queryFn: async (): Promise<MaterialOrderRecord[]> => {
      const { data } = await api.get<{ data: BackendMaterialOrder[] }>('/material-orders/for-supplier', {
        params: status && status !== 'all' ? { status } : undefined,
      })
      return data.data.map(mapOrder)
    },
    enabled,
    staleTime: 5_000,
  })
}

/** Every order tied to one milestone, visible to any real party of that
 * project or the fulfilling supplier. */
export function useMaterialOrdersForMilestoneQuery(projectId: string | undefined, milestoneId: string | undefined) {
  return useQuery({
    queryKey: ['materialOrders', 'forMilestone', projectId, milestoneId],
    queryFn: async (): Promise<MaterialOrderRecord[]> => {
      const { data } = await api.get<{ data: BackendMaterialOrder[] }>(
        `/material-orders/projects/${projectId}/milestones/${milestoneId}`
      )
      return data.data.map(mapOrder)
    },
    enabled: Boolean(projectId) && Boolean(milestoneId),
    staleTime: 5_000,
  })
}

export function useConfirmMaterialOrderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      orderId, items, deliveryAddress, estimatedDeliveryDate,
    }: { orderId: string; items?: MaterialOrderItem[]; deliveryAddress?: string; estimatedDeliveryDate?: string }) => {
      const { data } = await api.post<{ data: BackendMaterialOrder }>(`/material-orders/${orderId}/confirm`, {
        items, deliveryAddress, estimatedDeliveryDate,
      })
      return mapOrder(data.data)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useRejectMaterialOrderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const { data } = await api.post<{ data: BackendMaterialOrder }>(`/material-orders/${orderId}/reject`, { reason })
      return mapOrder(data.data)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useMarkOrderOutForDeliveryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.post<{ data: BackendMaterialOrder }>(`/material-orders/${orderId}/out-for-delivery`)
      return mapOrder(data.data)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useConfirmMaterialDeliveryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId, geotagLat, geotagLng }: { orderId: string; geotagLat?: number; geotagLng?: number }) => {
      const { data } = await api.post<{ data: BackendMaterialOrder }>(`/material-orders/${orderId}/confirm-delivery`, {
        geotagLat, geotagLng,
      })
      return mapOrder(data.data)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCancelMaterialOrderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.post<{ data: BackendMaterialOrder }>(`/material-orders/${orderId}/cancel`)
      return mapOrder(data.data)
    },
    onSuccess: () => invalidateAll(qc),
  })
}
