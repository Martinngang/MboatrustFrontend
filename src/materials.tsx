import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { useApp } from './context'
import {
  useMyQuincaillerieProfileQuery, useUpsertQuincaillerieProfileMutation, useQuincaillerieDirectoryQuery,
  type QuincaillerieProfileRecord, type QuincaillerieVerificationStatus,
} from './api/quincaillerieProfiles'
import type { InventoryItemRecord } from './api/inventoryItems'
import type { MaterialOrderRecord } from './api/materialOrders'

// ── Quincaillerie actor type ──────────────────────────────────────────────
// The identity/verification half (QuincaillerieProfile) is a real backend
// role+model now — see api/quincaillerieProfiles.ts. Inventory is also real
// (see api/inventoryItems.ts) and material orders are also real now (see
// api/materialOrders.ts) — screens call those hooks directly rather than
// through this context, the same "context only for the actor's own
// identity, hooks for everything else" convention inventory already
// established. This context only still holds quincaillerie
// identity/directory state.

export type { QuincaillerieVerificationStatus }
export type QuincaillerieProfile = QuincaillerieProfileRecord

// Re-exported so existing `import type { MaterialOrder } from '../materials'`
// call sites across the screens don't need to change their import path —
// the real type now lives in api/materialOrders.ts alongside the hooks that
// produce it.
export type {
  MaterialOrderRecord as MaterialOrder,
  MaterialOrderItem,
  MaterialOrderStatus,
  DeliveryConfirmation,
} from './api/materialOrders'

/** Mirrors what the real backend's milestone-release logic actually decides
 * (see projectController.releaseMilestoneEscrow, which runs this same
 * "is there a confirmed/dispatched/delivered order for this milestone"
 * check against MaterialOrder and, if so, disburses to that
 * QuincaillerieProfile's own paymentProvider/payoutPhoneNumber instead of
 * the project's usual payee): a client-side *prediction* shown before
 * approval, computed from the same order status this function reads —
 * approving now genuinely pays the quincaillerie when this returns
 * 'quincaillerie', it isn't cosmetic. */
export function resolveMilestonePayee(order: MaterialOrderRecord | undefined): {
  payeeType: 'recipient' | 'quincaillerie'
  payoutLabel: string
} {
  if (order && (order.status === 'confirmed' || order.status === 'out_for_delivery' || order.status === 'delivered')) {
    return { payeeType: 'quincaillerie', payoutLabel: `Paid directly to ${order.quincaillerieName}` }
  }
  return { payeeType: 'recipient', payoutLabel: 'Paid to project recipient' }
}

interface MaterialsState {
  quincailleries: QuincaillerieProfile[]
  myQuincaillerie: QuincaillerieProfile | null
  isLoadingMyQuincaillerie: boolean
  registerQuincaillerie: (input: {
    businessName: string; address: string; region: string; categories: string[]
    phone: string; paymentProvider: 'mtn_momo' | 'orange_money'; payoutPhoneNumber: string; docUploaded: boolean
  }) => Promise<void>
}

const MaterialsContext = createContext<MaterialsState | null>(null)

export function MaterialsProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useApp()

  const { data: myQuincaillerie = null, isLoading: isLoadingMyQuincaillerie } = useMyQuincaillerieProfileQuery(isLoggedIn)
  const { data: quincailleries = [] } = useQuincaillerieDirectoryQuery()
  const upsertMutation = useUpsertQuincaillerieProfileMutation()

  const registerQuincaillerie = useCallback<MaterialsState['registerQuincaillerie']>(async (input) => {
    await upsertMutation.mutateAsync(input)
  }, [upsertMutation])

  return (
    <MaterialsContext.Provider value={{ quincailleries, myQuincaillerie, isLoadingMyQuincaillerie, registerQuincaillerie }}>
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
  inventory: InventoryItemRecord[]
): { low: number; high: number; unit: string; sampleSize: number } | null {
  const regionalQuincaillerieIds = new Set(
    quincailleries.filter((q) => q.verificationStatus === 'verified' && q.region === region).map((q) => q.id)
  )
  const keyword = materialName.split('(')[0].trim().toLowerCase()
  const matches = inventory.filter(
    (i) => regionalQuincaillerieIds.has(i.quincaillerieId) && i.name.toLowerCase().includes(keyword)
  )
  if (matches.length === 0) return null

  const prices = matches.map((m) => m.price).sort((a, b) => a - b)
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
