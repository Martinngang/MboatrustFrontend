import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface TemplateMilestoneRecord { title: string; amount: number; description: string }
export interface ProjectTemplateRecord {
  id: string
  name: string
  category: string
  milestones: TemplateMilestoneRecord[]
}

interface BackendProjectTemplate {
  _id: string
  ownerId: string
  name: string
  category: string
  milestones: TemplateMilestoneRecord[]
  createdAt: string
}

function mapTemplate(doc: BackendProjectTemplate): ProjectTemplateRecord {
  return { id: doc._id, name: doc.name, category: doc.category, milestones: doc.milestones }
}

export function useProjectTemplatesQuery(enabled = true) {
  return useQuery({
    queryKey: ['projectTemplates'],
    queryFn: async (): Promise<ProjectTemplateRecord[]> => {
      const { data } = await api.get<{ data: BackendProjectTemplate[] }>('/project-templates/mine')
      return data.data.map(mapTemplate)
    },
    enabled,
    staleTime: 10_000,
  })
}

export function useCreateProjectTemplateMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; category: string; milestones: TemplateMilestoneRecord[] }) => {
      const { data } = await api.post<{ data: BackendProjectTemplate }>('/project-templates', input)
      return mapTemplate(data.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projectTemplates'] }),
  })
}

export function useDeleteProjectTemplateMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/project-templates/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projectTemplates'] }),
  })
}
