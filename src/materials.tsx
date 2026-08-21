import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useApp } from './context'

// ── Quincaillerie actor type ──────────────────────────────────────────────
// Frontend-only mock data for now (explicit product decision — this is a
// new pillar being prototyped before real backend investment, unlike every
// other pillar in this app, which is already real). Shaped to match what
// the real QuincaillerieProfile/InventoryItem/MaterialOrder Mongoose models
// would look like, and structured as its own Provider (the same pattern
// team.tsx/templates.tsx used before *they* graduated to a real backend),
// so swapping this for real API hooks later touches this file only, not
// every screen that reads it.

export type QuincaillerieVerificationStatus = 'unverified' | 'pending' | 'verified'

export interface QuincaillerieProfile {
  id: string
  businessName: string
  /** Real backend User _id, once this graduates off mock data. */
  ownerId?: string
  ownerName: string
  location: { lat: number; lng: number }
  address: string
  region: string
  // Free-form strings, not an enum — matches Project.category/
  // ContractorProfile.categories' existing "let the market define the
  // list" convention rather than a fixed taxonomy.
  registeredCategories: string[]
  verificationStatus: QuincaillerieVerificationStatus
  verificationDocUploaded: boolean
  averageRating: number
  completedOrderCount: number
  phone: string
  paymentProvider: 'mtn_momo' | 'orange_money'
  payoutPhoneNumber: string
}

export interface InventoryItem {
  id: string
  quincaillerieId: string
  itemName: string
  category: string
  unit: 'bag' | 'sheet' | 'meter' | 'unit' | 'roll' | 'litre'
  currentPrice: number
  lastUpdatedAt: string
}

export interface MaterialOrderItem {
  /** Null when hand-typed rather than picked from the store's own catalog. */
  inventoryItemId: string | null
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export type MaterialOrderStatus = 'requested' | 'confirmed' | 'fulfilled' | 'delivered' | 'disputed' | 'rejected'

export interface DeliveryConfirmation {
  geotag: { lat: number; lng: number } | null
  timestamp: string
  confirmedBy: string
}

export interface MaterialOrder {
  id: string
  projectId: string
  projectTitle: string
  milestoneId: string
  milestoneTitle: string
  quincaillerieId: string
  quincaillerieName: string
  requestedBy: string
  requestedById?: string
  items: MaterialOrderItem[]
  totalAmount: number
  status: MaterialOrderStatus
  rejectionReason?: string
  /** Set once confirmed — this is the "Evidence" entry for a materials
   * milestone, same role a photo/video plays for a normal one. Held as a
   * truthy marker; the receipt itself renders from the order's own
   * items/totalAmount/confirmedAt fields (see MaterialReceiptCard),
   * matching "structured data, not a bolted-on file" rather than actually
   * generating a PDF client-side. */
  digitalReceiptUrl: string | null
  deliveryConfirmation: DeliveryConfirmation | null
  createdAt: string
  confirmedAt: string | null
}

/** What the real backend's milestone-release logic would decide: normally
 * disburses to the milestone's usual payee, but a materials milestone with
 * a confirmed order routes straight to the quincaillerie instead. */
export function resolveMilestonePayee(order: MaterialOrder | undefined): {
  payeeType: 'recipient' | 'quincaillerie'
  payoutLabel: string
} {
  if (order && (order.status === 'confirmed' || order.status === 'fulfilled' || order.status === 'delivered')) {
    return { payeeType: 'quincaillerie', payoutLabel: `Paid directly to ${order.quincaillerieName}` }
  }
  return { payeeType: 'recipient', payoutLabel: 'Paid to project recipient' }
}

let idCounter = 1
const nextId = (prefix: string) => `${prefix}${idCounter++}`

const SEED_QUINCAILLERIES: QuincaillerieProfile[] = [
  {
    id: 'q1', businessName: 'Douala Quincaillerie Centrale', ownerName: 'Paul Etoundi',
    location: { lat: 4.0511, lng: 9.7679 }, address: 'Akwa, Rue de la Joie', region: 'Littoral',
    registeredCategories: ['Cement', 'Roofing', 'Plumbing'], verificationStatus: 'verified',
    verificationDocUploaded: true, averageRating: 4.6, completedOrderCount: 38,
    phone: '+237 677 100 200', paymentProvider: 'mtn_momo', payoutPhoneNumber: '+237 677 100 200',
  },
  {
    id: 'q2', businessName: 'Bamenda Building Supplies', ownerName: 'Grace Nfor',
    location: { lat: 5.9631, lng: 10.1591 }, address: 'Commercial Avenue', region: 'North West',
    registeredCategories: ['Cement', 'Timber', 'Electrical'], verificationStatus: 'verified',
    verificationDocUploaded: true, averageRating: 4.3, completedOrderCount: 21,
    phone: '+237 675 300 400', paymentProvider: 'orange_money', payoutPhoneNumber: '+237 695 300 400',
  },
  {
    id: 'q3', businessName: 'Yaoundé Matériaux Express', ownerName: 'Serge Mbarga',
    location: { lat: 3.848, lng: 11.5021 }, address: 'Mvan, Route Nationale 3', region: 'Centre',
    registeredCategories: ['Roofing', 'Plumbing', 'Electrical', 'Timber'], verificationStatus: 'pending',
    verificationDocUploaded: true, averageRating: 0, completedOrderCount: 0,
    phone: '+237 699 500 600', paymentProvider: 'mtn_momo', payoutPhoneNumber: '+237 699 500 600',
  },
]

const SEED_INVENTORY: InventoryItem[] = [
  { id: 'i1', quincaillerieId: 'q1', itemName: 'Cement (50kg bag)', category: 'Cement', unit: 'bag', currentPrice: 6200, lastUpdatedAt: '2026-08-10T09:00:00Z' },
  { id: 'i2', quincaillerieId: 'q1', itemName: 'Roofing sheets (aluminium, 2m)', category: 'Roofing', unit: 'sheet', currentPrice: 3900, lastUpdatedAt: '2026-08-10T09:00:00Z' },
  { id: 'i3', quincaillerieId: 'q1', itemName: 'PVC pipe (110mm, 3m)', category: 'Plumbing', unit: 'unit', currentPrice: 5400, lastUpdatedAt: '2026-08-05T09:00:00Z' },
  { id: 'i4', quincaillerieId: 'q2', itemName: 'Cement (50kg bag)', category: 'Cement', unit: 'bag', currentPrice: 5900, lastUpdatedAt: '2026-08-12T09:00:00Z' },
  { id: 'i5', quincaillerieId: 'q2', itemName: 'Timber (2x4, per length)', category: 'Timber', unit: 'meter', currentPrice: 2300, lastUpdatedAt: '2026-08-12T09:00:00Z' },
  { id: 'i6', quincaillerieId: 'q2', itemName: 'Electrical cable (2.5mm, per roll)', category: 'Electrical', unit: 'roll', currentPrice: 18500, lastUpdatedAt: '2026-08-01T09:00:00Z' },
]

const SEED_ORDERS: MaterialOrder[] = []

interface MaterialsState {
  quincailleries: QuincaillerieProfile[]
  inventory: InventoryItem[]
  materialOrders: MaterialOrder[]
  myQuincaillerie: QuincaillerieProfile | null
  registerQuincaillerie: (input: {
    businessName: string; address: string; region: string; categories: string[]
    phone: string; paymentProvider: 'mtn_momo' | 'orange_money'; payoutPhoneNumber: string; docUploaded: boolean
  }) => QuincaillerieProfile
  getInventoryForQuincaillerie: (quincaillerieId: string) => InventoryItem[]
  addInventoryItem: (quincaillerieId: string, input: { itemName: string; category: string; unit: InventoryItem['unit']; currentPrice: number }) => void
  updateInventoryItem: (id: string, patch: Partial<Pick<InventoryItem, 'itemName' | 'category' | 'unit' | 'currentPrice'>>) => void
  removeInventoryItem: (id: string) => void
  requestMaterialOrder: (input: {
    projectId: string; projectTitle: string; milestoneId: string; milestoneTitle: string
    quincaillerieId: string; requestedBy: string; requestedById?: string; items: Omit<MaterialOrderItem, 'subtotal'>[]
  }) => MaterialOrder
  confirmMaterialOrder: (orderId: string, adjustedItems?: MaterialOrderItem[]) => void
  rejectMaterialOrder: (orderId: string, reason: string) => void
  markOrderDelivered: (orderId: string, geotag: { lat: number; lng: number } | null, confirmedBy: string) => void
  getMaterialOrderForMilestone: (milestoneId: string) => MaterialOrder | undefined
  getOrdersForQuincaillerie: (quincaillerieId: string) => MaterialOrder[]
}

const MaterialsContext = createContext<MaterialsState | null>(null)

export function MaterialsProvider({ children }: { children: ReactNode }) {
  const { devUserId } = useApp()
  const [quincailleries, setQuincailleries] = useState<QuincaillerieProfile[]>(SEED_QUINCAILLERIES)
  const [inventory, setInventory] = useState<InventoryItem[]>(SEED_INVENTORY)
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>(SEED_ORDERS)

  const myQuincaillerie = quincailleries.find((q) => q.ownerId === devUserId) ?? null

  const registerQuincaillerie = useCallback<MaterialsState['registerQuincaillerie']>((input) => {
    const created: QuincaillerieProfile = {
      id: nextId('q'),
      businessName: input.businessName,
      ownerId: devUserId ?? undefined,
      ownerName: 'You',
      location: { lat: 0, lng: 0 },
      address: input.address,
      region: input.region,
      registeredCategories: input.categories,
      verificationStatus: 'pending',
      verificationDocUploaded: input.docUploaded,
      averageRating: 0,
      completedOrderCount: 0,
      phone: input.phone,
      paymentProvider: input.paymentProvider,
      payoutPhoneNumber: input.payoutPhoneNumber,
    }
    setQuincailleries((qs) => [created, ...qs])
    return created
  }, [devUserId])

  const getInventoryForQuincaillerie = useCallback(
    (quincaillerieId: string) => inventory.filter((i) => i.quincaillerieId === quincaillerieId),
    [inventory]
  )

  const addInventoryItem = useCallback<MaterialsState['addInventoryItem']>((quincaillerieId, input) => {
    setInventory((items) => [
      { id: nextId('i'), quincaillerieId, itemName: input.itemName, category: input.category, unit: input.unit, currentPrice: input.currentPrice, lastUpdatedAt: new Date().toISOString() },
      ...items,
    ])
  }, [])

  const updateInventoryItem = useCallback<MaterialsState['updateInventoryItem']>((id, patch) => {
    setInventory((items) => items.map((i) => (i.id === id ? { ...i, ...patch, lastUpdatedAt: new Date().toISOString() } : i)))
  }, [])

  const removeInventoryItem = useCallback<MaterialsState['removeInventoryItem']>((id) => {
    setInventory((items) => items.filter((i) => i.id !== id))
  }, [])

  const requestMaterialOrder = useCallback<MaterialsState['requestMaterialOrder']>((input) => {
    const quincaillerie = quincailleries.find((q) => q.id === input.quincaillerieId)
    const items: MaterialOrderItem[] = input.items.map((it) => ({ ...it, subtotal: it.quantity * it.unitPrice }))
    const created: MaterialOrder = {
      id: nextId('mo'),
      projectId: input.projectId,
      projectTitle: input.projectTitle,
      milestoneId: input.milestoneId,
      milestoneTitle: input.milestoneTitle,
      quincaillerieId: input.quincaillerieId,
      quincaillerieName: quincaillerie?.businessName ?? 'Quincaillerie',
      requestedBy: input.requestedBy,
      requestedById: input.requestedById,
      items,
      totalAmount: items.reduce((s, it) => s + it.subtotal, 0),
      status: 'requested',
      digitalReceiptUrl: null,
      deliveryConfirmation: null,
      createdAt: new Date().toISOString(),
      confirmedAt: null,
    }
    setMaterialOrders((os) => [created, ...os])
    return created
  }, [quincailleries])

  const confirmMaterialOrder = useCallback<MaterialsState['confirmMaterialOrder']>((orderId, adjustedItems) => {
    setMaterialOrders((os) => os.map((o) => {
      if (o.id !== orderId) return o
      const items = adjustedItems ?? o.items
      return {
        ...o,
        items,
        totalAmount: items.reduce((s, it) => s + it.subtotal, 0),
        status: 'confirmed',
        digitalReceiptUrl: `receipt-${o.id}`,
        confirmedAt: new Date().toISOString(),
      }
    }))
  }, [])

  const rejectMaterialOrder = useCallback<MaterialsState['rejectMaterialOrder']>((orderId, reason) => {
    setMaterialOrders((os) => os.map((o) => (o.id === orderId ? { ...o, status: 'rejected', rejectionReason: reason } : o)))
  }, [])

  const markOrderDelivered = useCallback<MaterialsState['markOrderDelivered']>((orderId, geotag, confirmedBy) => {
    setMaterialOrders((os) => os.map((o) => (
      o.id === orderId
        ? { ...o, status: 'delivered', deliveryConfirmation: { geotag, timestamp: new Date().toISOString(), confirmedBy } }
        : o
    )))
  }, [])

  const getMaterialOrderForMilestone = useCallback(
    (milestoneId: string) => materialOrders.find((o) => o.milestoneId === milestoneId),
    [materialOrders]
  )

  const getOrdersForQuincaillerie = useCallback(
    (quincaillerieId: string) => materialOrders.filter((o) => o.quincaillerieId === quincaillerieId),
    [materialOrders]
  )

  return (
    <MaterialsContext.Provider value={{
      quincailleries, inventory, materialOrders, myQuincaillerie,
      registerQuincaillerie, getInventoryForQuincaillerie, addInventoryItem, updateInventoryItem, removeInventoryItem,
      requestMaterialOrder, confirmMaterialOrder, rejectMaterialOrder, markOrderDelivered,
      getMaterialOrderForMilestone, getOrdersForQuincaillerie,
    }}>
      {children}
    </MaterialsContext.Provider>
  )
}

/** Live regional average, computed from registered quincailleries' actual
 * inventory prices — replaces marketplace.tsx's static reference table
 * wherever real data exists for a material/region pair. Matches loosely
 * (case-insensitive substring) since a store's own item name ("Cement
 * (50kg bag)") won't always exactly equal the estimator's material list
 * entry. Returns null (never a fabricated number) when no registered,
 * verified store in that region has priced anything matching — callers
 * fall back to the static table in that case. */
export function estimateLiveMaterialPrice(
  materialName: string,
  region: string,
  quincailleries: QuincaillerieProfile[],
  inventory: InventoryItem[]
): { low: number; high: number; unit: string; sampleSize: number } | null {
  const regionalQuincaillerieIds = new Set(
    quincailleries.filter((q) => q.verificationStatus === 'verified' && q.region === region).map((q) => q.id)
  )
  const keyword = materialName.split('(')[0].trim().toLowerCase()
  const matches = inventory.filter(
    (i) => regionalQuincaillerieIds.has(i.quincaillerieId) && i.itemName.toLowerCase().includes(keyword)
  )
  if (matches.length === 0) return null

  const prices = matches.map((m) => m.currentPrice).sort((a, b) => a - b)
  return {
    low: prices[0],
    high: prices[prices.length - 1],
    unit: `per ${matches[0].unit}`,
    sampleSize: matches.length,
  }
}

export function useMaterials() {
  const ctx = useContext(MaterialsContext)
  if (!ctx) throw new Error('useMaterials must be used within a MaterialsProvider')
  return ctx
}
