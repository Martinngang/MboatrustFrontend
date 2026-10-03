import { useQuery } from '@tanstack/react-query'
import { api } from './client'

/** Every number on a role's home dashboard, computed server-side for the
 * signed-in user only (GET /dashboard/:role — see the backend's
 * dashboardStatsService). Mobile renders the exact same payload, so a tile
 * can't read differently between the two apps.
 *
 * Kept live by `dashboard:changed` socket events (see realtime.ts), plus a
 * refetch whenever the tab regains focus — the app-wide QueryClient turns
 * that off by default, but a dashboard left open in a background tab must
 * never come back showing stale money. */

export interface FunderDashboard {
  role: 'funder'
  stats: { totalFunded: number; activeProjects: number; pendingReviews: number }
  activeProjects: {
    id: string
    title: string
    location: string
    totalAmount: number
    raised: number
    fundedAmount: number
    releasedAmount: number
    unfundedAmount: number
    fundingMode: 'staged' | 'full_upfront'
    status: string
    currentMilestone: { title: string; status: string } | null
    needsMyReview: boolean
  }[]
  pendingReviews: { projectId: string; projectTitle: string; milestoneId: string; milestoneTitle: string; amount: number; status: string }[]
  newBrowsableProjectsThisWeek: number
}

export interface ContractorDashboard {
  role: 'contractor'
  stats: { activeBids: number; completedJobs: number; rating: number | null; ratingCount: number; availablePayout: number; openTenderCount: number; awaitingFundingCount: number; atRiskAmount: number }
  isKycVerified: boolean
  openBids: { id: string; projectId: string | null; projectTitle: string; price: number; awaitingMyResponse: boolean }[]
  featuredTender: { id: string; title: string; location: string; budget: number; bidCount: number; matchesTrade: boolean } | null
}

export interface SupplierDashboard {
  role: 'supplier'
  hasProfile: boolean
  applicationStatus: 'pending' | 'approved' | 'rejected' | null
  stats: { pendingOrders: number; readyToShip: number; outForDelivery: number; completedOrders: number; rating: number | null; ratingCount: number; paidOut: number }
}

export interface SellerDashboard {
  role: 'seller'
  stats: { listings: number; verifiedListings: number; pendingOffers: number }
  pendingOffers: { id: string; listingId: string; listingTitle: string; amount: number; message: string }[]
  firstUnverifiedListing: { id: string; title: string; verificationStatus: string; titleType: string } | null
}

export interface VerifierDashboardData {
  role: 'verifier'
  stats: { assigned: number; inProgress: number; completed: number; rating: number | null; ratingCount: number }
}

interface DashboardByRole {
  funder: FunderDashboard
  contractor: ContractorDashboard
  supplier: SupplierDashboard
  seller: SellerDashboard
  verifier: VerifierDashboardData
}
export type DashboardRole = keyof DashboardByRole

export function useDashboardQuery<R extends DashboardRole>(role: R, enabled = true) {
  return useQuery({
    queryKey: ['dashboard', role],
    queryFn: async (): Promise<DashboardByRole[R]> => {
      const { data } = await api.get<{ data: DashboardByRole[R] }>(`/dashboard/${role}`)
      return data.data
    },
    enabled,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  })
}

/** "4.3" with a count, or "—" when nobody has rated yet (never a fake 0.0). */
export function formatRating(rating: number | null, count: number): string {
  return rating == null || count === 0 ? '—' : rating.toFixed(1)
}
