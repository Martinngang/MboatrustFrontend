import { useState } from 'react'
import { Tabs, type TabItem } from '../Tabs'

export type ViewMode = 'list' | 'board' | 'timeline' | 'calendar'

const ALL_VIEWS: (TabItem & { id: ViewMode })[] = [
  { id: 'list', label: 'List', icon: 'menu' },
  { id: 'board', label: 'Board', icon: 'layers' },
  { id: 'timeline', label: 'Timeline', icon: 'barChart' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
]

/** Persists the last-used view **per section** (e.g. "projects", "tenders",
 * "land") to localStorage, so switching away and back remembers the choice. */
export function useViewMode(sectionKey: string, defaultMode: ViewMode = 'list') {
  const storageKey = `mboatrust-view:${sectionKey}`
  const [mode, setModeState] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return (stored as ViewMode) || defaultMode
    } catch {
      return defaultMode
    }
  })
  const setMode = (m: ViewMode) => {
    setModeState(m)
    try { localStorage.setItem(storageKey, m) } catch { /* ignore */ }
  }
  return [mode, setMode] as const
}

/** The List/Board/Timeline/Calendar tab control itself — reuses the shared
 * `Tabs` sliding-indicator component. `available` narrows which views make
 * sense for a given section (e.g. a section with no dates might skip
 * Timeline/Calendar). */
export function ViewSwitcher({ mode, onChange, available }: {
  mode: ViewMode
  onChange: (m: ViewMode) => void
  available?: ViewMode[]
}) {
  const tabs = ALL_VIEWS.filter((t) => !available || available.includes(t.id))
  return (
    <div className="inline-block">
      <Tabs tabs={tabs} value={mode} onChange={(id) => onChange(id as ViewMode)} variant="pill" />
    </div>
  )
}
