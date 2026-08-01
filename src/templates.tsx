import { createContext, useContext, useState, type ReactNode } from 'react'

export interface TemplateMilestone {
  title: string
  amount: number
  description: string
}

export interface ProjectTemplate {
  id: string
  name: string
  category: string
  milestones: TemplateMilestone[]
}

interface TemplatesState {
  templates: ProjectTemplate[]
  addTemplate: (t: Omit<ProjectTemplate, 'id'>) => ProjectTemplate
  deleteTemplate: (id: string) => void
}

const TemplatesContext = createContext<TemplatesState | null>(null)

let idCounter = 1
const nextId = () => `tpl${idCounter++}`

const SEED_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl-seed-1',
    name: 'Borehole / water point',
    category: 'Water & Sanitation',
    milestones: [
      { title: 'Site survey & permits', amount: 400000, description: 'Site assessment, permits, community sign-off' },
      { title: 'Drilling & casing', amount: 1400000, description: 'Drilling, casing installation, water testing' },
      { title: 'Pump installation & testing', amount: 1400000, description: 'Pump install, commissioning, handover' },
    ],
  },
  {
    id: 'tpl-seed-2',
    name: 'Roof repair',
    category: 'Housing',
    milestones: [
      { title: 'Materials procurement', amount: 300000, description: 'Roofing sheets, timber, fixings' },
      { title: 'Structural work', amount: 400000, description: 'Frame repair and reinforcement' },
      { title: 'Final roofing & inspection', amount: 200000, description: 'Roofing, sealing, final inspection' },
    ],
  },
]

/** Lets funders save a project's milestone breakdown as a reusable template
 * for recurring project types, and reapply one when starting a new project
 * (see MilestonesScreen). Frontend-only state, consistent with the rest of
 * the app's mock data model. */
export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>(SEED_TEMPLATES)

  const addTemplate = (t: Omit<ProjectTemplate, 'id'>) => {
    const created = { ...t, id: nextId() }
    setTemplates((ts) => [created, ...ts])
    return created
  }
  const deleteTemplate = (id: string) => {
    setTemplates((ts) => ts.filter((t) => t.id !== id))
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
