import { createContext, useContext, useState, type ReactNode } from 'react'

// ── Diaspora association / group accounts ────────────────────────────────────────
export interface DiasporaGroup {
  id: string
  name: string
  description: string
  region: string
  createdDate: string
}

export interface GroupMember {
  id: string
  groupId: string
  name: string
  phone: string
  role: 'admin' | 'member'
  joinedDate: string
}

// ── Referral system ────────────────────────────────────────────────────────────
export type ReferralStatus = 'invited' | 'joined' | 'rewarded'

export interface Referral {
  id: string
  name: string
  phone: string
  status: ReferralStatus
  date: string
}

export const REFERRAL_REWARD_XAF = 5000

// ── Seed data ────────────────────────────────────────────────────────────────────
// Member names deliberately match the pooled-funding contributors seeded in
// funding.tsx (p1's contributors) so the group dashboard can cross-reference
// real per-member contribution data instead of a second parallel dataset.
const SEED_GROUPS: DiasporaGroup[] = [
  { id: 'g1', name: 'Cameroon Diaspora Association — Brussels Chapter', description: 'A community of Cameroonians in Brussels funding verified projects back home.', region: 'Brussels, Belgium', createdDate: '12 Jan 2026' },
]

const SEED_MEMBERS: GroupMember[] = [
  { id: 'gm1', groupId: 'g1', name: 'Marie-Claire N.', phone: '+32 470 111 222', role: 'admin', joinedDate: '12 Jan 2026' },
  { id: 'gm2', groupId: 'g1', name: 'Théodore K.', phone: '+32 470 111 333', role: 'member', joinedDate: '15 Jan 2026' },
  { id: 'gm3', groupId: 'g1', name: 'Rosine A.', phone: '+32 470 111 444', role: 'member', joinedDate: '20 Feb 2026' },
]

const SEED_REFERRALS: Referral[] = [
  { id: 'ref1', name: 'Solange M.', phone: '+237 677 900 001', status: 'rewarded', date: '2 Jun 2026' },
  { id: 'ref2', name: 'Bertrand F.', phone: '+237 677 900 002', status: 'joined', date: '15 Jun 2026' },
  { id: 'ref3', name: 'Alice T.', phone: '+237 677 900 003', status: 'invited', date: '10 Jul 2026' },
]

interface CommunityContextValue {
  groups: DiasporaGroup[]
  createGroup: (name: string, description: string, region: string) => DiasporaGroup
  members: GroupMember[]
  addMember: (groupId: string, name: string, phone: string) => GroupMember

  referrals: Referral[]
  referralCode: string
  addReferral: (name: string, phone: string) => Referral
}

const CommunityContext = createContext<CommunityContextValue>({} as CommunityContextValue)

let idCounter = 1000
const nextId = (prefix: string) => `${prefix}${idCounter++}`

export function CommunityProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<DiasporaGroup[]>(SEED_GROUPS)
  const [members, setMembers] = useState<GroupMember[]>(SEED_MEMBERS)
  const [referrals, setReferrals] = useState<Referral[]>(SEED_REFERRALS)
  const [referralCode] = useState('MC-7X2K9')

  const createGroup = (name: string, description: string, region: string) => {
    const created: DiasporaGroup = { id: nextId('g'), name, description, region, createdDate: 'Just now' }
    setGroups((gs) => [created, ...gs])
    return created
  }
  const addMember = (groupId: string, name: string, phone: string) => {
    const created: GroupMember = { id: nextId('gm'), groupId, name, phone, role: 'member', joinedDate: 'Just now' }
    setMembers((ms) => [...ms, created])
    return created
  }
  const addReferral = (name: string, phone: string) => {
    const created: Referral = { id: nextId('ref'), name, phone, status: 'invited', date: 'Just now' }
    setReferrals((rs) => [created, ...rs])
    return created
  }

  return (
    <CommunityContext.Provider value={{ groups, createGroup, members, addMember, referrals, referralCode, addReferral }}>
      {children}
    </CommunityContext.Provider>
  )
}

export const useCommunity = () => useContext(CommunityContext)
