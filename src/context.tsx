import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useActivityLog } from './activityLog'
import { resolveCurrentUserId, clearDevUserId } from './api/devAuth'
import {
  useProjectsQuery, useCreateProjectMutation, useFundProjectMutation,
  useSubmitEvidenceMutation, useDecideApprovalMutation, useDisputeMilestoneMutation,
} from './api/projects'
import { useJobsQuery, useCreateJobMutation, useBidsQuery, useCreateBidMutation } from './api/tenders'
import { useLandListingsQuery, useCreateListingMutation, useUpdateVerificationStatusMutation } from './api/land'
import { useNotificationsQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation } from './api/notifications'

export type Role = 'funder' | 'recipient' | 'contractor' | 'seller' | null

export type Lang = 'en' | 'fr'

export interface Milestone {
  id: string
  title: string
  amount: number
  status: string
  proof: boolean
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
  recipientRating: number
  milestones: Milestone[]
  image: string
  description: string
  daysLeft: number
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
  image: string
  description: string
  docs: string[]
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
  price: string
  timeline: string
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
  buyerName: string
  amount: number
  message: string
  status: string
  date: string
}

export interface Rating {
  id: string
  targetType: 'recipient' | 'contractor'
  targetName: string
  rating: number
  comment: string
  from: string
  date: string
}

export interface AppNotification {
  id: string
  icon: string
  title: string
  body: string
  time: string
  unread: boolean
}

export interface AppState {
  role: Role
  roles: NonNullable<Role>[]
  lang: Lang
  phone: string
  name: string
  isLoggedIn: boolean
  /** Real backend Mongo _id for the current dev-auth-bypass session (see
   * api/devAuth.ts) — null until resolved after login. Screens that need to
   * filter API results by "the current user" (e.g. my verification tasks) use this. */
  devUserId: string | null
  setRole: (r: Role) => void
  setRoles: (r: NonNullable<Role>[]) => void
  setLang: (l: Lang) => void
  setPhone: (p: string) => void
  setName: (n: string) => void
  setLoggedIn: (v: boolean) => void

  projects: Project[]
  projectsLoading: boolean
  addProject: (p: Omit<Project, 'id'>) => Promise<Project>
  fundProject: (id: string, amount: number, opts: { paymentProvider: 'mtn_momo' | 'orange_money'; payerPhoneNumber: string }) => Promise<{ paymentUrl?: string; status: string }>
  submitMilestoneProof: (projectId: string, milestoneId: string, file?: File, geotag?: { lat: number; lng: number } | null) => Promise<void>
  approveMilestone: (projectId: string, milestoneId: string) => Promise<void>
  disputeMilestone: (projectId: string, milestoneId: string, reason?: string) => Promise<void>
  updateProjectStatus: (id: string, status: string) => void

  jobs: JobPosting[]
  addJob: (j: Omit<JobPosting, 'id'>) => Promise<JobPosting>
  updateJobStatus: (id: string, status: string) => void
  landListings: LandListing[]
  addListing: (l: Omit<LandListing, 'id'>) => Promise<LandListing>
  updateListingStatus: (id: string, status: 'pending' | 'verified' | 'disputed') => void
  contractors: Contractor[]
  addContractor: (c: Omit<Contractor, 'id'>) => Contractor
  bids: Bid[]
  addBid: (b: Omit<Bid, 'id'>) => Promise<Bid>
  offers: Offer[]
  addOffer: (o: Omit<Offer, 'id'>) => Offer
  ratings: Rating[]
  addRating: (r: Omit<Rating, 'id'>) => Rating

  notifications: AppNotification[]
  unreadNotifications: number
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
}

const AppContext = createContext<AppState>({} as AppState)

let idCounter = 1000
const nextId = (prefix: string) => `${prefix}${idCounter++}`

export function AppProvider({ children }: { children: ReactNode }) {
  const { logActivity } = useActivityLog()
  const [role, setRole] = useState<Role>(null)
  const [roles, setRoles] = useState<NonNullable<Role>[]>([])
  const [lang, setLang] = useState<Lang>('en')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [isLoggedIn, setLoggedIn] = useState(false)

  const qc = useQueryClient()
  const [devUserId, setDevUserIdState] = useState<string | null>(null)
  // Resolves to the real signed-in Firebase user when one exists (real
  // sign-in flows now live in Onboarding.tsx), otherwise falls back to the
  // DEV_AUTH_BYPASS demo user for the picked role — see resolveCurrentUserId.
  useEffect(() => {
    if (isLoggedIn && role) {
      resolveCurrentUserId(role).then(setDevUserIdState).catch((err) => console.error('[auth] failed to resolve current user id', err))
    } else {
      clearDevUserId()
      setDevUserIdState(null)
    }
  }, [isLoggedIn, role])

  const projectsQuery = useProjectsQuery()
  // Shows mock data instantly while the first real fetch is in flight, then
  // swaps to real backend data — avoids every existing screen that assumes
  // `projects[0]` exists needing a loading-state guard added for this pass.
  const projects = projectsQuery.data ?? MOCK_PROJECTS
  const createProjectMutation = useCreateProjectMutation()
  const fundProjectMutation = useFundProjectMutation()
  const submitEvidenceMutation = useSubmitEvidenceMutation()
  const decideApprovalMutation = useDecideApprovalMutation()
  const disputeMilestoneMutation = useDisputeMilestoneMutation()

  const jobsQuery = useJobsQuery()
  const jobs = jobsQuery.data ?? MOCK_JOBS
  const createJobMutation = useCreateJobMutation()
  const bidsQuery = useBidsQuery(devUserId ? { contractorId: devUserId } : {})
  const bids = devUserId ? (bidsQuery.data ?? []) : []
  const createBidMutation = useCreateBidMutation()

  const landListingsQuery = useLandListingsQuery()
  const landListings = landListingsQuery.data ?? MOCK_LAND
  const createListingMutation = useCreateListingMutation()
  const updateVerificationStatusMutation = useUpdateVerificationStatusMutation()

  const [contractors, setContractors] = useState<Contractor[]>(MOCK_CONTRACTORS)
  const [offers, setOffers] = useState<Offer[]>([])
  const [ratings, setRatings] = useState<Rating[]>([])

  const notificationsQuery = useNotificationsQuery(Boolean(devUserId))
  const notifications = isLoggedIn ? (notificationsQuery.data?.items ?? MOCK_NOTIFICATIONS) : []
  const markNotificationReadMutation = useMarkNotificationReadMutation()
  const markAllNotificationsReadMutation = useMarkAllNotificationsReadMutation()

  const addProject = async (p: Omit<Project, 'id'>) => {
    const created = await createProjectMutation.mutateAsync(p)
    logActivity({ type: 'project_created', icon: '📁', title: 'Project created', detail: created.title, path: `/funder/project/${created.id}` })
    return created
  }
  const fundProject = async (id: string, amount: number, opts: { paymentProvider: 'mtn_momo' | 'orange_money'; payerPhoneNumber: string }) => {
    const p = projects.find((x) => x.id === id)
    const result = await fundProjectMutation.mutateAsync({ id, amount, ...opts })
    logActivity({ type: 'project_funded', icon: '🔒', title: 'Funds secured', detail: p ? `${fmt(amount)} moved into escrow for ${p.title}` : fmt(amount), path: `/funder/project/${id}` })
    return result
  }
  const submitMilestoneProof = async (projectId: string, milestoneId: string, file?: File, geotag?: { lat: number; lng: number } | null) => {
    await submitEvidenceMutation.mutateAsync({ projectId, milestoneId, file, geotag })
    const p = projects.find((x) => x.id === projectId)
    const m = p?.milestones.find((x) => x.id === milestoneId)
    logActivity({ type: 'milestone_submitted', icon: '📸', title: 'Proof submitted', detail: p && m ? `${m.title} — ${p.title}` : undefined, path: `/funder/project/${projectId}` })
  }
  const approveMilestone = async (projectId: string, milestoneId: string) => {
    await decideApprovalMutation.mutateAsync({ projectId, milestoneId, status: 'approved' })
    const p = projects.find((x) => x.id === projectId)
    const m = p?.milestones.find((x) => x.id === milestoneId)
    logActivity({ type: 'milestone_approved', icon: '✅', title: 'Milestone approved', detail: p && m ? `${m.title} — ${p.title} · ${fmt(m.amount)} released` : undefined, path: `/funder/project/${projectId}` })
  }
  const disputeMilestone = async (projectId: string, milestoneId: string, reason = 'Disputed from app') => {
    await disputeMilestoneMutation.mutateAsync({ projectId, milestoneId, reason })
    const p = projects.find((x) => x.id === projectId)
    const m = p?.milestones.find((x) => x.id === milestoneId)
    logActivity({ type: 'milestone_disputed', icon: '🚩', title: 'Dispute raised', detail: p && m ? `${m.title} — ${p.title}` : undefined, path: `/funder/project/${projectId}` })
  }
  // No generic "set arbitrary status" backend endpoint exists (real
  // transitions happen via fund/evidence/approval) — this stays a
  // client-side-only patch for the Workspace Board/bulk-action demo view.
  const updateProjectStatus = (id: string, status: string) => {
    qc.setQueryData<Project[]>(['projects'], (ps) => (ps ?? projects).map((p) => (p.id === id ? { ...p, status } : p)))
    const p = projects.find((x) => x.id === id)
    logActivity({ type: 'project_status_changed', icon: '🔄', title: 'Project status changed', detail: p ? `${p.title} → ${status}` : status, path: `/funder/project/${id}` })
  }
  const addJob = async (j: Omit<JobPosting, 'id'>) => {
    const created = await createJobMutation.mutateAsync({
      title: j.title, category: j.category, location: j.location, budget: j.budget,
      deadline: j.deadline === 'TBD' ? '' : j.deadline, milestoneCount: j.milestones, description: j.description,
    })
    logActivity({ type: 'project_created', icon: '📋', title: 'Tender posted', detail: created.title, path: `/contractor/job/${created.id}` })
    return created
  }
  // No generic "set arbitrary status" endpoint for tenders either (real
  // transitions happen via bid accept/reject) — client-side-only patch for
  // the Workspace Board/bulk-action demo view, same reasoning as projects.
  const updateJobStatus = (id: string, status: string) => {
    qc.setQueryData<JobPosting[]>(['jobs'], (js) => (js ?? jobs).map((j) => (j.id === id ? { ...j, status } : j)))
  }
  const addListing = async (l: Omit<LandListing, 'id'>) => {
    const created = await createListingMutation.mutateAsync({
      title: l.title, region: l.region, city: l.city, size: l.size, price: l.price, titleType: l.titleType, description: l.description,
    })
    logActivity({ type: 'listing_created', icon: '🏡', title: 'Land listing created', detail: created.title, path: `/land/listing/${created.id}` })
    return created
  }
  // Real admin/verifier-only endpoint (will 403 for any other role — correct
  // RBAC, not a bug). 'disputed' maps to verificationStatus 'flagged'.
  const updateListingStatus = (id: string, status: 'pending' | 'verified' | 'disputed') => {
    const verificationStatus = status === 'disputed' ? 'flagged' : status;
    updateVerificationStatusMutation.mutate({ listingId: id, verificationStatus })
  }
  const addContractor = (c: Omit<Contractor, 'id'>) => {
    const created = { ...c, id: nextId('c') }
    setContractors((cs) => [created, ...cs])
    return created
  }
  const addBid = async (b: Omit<Bid, 'id'>) => {
    const created = await createBidMutation.mutateAsync({ jobId: b.jobId, price: b.price, timeline: b.timeline, materials: b.materials, notes: b.notes })
    logActivity({ type: 'bid_placed', icon: '📋', title: 'Bid placed', detail: `${fmt(b.price)} for ${b.jobTitle}`, path: `/contractor/job/${b.jobId}` })
    return { ...created, jobTitle: b.jobTitle }
  }
  const addOffer = (o: Omit<Offer, 'id'>) => {
    const created = { ...o, id: nextId('o') }
    setOffers((os) => [created, ...os])
    logActivity({ type: 'offer_made', icon: '🤝', title: 'Offer made', detail: fmt(o.amount), path: `/land/listing/${o.listingId}` })
    return created
  }
  const addRating = (r: Omit<Rating, 'id'>) => {
    const created = { ...r, id: nextId('r') }
    setRatings((rs) => [created, ...rs])
    return created
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
        role, roles, lang, phone, name, isLoggedIn, devUserId,
        setRole, setRoles, setLang, setPhone, setName, setLoggedIn,
        projects, projectsLoading: projectsQuery.isLoading, addProject, fundProject, submitMilestoneProof, approveMilestone, disputeMilestone, updateProjectStatus,
        jobs, addJob, updateJobStatus, landListings, addListing, updateListingStatus,
        contractors, addContractor, bids, addBid, offers, addOffer, ratings, addRating,
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
      { id: 'm1', title: 'Site survey & permits', amount: 400000, status: 'released', proof: true },
      { id: 'm2', title: 'Drilling & casing', amount: 1400000, status: 'under_review', proof: true },
      { id: 'm3', title: 'Pump installation & testing', amount: 1400000, status: 'pending', proof: false },
    ],
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=220&fit=crop&auto=format',
    description: 'A community borehole serving 340 households in Bamenda North who currently walk 4km for clean water. Work started February 2025.',
    daysLeft: 24,
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
      { id: 'm1', title: 'Materials procurement', amount: 600000, status: 'released', proof: true },
      { id: 'm2', title: 'Structural work', amount: 800000, status: 'released', proof: true },
      { id: 'm3', title: 'Final roofing & inspection', amount: 400000, status: 'released', proof: true },
    ],
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=220&fit=crop&auto=format',
    description: 'Replacement of the collapsed roof on Bloc C of the Government Primary School, Maroua. 280 pupils affected.',
    daysLeft: 0,
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
      { id: 'm1', title: 'Structural assessment & plans', amount: 500000, status: 'released', proof: true },
      { id: 'm2', title: 'Foundation & walls', amount: 2000000, status: 'pending', proof: false },
      { id: 'm3', title: 'Electrical & plumbing', amount: 1500000, status: 'pending', proof: false },
      { id: 'm4', title: 'Finishing & equipment', amount: 1500000, status: 'pending', proof: false },
    ],
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=220&fit=crop&auto=format',
    description: 'Renovation of the only maternity unit serving 8 villages in Limbe District. Building has not been maintained since 2009.',
    daysLeft: 61,
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
    price: 'XAF 850,000',
    timeline: '6 weeks',
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
    price: 'XAF 920,000',
    timeline: '7 weeks',
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
    price: 'XAF 780,000',
    timeline: '5 weeks',
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
  },
]

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', icon: '✅', title: 'Milestone approved', body: 'Drilling & casing — Borehole Bamenda was approved. XAF 1,400,000 released.', time: '2h ago', unread: true },
  { id: 'n2', icon: '📋', title: 'New bid received', body: 'Fon Ayuk Construction submitted a bid of XAF 850,000 for Ngaoundéré pump job.', time: '5h ago', unread: true },
  { id: 'n3', icon: '📸', title: 'Proof submitted', body: 'Emmanuel Njang submitted milestone 2 evidence for your review.', time: '1 day ago', unread: true },
  { id: 'n4', icon: '🔒', title: 'Funds secured', body: 'XAF 1,200,000 moved into escrow for Clinic Renovation — Limbe.', time: '3 days ago', unread: false },
  { id: 'n5', icon: '✅', title: 'Contractor verified', body: 'Ndongo Mechanical Works has been verified on the platform.', time: '5 days ago', unread: false },
  { id: 'n6', icon: '🏡', title: 'Land listing verified', body: 'Bastos plot 800m² has completed document verification.', time: '1 week ago', unread: false },
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
