import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface Group {
  id: string
  name: string
  description: string
  purpose: string
  linkedProjectId: string | null
  createdBy: string
}

interface BackendGroup {
  _id: string
  name: string
  description: string
  purpose: string
  linkedProjectId: string | null
  createdBy: string
}

function mapGroup(doc: BackendGroup): Group {
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description || '',
    purpose: doc.purpose || '',
    linkedProjectId: doc.linkedProjectId,
    createdBy: doc.createdBy,
  }
}

export function useMyGroupsQuery() {
  return useQuery({
    queryKey: ['groups', 'mine'],
    queryFn: async (): Promise<Group[]> => {
      const { data } = await api.get<{ data: BackendGroup[] }>('/groups/mine')
      return data.data.map(mapGroup)
    },
    staleTime: 10_000,
  })
}

export interface GroupMember {
  id: string
  userId: string
  name: string
  avatarUrl: string | null
  role: 'owner' | 'member'
  joinedAt: string
}

export interface GroupDashboard {
  group: Group
  memberCount: number
  members: GroupMember[]
  fundingSummary: { raised: number; released: number; escrowBalance: number } | null
  contributionsByMember: { userId: string; total: number }[]
}

interface BackendGroupMember {
  _id: string
  userId: { _id: string; fullName: string; avatarUrl: string | null } | string
  role: 'owner' | 'member'
  joinedAt: string
}

export function useGroupDashboardQuery(id: string | undefined) {
  return useQuery({
    queryKey: ['groupDashboard', id],
    queryFn: async (): Promise<GroupDashboard> => {
      const { data } = await api.get<{
        data: {
          group: BackendGroup
          memberCount: number
          members: BackendGroupMember[]
          fundingSummary: { raised: number; released: number; escrowBalance: number } | null
          contributionsByMember: { userId: string; total: number }[]
        }
      }>(`/groups/${id}/dashboard`)
      return {
        group: mapGroup(data.data.group),
        memberCount: data.data.memberCount,
        members: data.data.members.map((m) => ({
          id: m._id,
          userId: typeof m.userId === 'object' ? m.userId._id : m.userId,
          name: typeof m.userId === 'object' ? m.userId.fullName : 'Member',
          avatarUrl: typeof m.userId === 'object' ? m.userId.avatarUrl : null,
          role: m.role,
          joinedAt: new Date(m.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        })),
        fundingSummary: data.data.fundingSummary,
        contributionsByMember: data.data.contributionsByMember,
      }
    },
    enabled: Boolean(id),
    staleTime: 10_000,
  })
}

export function useCreateGroupMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; purpose?: string; linkedProjectId?: string }) => {
      const { data } = await api.post<{ data: BackendGroup }>('/groups', input)
      return mapGroup(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useInviteGroupMemberMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { data } = await api.post(`/groups/${groupId}/invite`, { userId })
      return data.data
    },
    onSuccess: (_r, vars) => qc.invalidateQueries({ queryKey: ['groupDashboard', vars.groupId] }),
  })
}

export function useLeaveGroupMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (groupId: string) => {
      await api.post(`/groups/${groupId}/leave`)
      return groupId
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}
