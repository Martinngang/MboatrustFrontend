import { createContext, useContext, type ReactNode } from 'react'
import { useApp } from './context'
import {
  useProjectTemplatesQuery,
  useCreateProjectTemplateMutation,
  useDeleteProjectTemplateMutation,
  type ProjectTemplateRecord,
  type TemplateMilestoneRecord,
} from './api/projectTemplates'

export type TemplateMilestone = TemplateMilestoneRecord
export type ProjectTemplate = ProjectTemplateRecord

interface TemplatesState {
  templates: ProjectTemplate[]
  addTemplate: (t: Omit<ProjectTemplate, 'id'>) => void
  deleteTemplate: (id: string) => void
}

const TemplatesContext = createContext<TemplatesState | null>(null)

/** Lets funders save a project's milestone breakdown as a reusable template
 * and reapply one when starting a new project (see MilestonesScreen).
 * Backed by the real project-templates API — thin context bridge so every
 * existing useTemplates() call site keeps working unchanged. Mutations are
 * fire-and-forget, matching the original synchronous-looking
 * addTemplate/deleteTemplate shape — no call site awaits or reads the
 * return value. */
export function TemplatesProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useApp()
  const { data: templates = [] } = useProjectTemplatesQuery(isLoggedIn)
  const create = useCreateProjectTemplateMutation()
  const remove = useDeleteProjectTemplateMutation()

  const addTemplate = (t: Omit<ProjectTemplate, 'id'>) => {
    create.mutate(t)
  }
  const deleteTemplate = (id: string) => {
    remove.mutate(id)
  }

  return (
    <TemplatesContext.Provider value={{ templates, addTemplate, deleteTemplate }}>
      {children}
    </TemplatesContext.Provider>
  )
}

export function useTemplates() {
  const ctx = useContext(TemplatesContext)
  if (!ctx) throw new Error('useTemplates must be used within a TemplatesProvider')
  return ctx
}
