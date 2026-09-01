import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface Specification { key: string; value: string }
export interface Dimensions { length: number | null; width: number | null; height: number | null; unit: string; weightKg: number | null }
// Where this store itself sources the item from — an upstream vendor,
// unrelated to the platform's own Supplier role/user (hence the distinct
// name, to avoid confusion with SupplierProfileRecord elsewhere).
export interface SourcedFrom { name: string; contact: string }
export type InventoryItemStatus = 'active' | 'archived'

export interface InventoryItemRecord {
  id: string
  supplierId: string
  name: string
  sku: string
  category: string
  subcategory: string
  description: string
  images: string[]
  unit: string
  price: number
  quantityAvailable: number
  minStockLevel: number
  brand: string
  sourcedFrom: SourcedFrom
  specifications: Specification[]
  dimensions: Dimensions
  projectSuitability: string[]
  status: InventoryItemStatus
  isLowStock: boolean
  createdAt: string
  updatedAt: string
}

interface BackendInventoryItem {
  _id: string
  supplierId: string
  name: string
  sku: string
  category: string
  subcategory: string
  description: string
  images: string[]
  unit: string
  price: number
  quantityAvailable: number
  minStockLevel: number
  brand: string
  sourcedFrom: SourcedFrom
  specifications: Specification[]
  dimensions: Dimensions
  projectSuitability: string[]
  status: InventoryItemStatus
  isLowStock: boolean
  createdAt: string
  updatedAt: string
}

function mapItem(doc: BackendInventoryItem): InventoryItemRecord {
  return {
    id: doc._id,
    supplierId: doc.supplierId,
    name: doc.name,
    sku: doc.sku ?? '',
    category: doc.category,
    subcategory: doc.subcategory ?? '',
    description: doc.description ?? '',
    images: doc.images ?? [],
    unit: doc.unit,
    price: doc.price,
    quantityAvailable: doc.quantityAvailable,
    minStockLevel: doc.minStockLevel,
    brand: doc.brand ?? '',
    sourcedFrom: doc.sourcedFrom ?? { name: '', contact: '' },
    specifications: doc.specifications ?? [],
    dimensions: doc.dimensions ?? { length: null, width: null, height: null, unit: 'cm', weightKg: null },
    projectSuitability: doc.projectSuitability ?? [],
    status: doc.status,
    isLowStock: doc.isLowStock,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export interface InventoryItemInput {
  name: string
  sku?: string
  category: string
  subcategory?: string
  description?: string
  unit: string
  price: number
  quantityAvailable?: number
  minStockLevel?: number
  brand?: string
  sourcedFrom?: SourcedFrom
  specifications?: Specification[]
  dimensions?: Partial<Dimensions>
  projectSuitability?: string[]
  /** URLs already uploaded (kept from a prior save when editing). */
  existingImages?: string[]
  /** Newly picked files to upload alongside this save. */
  newImages?: File[]
}

/** Plain JSON when there are no new files to upload (the common case for
 * every field-only edit), multipart only when newImages is non-empty —
 * avoids forcing every save through multipart just because the endpoint
 * *can* accept files. */
function toRequestBody(input: InventoryItemInput): FormData | Record<string, unknown> {
  const { newImages, ...rest } = input
  if (!newImages || newImages.length === 0) {
    return rest
  }
  const form = new FormData()
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined) continue
    form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  }
  for (const file of newImages) form.append('images', file)
  return form
}

export interface InventoryFilters {
  search?: string
  category?: string
  subcategory?: string
  status?: InventoryItemStatus | 'all'
  lowStockOnly?: boolean
  sortBy?: 'name' | 'price' | 'quantityAvailable' | 'createdAt' | 'updatedAt' | 'category'
  sortDir?: 'asc' | 'desc'
  page?: number
  limit?: number
}

/** Owner's own full catalogue — every status, filterable/searchable/
 * sortable/paginated. */
export function useMyInventoryQuery(filters: InventoryFilters, enabled = true) {
  return useQuery({
    queryKey: ['inventoryItems', 'mine', filters],
    queryFn: async (): Promise<{ items: InventoryItemRecord[]; total: number }> => {
      const { data } = await api.get<{ data: BackendInventoryItem[]; meta: { total: number } }>('/inventory-items/mine', { params: filters })
      return { items: data.data.map(mapItem), total: data.meta.total }
    },
    enabled,
    staleTime: 5_000,
  })
}

/** A specific store's active-only catalogue — for browsing when requesting
 * materials on a milestone, or viewing a public supplier profile. */
export function useSupplierInventoryQuery(supplierId: string | undefined, filters: InventoryFilters = {}) {
  return useQuery({
    queryKey: ['inventoryItems', 'bySupplier', supplierId, filters],
    queryFn: async (): Promise<InventoryItemRecord[]> => {
      const { data } = await api.get<{ data: BackendInventoryItem[] }>(`/inventory-items/by-supplier/${supplierId}`, { params: filters })
      return data.data.map(mapItem)
    },
    enabled: Boolean(supplierId),
    staleTime: 10_000,
  })
}

/** Every active item platform-wide — feeds the Material Cost Estimator's
 * live-pricing comparison (cross-referenced client-side against the
 * supplier directory for region/verification). */
export function usePublicInventoryQuery() {
  return useQuery({
    queryKey: ['inventoryItems', 'public'],
    queryFn: async (): Promise<InventoryItemRecord[]> => {
      const { data } = await api.get<{ data: BackendInventoryItem[] }>('/inventory-items/public')
      return data.data.map(mapItem)
    },
    staleTime: 30_000,
  })
}

/** Single item, owner-only — used by the edit form so a direct URL
 * navigation/refresh doesn't depend on the list screen having already
 * fetched and cached this item. */
export function useInventoryItemQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['inventoryItems', 'one', id],
    queryFn: async (): Promise<InventoryItemRecord> => {
      const { data } = await api.get<{ data: BackendInventoryItem }>(`/inventory-items/${id}`)
      return mapItem(data.data)
    },
    enabled: Boolean(id),
    staleTime: 5_000,
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['inventoryItems'] })
}

export function useCreateInventoryItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: InventoryItemInput) => {
      const body = toRequestBody(input)
      const { data } = await api.post<{ data: BackendInventoryItem }>('/inventory-items', body)
      return mapItem(data.data)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateInventoryItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: InventoryItemInput }) => {
      const body = toRequestBody(input)
      const { data } = await api.patch<{ data: BackendInventoryItem }>(`/inventory-items/${id}`, body)
      return mapItem(data.data)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDuplicateInventoryItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: BackendInventoryItem }>(`/inventory-items/${id}/duplicate`)
      return mapItem(data.data)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useArchiveInventoryItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: BackendInventoryItem }>(`/inventory-items/${id}/archive`)
      return mapItem(data.data)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useRestoreInventoryItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: BackendInventoryItem }>(`/inventory-items/${id}/restore`)
      return mapItem(data.data)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteInventoryItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory-items/${id}`)
    },
    onSuccess: () => invalidateAll(qc),
  })
}

export interface BulkActionResult { matched: number }

export function useBulkInventoryActionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: 'archive' | 'restore' | 'delete' }) => {
      const { data } = await api.post<{ data: BulkActionResult }>('/inventory-items/bulk', { ids, action })
      return data.data
    },
    onSuccess: () => invalidateAll(qc),
  })
}
