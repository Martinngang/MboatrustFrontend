import { createContext, useContext, useState, type ReactNode } from 'react'

export interface CustomFields {
  note: string
  tags: string[]
}

const EMPTY: CustomFields = { note: '', tags: [] }

interface CustomFieldsState {
  getFields: (entityId: string) => CustomFields
  setNote: (entityId: string, note: string) => void
  addTag: (entityId: string, tag: string) => void
  removeTag: (entityId: string, tag: string) => void
}

const CustomFieldsContext = createContext<CustomFieldsState | null>(null)

/** Lightweight power-user layer: a personal note + freeform tags on any
 * entity (currently used on Projects), keyed by entity id. Not part of the
 * core Project/Job/LandListing data models — deliberately separate so it
 * stays optional and doesn't need backend schema changes to add later. */
export function CustomFieldsProvider({ children }: { children: ReactNode }) {
  const [byId, setById] = useState<Record<string, CustomFields>>({})

  const getFields = (entityId: string) => byId[entityId] ?? EMPTY

  const setNote = (entityId: string, note: string) => {
    setById((m) => ({ ...m, [entityId]: { ...(m[entityId] ?? EMPTY), note } }))
  }
  const addTag = (entityId: string, tag: string) => {
    const clean = tag.trim()
    if (!clean) return
    setById((m) => {
      const current = m[entityId] ?? EMPTY
      if (current.tags.includes(clean)) return m
      return { ...m, [entityId]: { ...current, tags: [...current.tags, clean] } }
    })
  }
  const removeTag = (entityId: string, tag: string) => {
    setById((m) => {
      const current = m[entityId] ?? EMPTY
      return { ...m, [entityId]: { ...current, tags: current.tags.filter((t) => t !== tag) } }
    })
  }

  return (
    <CustomFieldsContext.Provider value={{ getFields, setNote, addTag, removeTag }}>
      {children}
    </CustomFieldsContext.Provider>
  )
}

export function useCustomFields() {
  const ctx = useContext(CustomFieldsContext)
  if (!ctx) throw new Error('useCustomFields must be used within a CustomFieldsProvider')
  return ctx
}
