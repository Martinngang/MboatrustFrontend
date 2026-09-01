import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { api } from './client'
import { getNextPageParam, type PageMeta } from './pagination'
import type { Contractor } from '../context'

export interface PortfolioImage {
  _id?: string
  url: string
  caption: string
}

interface BackendContractorProfile {
  userId: string
  fullName: string
  avatarUrl: string | null
  categories: string[]
  regions: string[]
  bio: string
  headline: string
  services: string[]
  portfolioImages: PortfolioImage[]
  yearsExperience: number
  isAvailable: boolean
  kycStatus?: string
  stats: { completedProjects: number; totalBids: number; acceptedBids: number; completionRate: number; avgRating: number | null; ratingCount: number }
}

/** Full-fidelity portfolio shape — mapContractor below lossily reduces this
 * same payload down to the simple `Contractor` card shape (one trade, one
 * region, a rating with a neutral fallback) for browse/compare lists; the
 * rich single-profile view (what a funder sees when evaluating one
 * contractor, and what the contractor manages) needs everything underneath. */
export interface ContractorPortfolio {
  userId: string
  fullName: string
  avatarUrl: string | null
  categories: string[]
  regions: string[]
  bio: string
  headline: string
  services: string[]
  portfolioImages: PortfolioImage[]
  yearsExperience: number
  isAvailable: boolean
  kycStatus?: string
  stats: BackendContractorProfile['stats']
}

function mapPortfolio(doc: BackendContractorProfile): ContractorPortfolio {
  return {
    userId: doc.userId,
    fullName: doc.fullName,
    avatarUrl: doc.avatarUrl,
    categories: doc.categories ?? [],
    regions: doc.regions ?? [],
    bio: doc.bio,
    headline: doc.headline ?? '',
    // Defensive fallback — a profile created before these fields existed on
    // the schema could theoretically still reach here without them (the
    // backend backfills defaults for exactly this case, but a crash here
    // would take down the whole screen, so this costs nothing to guard too).
    services: doc.services ?? [],
    portfolioImages: doc.portfolioImages ?? [],
    yearsExperience: doc.yearsExperience,
    isAvailable: doc.isAvailable,
    kycStatus: doc.kycStatus,
    stats: doc.stats,
  }
}

export function useContractorPortfolioQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['contractorProfiles', 'portfolio', userId],
    queryFn: async (): Promise<ContractorPortfolio> => {
      const { data } = await api.get<{ data: BackendContractorProfile }>(`/contractor-profiles/${userId}`)
      return mapPortfolio(data.data)
    },
    enabled: Boolean(userId),
    staleTime: 10_000,
  })
}

export interface CompletedWorkItem {
  id: string
  projectTitle: string
  category: string
  location: string
  completedAt: string
}

export function useContractorCompletedWorkQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['contractorCompletedWork', userId],
    queryFn: async (): Promise<CompletedWorkItem[]> => {
      const { data } = await api.get<{ data: CompletedWorkItem[] }>(`/contractor-profiles/${userId}/completed-work`)
      return data.data
    },
    enabled: Boolean(userId),
    staleTime: 10_000,
  })
}

// ── Public leaderboard ──────────────────────────────────────────────────
export interface LeaderboardRow {
  rank: number
  userId: string
  fullName: string
  avatarUrl: string | null
  kycStatus?: string
  categories: string[]
  regions: string[]
  yearsExperience: number
  stats: BackendContractorProfile['stats']
  score: { total: number; breakdown: Record<string, number> }
}

export function useContractorLeaderboardQuery(filter: { search?: string; category?: string; region?: string; verified?: boolean; page?: number; limit?: number; enabled?: boolean } = {}) {
  const { enabled = true, ...params } = filter
  return useQuery({
    queryKey: ['contractorLeaderboard', params],
    queryFn: async (): Promise<{ rows: LeaderboardRow[]; total: number }> => {
      const { data } = await api.get<{ data: LeaderboardRow[]; meta: { total: number } }>('/contractor-profiles/leaderboard', { params })
      return { rows: data.data, total: data.meta.total }
    },
    enabled,
    staleTime: 15_000,
  })
}

// A brand new contractor with zero ratings yet shouldn't display as "0
// stars" — a neutral 4.5 is a reasonable prior until they earn real ratings
// (same convention as NEW_OWNER_RATING/NEW_SELLER_RATING elsewhere).
const NEW_CONTRACTOR_RATING = 4.5

function mapContractor(doc: BackendContractorProfile): Contractor {
  const initials = doc.fullName.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '—'
  return {
    id: doc.userId,
    name: doc.fullName,
    trade: doc.categories[0] || 'General Contracting',
    location: doc.regions[0] || '',
    rating: doc.stats.avgRating ?? NEW_CONTRACTOR_RATING,
    jobs: doc.stats.completedProjects,
    initials,
    verified: doc.kycStatus === 'verified',
  }
}

export function useContractorProfilesQuery() {
  return useQuery({
    queryKey: ['contractorProfiles'],
    queryFn: async (): Promise<Contractor[]> => {
      const { data } = await api.get<{ data: BackendContractorProfile[] }>('/contractor-profiles')
      return data.data.map(mapContractor)
    },
    staleTime: 10_000,
  })
}

/** Paginated feed for the contractor directory (BidComparisonScreen)
 * specifically — useContractorProfilesQuery above stays as-is (used for
 * tender-matching lookups that legitimately want the full small dataset);
 * only the high-traffic browse screen needs real "load more" instead of
 * silently capping at the backend's default page size. */
export function useContractorProfilesInfiniteQuery(limit = 12) {
  return useInfiniteQuery({
    queryKey: ['contractorProfiles', 'infinite'],
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<{ items: Contractor[]; meta: PageMeta }> => {
      const { data } = await api.get<{ data: BackendContractorProfile[]; meta: PageMeta }>('/contractor-profiles', { params: { page: pageParam, limit } })
      return { items: data.data.map(mapContractor), meta: data.meta }
    },
    initialPageParam: 1,
    getNextPageParam,
    staleTime: 10_000,
  })
}

// ── Admin management ─────────────────────────────────────────────────────
export interface AdminContractorRow {
  userId: string
  fullName: string
  categories: string[]
  regions: string[]
  bio: string
  yearsExperience: number
  isAvailable: boolean
  kycStatus?: string
  completedProjects: number
  avgRating: number | null
  ratingCount: number
}

/** Full-fidelity rows for the admin directory — mapContractor above lossily
 * reduces this same payload down to the simple `Contractor` shape (one
 * trade, one region, a rating with a neutral fallback) for the consumer
 * directory; the admin table needs the real arrays/counts underneath. */
export function useAdminContractorsQuery(filter: { search?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['adminContractors', filter],
    queryFn: async (): Promise<{ contractors: AdminContractorRow[]; total: number }> => {
      const { data } = await api.get<{ data: BackendContractorProfile[]; meta: { total: number } }>('/contractor-profiles', {
        params: { ...filter, limit: filter.limit ?? 200 },
      })
      return {
        contractors: data.data.map((c) => ({
          userId: c.userId,
          fullName: c.fullName,
          categories: c.categories,
          regions: c.regions,
          bio: c.bio,
          yearsExperience: c.yearsExperience,
          isAvailable: c.isAvailable,
          kycStatus: c.kycStatus,
          completedProjects: c.stats.completedProjects,
          avgRating: c.stats.avgRating,
          ratingCount: c.stats.ratingCount,
        })),
        total: data.meta.total,
      }
    },
    staleTime: 10_000,
  })
}

export interface UpsertContractorProfileInput {
  categories?: string[]
  regions?: string[]
  bio?: string
  headline?: string
  services?: string[]
  yearsExperience?: number
  isAvailable?: boolean
  /** Portfolio images to keep (already-uploaded, possibly re-captioned or
   * reordered) — omit entries to remove them. Only meaningful together with
   * newPortfolioImages below; leave both undefined to not touch images at all. */
  existingPortfolioImages?: PortfolioImage[]
  newPortfolioImages?: File[]
}

/** Builds a plain JSON body when there's nothing to upload, or FormData
 * (JSON-encoding array/object fields, same convention as the supplier
 * inventory and profile upserts) when new portfolio images are attached. */
function toRequestBody(input: UpsertContractorProfileInput): FormData | Record<string, unknown> {
  const { newPortfolioImages, ...rest } = input
  if (!newPortfolioImages || newPortfolioImages.length === 0) {
    return rest
  }
  const form = new FormData()
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined) continue
    form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
  }
  for (const file of newPortfolioImages) form.append('images', file)
  return form
}

export function useUpsertMyContractorProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: UpsertContractorProfileInput) => {
      const { data } = await api.put<{ data: BackendContractorProfile }>('/contractor-profiles/me', toRequestBody(p))
      return mapPortfolio(data.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractorProfiles'] })
      qc.invalidateQueries({ queryKey: ['contractorLeaderboard'] })
    },
  })
}

/** Admin edit of any contractor's profile — reuses PUT
 * /contractor-profiles/:userId (see contractorProfileController.adminUpsert),
 * separate from the self-service PUT /contractor-profiles/me above. */
export function useAdminUpdateContractorProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, input }: { userId: string; input: UpsertContractorProfileInput }) => {
      const { data } = await api.put<{ data: BackendContractorProfile }>(`/contractor-profiles/${userId}`, input)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminContractors'] }),
  })
}

// ── Availability calendar ───────────────────────────────────────────────────
interface BackendAvailabilityEntry { date: string; isAvailable: boolean }
export type AvailabilityMap = Record<string, 'available' | 'unavailable'>

function mapAvailability(entries: BackendAvailabilityEntry[]): AvailabilityMap {
  const map: AvailabilityMap = {}
  for (const e of entries) {
    if (!e.isAvailable) map[e.date.slice(0, 10)] = 'unavailable'
  }
  return map
}

/** No userId = the caller's own calendar (GET /contractor-profiles/me,
 * authenticated); a userId views someone else's real calendar read-only
 * (GET /contractor-profiles/:userId, the same public-profile endpoint the
 * contractor directory's "View availability" link already points at). */
export function useAvailabilityQuery(userId?: string) {
  return useQuery({
    queryKey: ['contractorAvailability', userId ?? 'me'],
    queryFn: async (): Promise<AvailabilityMap> => {
      const { data } = await api.get<{ data: { availability: BackendAvailabilityEntry[] } }>(
        userId ? `/contractor-profiles/${userId}` : '/contractor-profiles/me'
      )
      return mapAvailability(data.data.availability ?? [])
    },
    staleTime: 10_000,
  })
}

export function useSetAvailabilityMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ date, isAvailable }: { date: string; isAvailable: boolean }) => {
      const { data } = await api.put('/contractor-profiles/me/availability', { dates: [{ date, isAvailable }] })
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractorAvailability', 'me'] }),
  })
}
