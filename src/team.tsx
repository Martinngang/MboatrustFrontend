import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useApp } from './context'
import {
  useTeamMembersQuery,
  useInviteTeamMemberMutation,
  useUpdateTeamMemberRoleMutation,
  useRemoveTeamMemberMutation,
  claimTeamMemberships,
  type TeamRole,
  type TeamMemberRecord,
} from './api/teamMembers'

export type { TeamRole }
export type TeamMember = TeamMemberRecord

interface TeamState {
  members: TeamMember[]
  inviteMember: (m: { name: string; email: string; role: TeamRole }) => void
  updateMemberRole: (id: string, role: TeamRole) => void
  removeMember: (id: string) => void
}

const TeamContext = createContext<TeamState | null>(null)

/** For diaspora-group/association accounts: who on the team can fund,
 * approve milestones, or just view. Backed by the real team-members API —
 * this component is now a thin context bridge so every existing useTeam()
 * call site (TeamManagementScreen) keeps working unchanged. Mutations are
 * fire-and-forget (.mutate, not .mutateAsync) matching the original
 * synchronous-looking inviteMember/updateMemberRole/removeMember shape —
 * no call site awaits or reads their return value. */
export function TeamProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useApp()
  const { data: members = [] } = useTeamMembersQuery(isLoggedIn)
  const invite = useInviteTeamMemberMutation()
  const updateRole = useUpdateTeamMemberRoleMutation()
  const remove = useRemoveTeamMemberMutation()

  // Once per session, right after auth resolves — links any roster rows
  // this account was invited into by email before it existed. Same
  // best-effort, swallow-failures convention as the pending-referral claim
  // in Onboarding.tsx.
  const claimed = useRef(false)
  useEffect(() => {
    if (isLoggedIn && !claimed.current) {
      claimed.current = true
      claimTeamMemberships()
    }
  }, [isLoggedIn])

  const inviteMember = (m: { name: string; email: string; role: TeamRole }) => {
    if (m.role === 'owner') return // owner is auto-created, never invited
    invite.mutate({ email: m.email, name: m.name, role: m.role })
  }
  const updateMemberRole = (id: string, role: TeamRole) => {
    if (role === 'owner') return
    updateRole.mutate({ id, role })
  }
  const removeMember = (id: string) => {
    remove.mutate(id)
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
