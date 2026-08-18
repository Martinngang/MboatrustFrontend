import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { api } from './client'
import { getNextPageParam, type PageMeta } from './pagination'
import type { Contractor } from '../context'

interface BackendContractorProfile {
  userId: string
  fullName: string
  avatarUrl: string | null
  categories: string[]
  regions: string[]
  bio: string
  yearsExperience: number
  isAvailable: boolean
  kycStatus?: string
  stats: { completedProjects: number; totalBids: number; acceptedBids: number; completionRate: number; avgRating: number | null; ratingCount: number }
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

export interface UpsertContractorProfileInput {
  categories?: string[]
  regions?: string[]
  bio?: string
  yearsExperience?: number
}

export function useUpsertMyContractorProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: UpsertContractorProfileInput) => {
      const { data } = await api.put<{ data: BackendContractorProfile }>('/contractor-profiles/me', p)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractorProfiles'] }),
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
