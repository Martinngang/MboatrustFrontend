import { createContext, useContext, useState, type ReactNode } from 'react'

export type TeamRole = 'owner' | 'approver' | 'viewer'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
  initials: string
}

interface TeamState {
  members: TeamMember[]
  inviteMember: (m: Omit<TeamMember, 'id' | 'initials'>) => TeamMember
  updateMemberRole: (id: string, role: TeamRole) => void
  removeMember: (id: string) => void
}

const TeamContext = createContext<TeamState | null>(null)

let idCounter = 1
const nextId = () => `team${idCounter++}`

const SEED_MEMBERS: TeamMember[] = [
  { id: 'team-you', name: 'Test User', email: 'you@mboatrust.cm', role: 'owner', initials: 'TU' },
  { id: 'team-1', name: 'Théodore K.', email: 'theodore.k@mboatrust.cm', role: 'approver', initials: 'TK' },
  { id: 'team-2', name: 'Rosine A.', email: 'rosine.a@mboatrust.cm', role: 'viewer', initials: 'RA' },
]

/** For diaspora-group/association accounts: who on the team can fund,
 * approve milestones, or just view. Frontend-only mock roster — no real
 * invite email is sent, matching the rest of this app's data model. */
export function TeamProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<TeamMember[]>(SEED_MEMBERS)

  const inviteMember = (m: Omit<TeamMember, 'id' | 'initials'>) => {
    const initials = m.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
    const created = { ...m, id: nextId(), initials }
    setMembers((ms) => [...ms, created])
    return created
  }
  const updateMemberRole = (id: string, role: TeamRole) => {
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, role } : m)))
  }
  const removeMember = (id: string) => {
    setMembers((ms) => ms.filter((m) => m.id !== id))
  }

  return (
    <TeamContext.Provider value={{ members, inviteMember, updateMemberRole, removeMember }}>
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error('useTeam must be used within a TeamProvider')
  return ctx
}
