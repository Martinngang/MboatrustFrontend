import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type ActivityType =
  | 'milestone_approved' | 'milestone_disputed' | 'milestone_submitted'
  | 'project_funded' | 'project_created' | 'project_status_changed'
  | 'bid_placed' | 'listing_created' | 'offer_made'

export interface ActivityEvent {
  id: string
  type: ActivityType
  icon: string
  title: string
  detail?: string
  path?: string
  time: string
}

interface ActivityLogState {
  events: ActivityEvent[]
  logActivity: (e: Omit<ActivityEvent, 'id' | 'time'>) => void
}

const ActivityLogContext = createContext<ActivityLogState | null>(null)

let idCounter = 1
const nextId = () => `act${idCounter++}`

/** Single event log every pillar's key state-changing actions append to.
 * Two consumers read the same feed: the Home dashboard's "Recent activity"
 * widget (latest few) and the dedicated /activity screen (full, filterable)
 * — one source of truth instead of the AdminPanelScreen's old static array. */
export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ActivityEvent[]>(SEED_EVENTS)

  const logActivity = useCallback((e: Omit<ActivityEvent, 'id' | 'time'>) => {
    setEvents((evts) => [{ ...e, id: nextId(), time: 'Just now' }, ...evts])
  }, [])

  return (
    <ActivityLogContext.Provider value={{ events, logActivity }}>
      {children}
    </ActivityLogContext.Provider>
  )
}

export function useActivityLog() {
  const ctx = useContext(ActivityLogContext)
  if (!ctx) throw new Error('useActivityLog must be used within an ActivityLogProvider')
  return ctx
}

const SEED_EVENTS: ActivityEvent[] = [
  { id: 's1', type: 'milestone_approved', icon: '✅', title: 'Milestone approved', detail: 'Drilling & casing — Borehole Bamenda North · XAF 1,400,000 released', path: '/funder/project/p1', time: '2h ago' },
  { id: 's2', type: 'bid_placed', icon: '📋', title: 'New bid received', detail: 'Fon Ayuk Construction bid XAF 850,000 for Ngaoundéré pump job', path: '/contractor/job/j1', time: '5h ago' },
  { id: 's3', type: 'milestone_submitted', icon: '📸', title: 'Proof submitted', detail: 'Emmanuel Njang submitted milestone 2 evidence for review', path: '/funder/project/p1', time: '1 day ago' },
  { id: 's4', type: 'project_funded', icon: '🔒', title: 'Funds secured', detail: 'XAF 1,200,000 moved into escrow for Clinic Renovation — Limbe', path: '/funder/project/p3', time: '3 days ago' },
  { id: 's5', type: 'listing_created', icon: '🏡', title: 'Land listing verified', detail: 'Bastos plot 800m² completed document verification', path: '/land/listing/l1', time: '1 week ago' },
]
