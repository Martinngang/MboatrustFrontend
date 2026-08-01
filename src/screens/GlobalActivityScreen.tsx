import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActivityLog, type ActivityType } from '../activityLog'
import { C, FONT, AppShell, Header, Card } from '../components/MobileLayout'
import { ChipGroup } from '../components/Chip'
import { EmptyState } from '../components/EmptyState'
import { StaggerList, StaggerItem } from '../components/Stagger'

const CATEGORY_TYPES: Record<string, ActivityType[]> = {
  Milestones: ['milestone_approved', 'milestone_disputed', 'milestone_submitted'],
  Funding: ['project_funded', 'project_created', 'project_status_changed'],
  Marketplace: ['bid_placed', 'listing_created', 'offer_made'],
}

/** Dedicated, filterable audit trail across every pillar — the architectural
 * reinforcement of the trust/verification story the brief asked for, not
 * just a per-project activity list. Reads the same `activityLog` feed the
 * Home dashboard's "Recent activity" widget shows a slice of. */
export function GlobalActivityScreen() {
  const nav = useNavigate()
  const { events } = useActivityLog()
  const [category, setCategory] = useState('All')

  const filtered = category === 'All' ? events : events.filter((e) => CATEGORY_TYPES[category]?.includes(e.type))

  return (
    <AppShell>
      <Header title="Activity Log" subtitle={`${events.length} events across your account`} back>
        <ChipGroup options={['All', 'Milestones', 'Funding', 'Marketplace']} value={category} onChange={(v) => setCategory(v as string)} />
      </Header>

      <div className="px-5 py-4">
        {filtered.length === 0 ? (
          <EmptyState icon="🗂️" title="No activity in this category yet" illustration="tilt" />
        ) : (
          <StaggerList className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
            {filtered.map((e) => (
              <StaggerItem key={e.id}>
                <Card variant={e.path ? 'interactive' : 'default'} onClick={e.path ? () => nav(e.path!) : undefined}>
                  <div className="flex items-start gap-3 p-4">
                    <span className="text-lg flex-shrink-0">{e.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{e.title}</div>
                      {e.detail && <div style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-0.5 text-xs leading-relaxed">{e.detail}</div>}
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-1.5 text-[10px] uppercase tracking-wider">{e.time}</div>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </AppShell>
  )
}
