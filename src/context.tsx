import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { resolveCurrentUserId, clearDevUserId } from './api/devAuth'
import { firebaseConfigured } from './firebase'
import { onFirebaseAuthChange, firebaseSignOut } from './api/firebaseAuth'
import { fetchBackendUser, mapBackendRoles, resolveAuthDestination } from './api/session'
import type { StatusTone } from './components/tokens'
import type { IconName } from './components/icons'
import {
  useProjectsQuery, useCreateProjectMutation, useFundProjectMutation,
  useSubmitEvidenceMutation, useDecideApprovalMutation, useDisputeMilestoneMutation,
} from './api/projects'
import { useJobsQuery, useCreateJobMutation, useBidsQuery, useCreateBidMutation } from './api/tenders'
import { useLandListingsQuery, useCreateListingMutation, useUpdateVerificationStatusMutation } from './api/land'
import { useLandOffersQuery } from './api/landOffers'
import { useContractorProfilesQuery } from './api/contractors'
import { useNotificationsQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation } from './api/notifications'

export type Role = 'funder' | 'recipient' | 'contractor' | 'seller' | null

export type Lang = 'en' | 'fr'

export interface MilestoneApprover {
  userId: string
  userName: string
  status: 'pending' | 'approved' | 'rejected'
}

export interface MilestoneEvidence {
  id: string
  type: string
  fileUrl: string
  notes: string | null
  geotag: { lat: number; lng: number } | null
  capturedAt: string | null
  locationMatch: boolean | null
  timestampRecent: boolean | null
  duplicateFlag: boolean
}

export interface Milestone {
  id: string
  title: string
  amount: number
  status: string
  proof: boolean
  evidence: MilestoneEvidence[]
  requiresCosigner: boolean
  requiresVideo: boolean
  approvers: MilestoneApprover[]
}

export interface Project {
  id: string
  title: string
  category: string
  location: string
  totalAmount: number
  raised: number
  status: string
  recipient: string
  /** Real backend User _id for the project owner — needed to rate them or
   * start a real conversation, distinct from `recipient`'s display name. */
  recipientId?: string
  recipientRating: number
  milestones: Milestone[]
  image: string
  description: string
  daysLeft: number
  requiresMultiSig: boolean
  coSignerId?: string
  coSignerName?: string
}

export interface JobPosting {
  id: string
  title: string
  category: string
  location: string
  budget: number
  deadline: string
  bids: number
  milestones: number
  posted: string
  description: string
  status: string
  /** Real backend User _id for the tender owner — needed to start a real conversation. */
  ownerId?: string
}

export interface LandListing {
  id: string
  title: string
  region: string
  city: string
  size: string
  price: number
  verified: boolean
  titleType: string
  seller: string
  /** Real backend User _id for the seller — needed to start a real conversation. */
  sellerId?: string
  sellerRating: number | null
  disputed: boolean
  disputeReason?: string
  duplicateOfListingId?: string
  /** Set once a purchase (direct or via an accepted offer) has started — the
   * Project to fund. */
  linkedProjectId?: string
  image: string
  description: string
  docs: string[]
  /** Per-document real verification status, in the same order as `docs` —
   * separate from `docs` (a bare list of type labels) because whether a
   * specific uploaded document has actually been checked matters for
   * display, not just what document types exist. */
  documentStatuses: { type: string; verificationStatus: string }[]
}

export interface Contractor {
  id: string
  name: string
  trade: string
  location: string
  rating: number
  jobs: number
  initials: string
  verified: boolean
}

export interface Bid {
  id: string
  jobId: string
  jobTitle: string
  contractorName: string
  /** Real backend User _id for the contractor — needed to start a real conversation. */
  contractorId?: string
  price: number
  timeline: string
  materials: string
  notes: string
  status: string
  submitted: string
}

export interface Offer {
  id: string
  listingId: string
  buyerId: string
  buyerName: string
  amount: number
  counterAmount?: number
  message: string
  status: string
  date: string
}

/** Groups the backend's free-form `type` strings into the handful of
 * categories the Notifications page filters/color-codes by. */
export type NotifCategory = 'funding' | 'milestones' | 'marketplace' | 'verification' | 'messages'

export interface AppNotification {
  id: string
  icon: IconName
  category: NotifCategory
  title: string
  body: string
  /** A short highlighted fact — an amount, a status word — shown as a pill
   * on the card when the notification type has one worth surfacing. */
  stat?: { label: string; tone: StatusTone }
  /** Where the card's "View" action should take you. Absent for types with
   * nowhere more specific to go than the list itself. */
  path?: string
  time: string
  unread: boolean
}

export interface AppState {
  role: Role
  roles: NonNullable<Role>[]
  lang: Lang
  phone: string
  name: string
  /** Cloudinary URL from the backend's User.avatarUrl, or null when the
   * account has never uploaded one — every avatar-rendering spot (TopBar,
   * mobile header, ProfileScreen) falls back to an initials circle in that
   * case. See UserAvatar in components/MobileLayout.tsx. */
  avatarUrl: string | null
  /** True for an account carrying the backend's 'admin' roleType — a
   * separate staff dashboard, not one of `role`'s four consumer values (see
   * resolveAuthDestination in api/session.ts for why admin never touches
   * role/roles/onboarding at all). */
  isAdmin: boolean
  isLoggedIn: boolean
  /** True once the app has finished checking for a restored Firebase
   * session on load — false only for the brief window right after a page
   * refresh, so routing can show a splash instead of flashing the signed-out
   * landing page for an already-authenticated visitor. Always true
   * immediately when Firebase isn't configured (dev-bypass mode). */
  authChecked: boolean
  /** Real backend Mongo _id for the current dev-auth-bypass session (see
   * api/devAuth.ts) — null until resolved after login. Screens that need to
   * filter API results by "the current user" (e.g. my verification tasks) use this. */
  devUserId: string | null
  setRole: (r: Role) => void
  setRoles: (r: NonNullable<Role>[]) => void
  setLang: (l: Lang) => void
  setPhone: (p: string) => void
  setName: (n: string) => void
  setAvatarUrl: (u: string | null) => void
  setLoggedIn: (v: boolean) => void
  /** Call right after any successful Firebase sign-in (Google, email, or
   * phone). Resolves the backend User and routes based on its saved
   * onboardingCompleted flag / roles (see resolveAuthDestination):
   *   'admin'   — staff account; hydrates app state, sets isAdmin, signs
   *               the session in, and skips role/profile entirely — those
   *               are consumer-onboarding concepts that don't apply here.
   *   'home'    — onboarding already completed; hydrates app state and
   *               signs the session in so the caller skips straight to /home.
   *   'profile' — a role was already picked but setup wasn't finished;
   *               resumes there instead of asking for a role again.
   *   'role'    — brand-new account; normal first-time flow starts.
   * Only the 'home'/'admin' cases touch isLoggedIn — the other two leave it
   * alone so the in-progress role/profile screens (which set it themselves
   * once truly done) aren't short-circuited. */
  completeAuthSuccess: () => Promise<'home' | 'role' | 'profile' | 'admin'>
  /** Signs out of Firebase (if configured) and clears all local session
   * state — the one place "log out" is implemented, so every entry point
   * (Settings, an expired-session redirect, etc.) behaves identically. */
  logout: () => Promise<void>

  projects: Project[]
  projectsLoading: boolean
  addProject: (p: Omit<Project, 'id'>) => Promise<Project>
  fundProject: (id: string, amount: number, opts: { paymentProvider: 'mtn_momo' | 'orange_money'; payerPhoneNumber: string }) => Promise<{ paymentUrl?: string; status: string }>
  submitMilestoneProof: (projectId: string, milestoneId: string, files: File[], geotag?: { lat: number; lng: number } | null, notes?: string) => Promise<void>
  approveMilestone: (projectId: string, milestoneId: string) => Promise<{ project: Project; releasedEscrow: unknown }>
  disputeMilestone: (projectId: string, milestoneId: string, reason?: string) => Promise<void>

  jobs: JobPosting[]
  addJob: (j: Omit<JobPosting, 'id'>) => Promise<JobPosting>
  landListings: LandListing[]
  addListing: (l: Omit<LandListing, 'id'>) => Promise<LandListing>
  updateListingStatus: (id: string, status: 'pending' | 'verified' | 'disputed') => void
  contractors: Contractor[]
  bids: Bid[]
  addBid: (b: Omit<Bid, 'id'>) => Promise<Bid>
  offers: Offer[]

  notifications: AppNotification[]
  unreadNotifications: number
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
}

const AppContext = createContext<AppState>({} as AppState)

export function AppProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [role, setRole] = useState<Role>(null)
  const [roles, setRoles] = useState<NonNullable<Role>[]>([])
  const [lang, setLang] = useState<Lang>('en')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoggedIn, setLoggedIn] = useState(false)
  // Nothing to restore when there's no Firebase project — dev-bypass mode
  // is ready to route immediately.
  const [authChecked, setAuthChecked] = useState(!firebaseConfigured)

  // Restores a session that survived a page reload. Also fires on every
  // future Firebase auth transition (fresh sign-ins included), but only
  // ever *sets* isLoggedIn for accounts whose backend onboardingCompleted
  // flag is true — a brand-new or still-onboarding account (role picked but
  // profile setup not finished) is left alone so the in-progress role/
  // profile screens (which call setLoggedIn(true) themselves once truly
  // done) aren't short-circuited by a concurrent listener callback.
  useEffect(() => {
    if (!firebaseConfigured) return
    const unsubscribe = onFirebaseAuthChange(async (fbUser) => {
      if (fbUser) {
        const backendUser = await fetchBackendUser()
        const dest = backendUser ? resolveAuthDestination(backendUser) : null
        if (backendUser && (dest === 'home' || dest === 'admin')) {
          const mappedRoles = mapBackendRoles(backendUser.roles)
          setName(backendUser.fullName)
          setAvatarUrl(backendUser.avatarUrl)
          setIsAdmin(dest === 'admin')
          setRoles(mappedRoles)
          setRole(mappedRoles[0])
          setLoggedIn(true)
        }
      }
      setAuthChecked(true)
    })
    return unsubscribe
  }, [])

  const completeAuthSuccess = async (): Promise<'home' | 'role' | 'profile' | 'admin'> => {
    const backendUser = await fetchBackendUser()
    const dest = resolveAuthDestination(backendUser)
    if (dest !== 'home' && dest !== 'admin') {
      // Still hydrate what's already known (name, any role already picked)
      // so the resumed role/profile screen has it, without flipping
      // isLoggedIn — onboarding isn't done yet.
      if (backendUser) {
        const mappedRoles = mapBackendRoles(backendUser.roles)
        setName(backendUser.fullName)
        setAvatarUrl(backendUser.avatarUrl)
        if (mappedRoles.length > 0) {
          setRoles(mappedRoles)
          setRole(mappedRoles[0])
        }
      }
      return dest
    }
    // 'admin' skips role/roles entirely — a staff account, not a consumer
    // one, has no primary Role and no onboarding to speak of.
    if (dest === 'admin') {
      setName(backendUser!.fullName)
      setAvatarUrl(backendUser!.avatarUrl)
      setIsAdmin(true)
      setLoggedIn(true)
      return 'admin'
    }
    const mappedRoles = mapBackendRoles(backendUser!.roles)
    setName(backendUser!.fullName)
    setAvatarUrl(backendUser!.avatarUrl)
    setRoles(mappedRoles)
    setRole(mappedRoles[0])
    setLoggedIn(true)
    return 'home'
  }

  const logout = async () => {
    if (firebaseConfigured) await firebaseSignOut().catch(() => {})
    clearDevUserId()
    setLoggedIn(false)
    setRole(null)
    setRoles([])
    setName('')
    setAvatarUrl(null)
    setIsAdmin(false)
    // react-query's cache is a single app-wide store, not reset on its own
    // between sessions in the same tab. Most query keys here are scoped by
    // user id (e.g. ['projects','mine',ownerId]) so a different account
    // simply misses the old entries — but a few (['notifications'],
    // ['conversations']) key purely on the resource, not who asked for it,
    // since the backend itself scopes those responses to the caller. On a
    // shared device, logging out and back in as someone else without a
    // full page reload could otherwise flash the previous account's cached
    // notifications/messages for a moment before the refetch lands.
    // Clearing everything on logout closes that regardless of which
    // queries are/aren't user-keyed today.
    qc.clear()
  }
  const [devUserId, setDevUserIdState] = useState<string | null>(null)
  // Resolves to the real signed-in Firebase user when one exists (real
  // sign-in flows now live in Onboarding.tsx), otherwise falls back to the
  // DEV_AUTH_BYPASS demo user for the picked role — see resolveCurrentUserId.
  // Gated on isLoggedIn alone, not on `role` being truthy: a real Firebase
  // session doesn't need role at all (resolveCurrentUserId goes straight to
  // /users/me and ignores the role string entirely), and the DEV_AUTH_BYPASS
  // fallback's demo-user lookup only needs *some* placeholder role, not a
  // real one — which matters for every account whose `role` is legitimately
  // null: an admin (see resolveAuthDestination) and, now, a
  // quincaillerie-only account (see Onboarding.tsx's RoleScreen). Gating
  // this on role previously meant devUserId — and everything derived from
  // it, including a quincaillerie-only user's own myQuincaillerie lookup —
  // silently never resolved for either case.
  useEffect(() => {
    if (isLoggedIn) {
      resolveCurrentUserId(role ?? 'funder').then(setDevUserIdState).catch((err) => console.error('[auth] failed to resolve current user id', err))
    } else {
      clearDevUserId()
      setDevUserIdState(null)
    }
  }, [isLoggedIn, role])

  // Every "my data" query (activity, projects, notifications, ...) is keyed
  // without the user's id in it, so React Query's cache is only ever safe
  // to reuse across renders of the *same* signed-in identity. Without this,
  // logging out of one account and into another in the same tab (there is
  // no full page reload anywhere in that flow) would keep serving the
  // previous account's cached "my activity"/"my projects" data until each
  // query happened to revalidate on its own — exactly the bug reported
  // where a brand-new account appeared to already have activity. Skips the
  // very first resolution (prevDevUserId still null) since the cache is
  // already empty at that point — nothing to clear yet.
  const prevDevUserId = useRef<string | null>(null)
  useEffect(() => {
    if (prevDevUserId.current !== null && prevDevUserId.current !== devUserId) {
      qc.clear()
    }
    prevDevUserId.current = devUserId
  }, [devUserId, qc])

  const projectsQuery = useProjectsQuery()
  // Shows mock data only while the *first* real fetch is genuinely still in
  // flight — never once it's settled. Falling back to fake data on `isError`
  // too (the old `?? MOCK_PROJECTS`) meant a single failed fetch (a proxy
  // blip, a brief backend restart) permanently stranded a logged-in user on
  // fabricated project/milestone/recipient data for the rest of the session,
  // with no visual difference from the real thing and no way to recover
  // short of restarting the app. An empty list at least degrades honestly —
  // existing empty-states already handle "no projects" fine.
  const projects = projectsQuery.data ?? (projectsQuery.isLoading ? MOCK_PROJECTS : [])
  const createProjectMutation = useCreateProjectMutation()
  const fundProjectMutation = useFundProjectMutation()
  const submitEvidenceMutation = useSubmitEvidenceMutation()
  const decideApprovalMutation = useDecideApprovalMutation()
  const disputeMilestoneMutation = useDisputeMilestoneMutation()

  const jobsQuery = useJobsQuery()
  const jobs = jobsQuery.data ?? (jobsQuery.isLoading ? MOCK_JOBS : [])
  const createJobMutation = useCreateJobMutation()
  const bidsQuery = useBidsQuery(devUserId ? { contractorId: devUserId } : {})
  const bids = devUserId ? (bidsQuery.data ?? []) : []
  const createBidMutation = useCreateBidMutation()

  const landListingsQuery = useLandListingsQuery()
  const landListings = landListingsQuery.data ?? (landListingsQuery.isLoading ? MOCK_LAND : [])
  const createListingMutation = useCreateListingMutation()
  const updateVerificationStatusMutation = useUpdateVerificationStatusMutation()

  const contractorProfilesQuery = useContractorProfilesQuery()
  const contractors = contractorProfilesQuery.data ?? (contractorProfilesQuery.isLoading ? MOCK_CONTRACTORS : [])
  // No filter = "mine" server-side (every offer the caller is a party to,
  // as buyer or as the seller of the listing) — see api/landOffers.ts.
  const landOffersQuery = useLandOffersQuery({}, Boolean(devUserId))
  const offers = devUserId ? (landOffersQuery.data ?? []) : []

  const notificationsQuery = useNotificationsQuery(Boolean(devUserId))
  const notifications = isLoggedIn ? (notificationsQuery.data?.items ?? (notificationsQuery.isLoading ? MOCK_NOTIFICATIONS : [])) : []
  const markNotificationReadMutation = useMarkNotificationReadMutation()
  const markAllNotificationsReadMutation = useMarkAllNotificationsReadMutation()

  const addProject = async (p: Omit<Project, 'id'>) => {
    const created = await createProjectMutation.mutateAsync(p)
    return created
  }
  const fundProject = async (id: string, amount: number, opts: { paymentProvider: 'mtn_momo' | 'orange_money'; payerPhoneNumber: string }) => {
    const result = await fundProjectMutation.mutateAsync({ id, amount, ...opts })
    return result
  }
  const submitMilestoneProof = async (projectId: string, milestoneId: string, files: File[], geotag?: { lat: number; lng: number } | null, notes?: string) => {
    // The backend stores one Evidence sub-document per file (POST .../evidence
    // accepts a single file), so a multi-photo submission is one call per
    // photo, sequential to keep evidence order deterministic and avoid
    // hammering the fraud-analysis pipeline with a burst of parallel uploads.
    // The recipient's notes describe the submission as a whole, not any one
    // photo, but there's nowhere else to store them — attached to every
    // evidence entry created in this batch so a reviewer sees them regardless
    // of which entry they're looking at.
    for (const file of files) {
      await submitEvidenceMutation.mutateAsync({ projectId, milestoneId, file, geotag, notes })
    }
  }
  const approveMilestone = async (projectId: string, milestoneId: string) => {
    const result = await decideApprovalMutation.mutateAsync({ projectId, milestoneId, status: 'approved' })
    return result
  }
  const disputeMilestone = async (projectId: string, milestoneId: string, reason = 'Disputed from app') => {
    await disputeMilestoneMutation.mutateAsync({ projectId, milestoneId, reason })
  }
  const addJob = async (j: Omit<JobPosting, 'id'>) => {
    const created = await createJobMutation.mutateAsync({
      title: j.title, category: j.category, location: j.location, budget: j.budget,
      deadline: j.deadline === 'TBD' ? '' : j.deadline, milestoneCount: j.milestones, description: j.description,
    })
    return created
  }
  const addListing = async (l: Omit<LandListing, 'id'>) => {
    const created = await createListingMutation.mutateAsync({
      title: l.title, region: l.region, city: l.city, size: l.size, price: l.price, titleType: l.titleType, description: l.description,
    })
    return created
  }
  // Real admin/verifier-only endpoint (will 403 for any other role — correct
  // RBAC, not a bug). 'disputed' maps to verificationStatus 'flagged'.
  const updateListingStatus = (id: string, status: 'pending' | 'verified' | 'disputed') => {
    const verificationStatus = status === 'disputed' ? 'flagged' : status;
    updateVerificationStatusMutation.mutate({ listingId: id, verificationStatus })
  }
  const addBid = async (b: Omit<Bid, 'id'>) => {
    const created = await createBidMutation.mutateAsync({ jobId: b.jobId, price: b.price, timeline: b.timeline, materials: b.materials, notes: b.notes })
    return { ...created, jobTitle: b.jobTitle }
  }
  const markNotificationRead = (id: string) => {
    markNotificationReadMutation.mutate(id)
  }
  const markAllNotificationsRead = () => {
    markAllNotificationsReadMutation.mutate()
  }
  // Real unreadCount from the backend (a true total, not just this page's
  // count) when logged in and loaded; falls back to counting the mock list.
  const unreadNotifications = isLoggedIn && notificationsQuery.data
    ? notificationsQuery.data.unreadCount
    : notifications.filter((n) => n.unread).length

  return (
    <AppContext.Provider
      value={{
        role, roles, lang, phone, name, avatarUrl, isAdmin, isLoggedIn, authChecked, devUserId,
        setRole, setRoles, setLang, setPhone, setName, setAvatarUrl, setLoggedIn, completeAuthSuccess, logout,
        projects, projectsLoading: projectsQuery.isLoading, addProject, fundProject, submitMilestoneProof, approveMilestone, disputeMilestone,
        jobs, addJob, landListings, addListing, updateListingStatus,
        contractors, bids, addBid, offers,
        notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)

// ── Seed / mock data ────────────────────────────────────────────────────────

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Borehole — Bamenda North',
    category: 'Water & Sanitation',
    location: 'Bamenda, NW Region',
    totalAmount: 3200000,
    raised: 2100000,
    status: 'active',
    recipient: 'Emmanuel Njang',
    recipientRating: 4.8,
    milestones: [
      { id: 'm1', title: 'Site survey & permits', amount: 400000, status: 'released', proof: true, evidence: [], requiresCosigner: false, requiresVideo: false, approvers: [] },
      { id: 'm2', title: 'Drilling & casing', amount: 1400000, status: 'under_review', proof: true, evidence: [], requiresCosigner: false, requiresVideo: false, approvers: [] },
      { id: 'm3', title: 'Pump installation & testing', amount: 1400000, status: 'pending', proof: false, evidence: [], requiresCosigner: false, requiresVideo: false, approvers: [] },
    ],
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=220&fit=crop&auto=format',
    description: 'A community borehole serving 340 households in Bamenda North who currently walk 4km for clean water. Work started February 2025.',
    daysLeft: 24,
    requiresMultiSig: false,
  },
  {
    id: 'p2',
    title: 'Primary school roof — Maroua',
    category: 'Education',
    location: 'Maroua, Far North',
    totalAmount: 1800000,
    raised: 1800000,
    status: 'completed',
    recipient: 'Fatima Oumarou',
    recipientRating: 4.9,
    milestones: [
      { id: 'm1', title: 'Materials procurement', amount: 600000, status: 'released', proof: true, evidence: [], requiresCosigner: false, requiresVideo: false, approvers: [] },
      { id: 'm2', title: 'Structural work', amount: 800000, status: 'released', proof: true, evidence: [], requiresCosigner: false, requiresVideo: false, approvers: [] },
      { id: 'm3', title: 'Final roofing & inspection', amount: 400000, status: 'released', proof: true, evidence: [], requiresCosigner: false, requiresVideo: false, approvers: [] },
    ],
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=220&fit=crop&auto=format',
    description: 'Replacement of the collapsed roof on Bloc C of the Government Primary School, Maroua. 280 pupils affected.',
    daysLeft: 0,
    requiresMultiSig: false,
  },
  {
    id: 'p3',
    title: 'Maternity clinic renovation — Limbe',
    category: 'Healthcare',
    location: 'Limbe, SW Region',
    totalAmount: 5500000,
    raised: 1200000,
    status: 'active',
    recipient: 'Dr. Ngole Mbah',
    recipientRating: 4.7,
    milestones: [
      { id: 'm1', title: 'Structural assessment & plans', amount: 500000, status: 'released', proof: true, evidence: [], requiresCosigner: false, requiresVideo: false, approvers: [] },
      { id: 'm2', title: 'Foundation & walls', amount: 2000000, status: 'pending', proof: false, evidence: [], requiresCosigner: false, requiresVideo: false, approvers: [] },
      { id: 'm3', title: 'Electrical & plumbing', amount: 1500000, status: 'pending', proof: false, evidence: [], requiresCosigner: false, requiresVideo: false, approvers: [] },
      { id: 'm4', title: 'Finishing & equipment', amount: 1500000, status: 'pending', proof: false, evidence: [], requiresCosigner: false, requiresVideo: false, approvers: [] },
    ],
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=220&fit=crop&auto=format',
    description: 'Renovation of the only maternity unit serving 8 villages in Limbe District. Building has not been maintained since 2009.',
    daysLeft: 61,
    requiresMultiSig: false,
  },
]

export const MOCK_CONTRACTORS: Contractor[] = [
  {
    id: 'c1',
    name: 'Fon Ayuk Construction',
    trade: 'Civil & Masonry',
    location: 'Yaoundé',
    rating: 4.9,
    jobs: 34,
    initials: 'FA',
    verified: true,
  },
  {
    id: 'c2',
    name: 'Ndongo Mechanical Works',
    trade: 'Plumbing & Water',
    location: 'Douala',
    rating: 4.7,
    jobs: 19,
    initials: 'NM',
    verified: true,
  },
  {
    id: 'c3',
    name: 'Ekane Building Services',
    trade: 'Civil & Roofing',
    location: 'Buea',
    rating: 4.5,
    jobs: 11,
    initials: 'EB',
    verified: true,
  },
]

export const MOCK_JOBS: JobPosting[] = [
  {
    id: 'j1',
    title: 'Water pump installation — Ngaoundéré',
    category: 'Water & Sanitation',
    location: 'Ngaoundéré, Adamawa',
    budget: 1200000,
    deadline: '2025-09-15',
    bids: 4,
    milestones: 3,
    posted: '3 days ago',
    description: 'Install a solar-powered water pump serving a community of 600 people. Full milestone-based payment via escrow.',
    status: 'open',
  },
  {
    id: 'j2',
    title: 'Classroom block construction — Bafoussam',
    category: 'Education',
    location: 'Bafoussam, West',
    budget: 4500000,
    deadline: '2025-11-30',
    bids: 7,
    milestones: 5,
    posted: '1 week ago',
    description: '3-room classroom block for Lycée Technique de Bafoussam. Architectural plans provided.',
    status: 'awarded',
  },
  {
    id: 'j3',
    title: 'Electrical wiring — health post Kumba',
    category: 'Healthcare',
    location: 'Kumba, SW Region',
    budget: 650000,
    deadline: '2025-08-20',
    bids: 2,
    milestones: 2,
    posted: '5 days ago',
    description: 'Full electrical installation and solar panel wiring for a new health post. Must be licensed electrician.',
    status: 'open',
  },
]

export const MOCK_LAND: LandListing[] = [
  {
    id: 'l1',
    title: '800m² residential plot — Bastos, Yaoundé',
    region: 'Centre',
    city: 'Yaoundé',
    size: '800 m²',
    price: 28000000,
    verified: true,
    titleType: 'Freehold title deed',
    seller: 'Christophe Essama',
    sellerRating: 4.8,
    disputed: false,
    image: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=400&h=250&fit=crop&auto=format',
    description: 'Corner plot in a quiet residential street, Bastos neighbourhood. 15 minutes from Yaoundé city centre. All utilities on street.',
    docs: ['Title deed No. 2847/CNT', 'Land tax receipt 2024', 'Survey plan (geo-referenced)', 'No dispute certificate'],
    documentStatuses: [],
  },
  {
    id: 'l2',
    title: '1,200m² agricultural land — Bafoussam outskirts',
    region: 'West',
    city: 'Bafoussam',
    size: '1,200 m²',
    price: 9500000,
    verified: true,
    titleType: 'Customary land + pending title',
    seller: 'Germaine Fotso',
    sellerRating: 4.6,
    disputed: false,
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=250&fit=crop&auto=format',
    description: 'Fertile agricultural plot 4km from Bafoussam ring road. Currently producing arabica coffee. Pending freehold title being processed.',
    docs: ['Customary rights letter', 'Local council attestation', 'Survey plan', 'Title registration receipt'],
    documentStatuses: [],
  },
  {
    id: 'l3',
    title: '500m² commercial plot — Bonabéri, Douala',
    region: 'Littoral',
    city: 'Douala',
    size: '500 m²',
    price: 45000000,
    verified: false,
    titleType: 'Documents under verification',
    seller: 'Roland Mbongo',
    sellerRating: null,
    disputed: true,
    disputeReason: 'A third party has submitted a conflicting ownership claim for this plot. The platform legal team is reviewing both sets of documents before verification can proceed. Do not send funds until this is resolved.',
    image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&h=250&fit=crop&auto=format',
    description: 'Commercial plot on the Bonabéri industrial corridor. High footfall area, suitable for warehouse or retail. Documents submitted for platform verification.',
    docs: ['Purchase order', 'Local attestation (unverified)'],
    documentStatuses: [],
  },
  {
    id: 'l4',
    title: '800m² residential plot — Bastos, Yaoundé (re-listed)',
    region: 'Centre',
    city: 'Yaoundé',
    size: '800 m²',
    price: 27500000,
    verified: false,
    titleType: 'Freehold title deed (under review)',
    seller: 'Jean-Marc Owona',
    sellerRating: null,
    disputed: false,
    duplicateOfListingId: 'l1',
    image: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=400&h=250&fit=crop&auto=format',
    description: 'Corner plot in Bastos neighbourhood, Yaoundé. Recently listed — please note this closely matches another active listing on the platform.',
    docs: ['Title deed (copy)', 'Land tax receipt 2024'],
    documentStatuses: [],
  },
]

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', icon: 'checkCircle', category: 'milestones', title: 'Milestone approved', body: 'Drilling & casing — Borehole Bamenda was approved and released from escrow.', stat: { label: 'XAF 1,400,000', tone: 'success' }, path: '/funder/project/p1', time: '2h ago', unread: true },
  { id: 'n2', icon: 'clipboard', category: 'marketplace', title: 'New bid received', body: 'Fon Ayuk Construction submitted a bid for the Ngaoundéré pump job.', stat: { label: 'XAF 850,000', tone: 'info' }, path: '/funder/tender/j1/bids', time: '5h ago', unread: true },
  { id: 'n3', icon: 'camera', category: 'milestones', title: 'Proof submitted', body: 'Emmanuel Njang submitted milestone 2 evidence for your review.', path: '/funder/review/p1', time: '1 day ago', unread: true },
  { id: 'n4', icon: 'lock', category: 'funding', title: 'Funds secured', body: 'Your contribution moved into escrow for Clinic Renovation — Limbe.', stat: { label: 'XAF 1,200,000', tone: 'success' }, path: '/funder/project/p3', time: '3 days ago', unread: false },
  { id: 'n5', icon: 'compass', category: 'verification', title: 'Verification assigned', body: 'You have been assigned a new on-site verification task.', path: '/verifier/dashboard', time: '5 days ago', unread: false },
  { id: 'n6', icon: 'home', category: 'marketplace', title: 'Purchase started', body: 'A buyer started a purchase on your Bastos plot 800m² listing.', path: '/land/my-listings', time: '1 week ago', unread: false },
]

export function fmt(n: number) {
  return 'XAF ' + n.toLocaleString('fr-FR')
}

export const T: Record<string, Record<Lang, string>> = {
  welcome_title: { en: 'Send money home with certainty.', fr: 'Envoyez de l\'argent chez vous avec certitude.' },
  welcome_sub: { en: 'Verified projects, contractors, and land — before your money moves.', fr: 'Projets, entrepreneurs et terrains vérifiés — avant que votre argent ne bouge.' },
  get_started: { en: 'Get started', fr: 'Commencer' },
  sign_in: { en: 'Sign in', fr: 'Se connecter' },
  select_lang: { en: 'Choose your language', fr: 'Choisissez votre langue' },
  phone_prompt: { en: 'Enter your phone number', fr: 'Entrez votre numéro de téléphone' },
  otp_prompt: { en: 'Enter the 6-digit code sent to', fr: 'Entrez le code à 6 chiffres envoyé au' },
  choose_role: { en: 'How will you use Mboa Trust?', fr: 'Comment allez-vous utiliser Mboa Trust?' },
  role_funder: { en: 'Diaspora Funder', fr: 'Bailleur de fonds diaspora' },
  role_recipient: { en: 'Project Recipient', fr: 'Bénéficiaire de projet' },
  role_contractor: { en: 'Local Contractor', fr: 'Entrepreneur local' },
  role_seller: { en: 'Land / Property Seller', fr: 'Vendeur de terrain / propriété' },
  dashboard: { en: 'Dashboard', fr: 'Tableau de bord' },
  home: { en: 'Home', fr: 'Accueil' },
  projects: { en: 'Projects', fr: 'Projets' },
  jobs: { en: 'Jobs', fr: 'Emplois' },
  land: { en: 'Land', fr: 'Terrain' },
  profile: { en: 'Profile', fr: 'Profil' },
  notifications: { en: 'Notifications', fr: 'Notifications' },
  settings: { en: 'Settings', fr: 'Paramètres' },
  help: { en: 'How it works', fr: 'Comment ça marche' },
  withdraw: { en: 'Withdraw', fr: 'Retirer' },
  submit_proof: { en: 'Submit proof', fr: 'Soumettre la preuve' },
  rate: { en: 'Rate', fr: 'Évaluer' },
  contract: { en: 'Contract', fr: 'Contrat' },
  earnings: { en: 'Earnings', fr: 'Gains' },
  my_bids: { en: 'My bids', fr: 'Mes offres' },
  browse_jobs: { en: 'Browse jobs', fr: 'Parcourir les emplois' },
  create_listing: { en: 'Create listing', fr: 'Créer une annonce' },
  my_listings: { en: 'My listings', fr: 'Mes annonces' },
  verifier: { en: 'Verifier', fr: 'Vérificateur' },
  admin: { en: 'Admin', fr: 'Administration' },
  disputes: { en: 'Disputes', fr: 'Litiges' },
  post_job: { en: 'Post a job', fr: 'Publier un emploi' },
  schedule_visit: { en: 'Schedule visit', fr: 'Planifier la visite' },
  submission_status: { en: 'Submission status', fr: 'Statut de la soumission' },
  project_history: { en: 'Project history', fr: 'Historique des projets' },
  contractor_setup: { en: 'Contractor setup', fr: 'Configuration du contractor' },
  rate_contractor: { en: 'Rate contractor', fr: 'Évaluer le contractor' },
  rate_recipient: { en: 'Rate recipient', fr: 'Évaluer le bénéficiaire' },
  contract_summary: { en: 'Contract summary', fr: 'Résumé du contrat' },
  verification_report: { en: 'Verification report', fr: 'Rapport de vérification' },
  dispute_resolution: { en: 'Dispute resolution', fr: 'Résolution des litiges' },
  back: { en: 'Back', fr: 'Retour' },
  continue: { en: 'Continue', fr: 'Continuer' },
  cancel: { en: 'Cancel', fr: 'Annuler' },
  save_continue: { en: 'Save & continue', fr: 'Enregistrer et continuer' },
  discover_projects: { en: 'Discover Projects', fr: 'Découvrir les projets' },
  new_project: { en: 'New Project', fr: 'Nouveau projet' },
  create_project: { en: 'Create project', fr: 'Créer un projet' },
  browse: { en: 'Browse', fr: 'Parcourir' },
  activity: { en: 'Activity', fr: 'Activité' },
  wallet: { en: 'Wallet', fr: 'Portefeuille' },
  submit: { en: 'Submit', fr: 'Soumettre' },
  open_jobs: { en: 'Open Jobs', fr: 'Emplois ouverts' },
  contact_seller: { en: 'Contact seller', fr: 'Contacter le vendeur' },
  make_offer: { en: 'Make an offer', fr: 'Faire une offre' },
  recipient_profile: { en: 'Recipient Profile', fr: 'Profil du bénéficiaire' },
  contractor_profile: { en: 'Contractor Profile', fr: 'Profil du contractor' },
}
