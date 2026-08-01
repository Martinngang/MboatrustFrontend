import { useNavigate } from 'react-router-dom'
import { useActivityLog } from '../../activityLog'
import { C, FONT } from '../MobileLayout'

/** Unified activity feed across every pillar (not siloed per project) —
 * shows the latest slice of the same `activityLog` feed the full
 * `/activity` audit-log screen reads. */
export function RecentActivityWidget({ limit = 5 }: { limit?: number }) {
  const nav = useNavigate()
  const { events } = useActivityLog()
  const items = events.slice(0, limit)

  return (
    <div>
      <div className="space-y-1">
        {items.map((e) => (
          <button
            key={e.id}
            onClick={() => e.path && nav(e.path)}
            className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[var(--color-parchment)]"
            disabled={!e.path}
          >
            <span className="text-base flex-shrink-0">{e.icon}</span>
            <div className="min-w-0 flex-1">
              <div style={{ fontFamily: FONT.sans, color: C.ink }} className="truncate text-xs font-medium">{e.title}</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{e.time}</div>
            </div>
          </button>
        ))}
      </div>
      <button onClick={() => nav('/activity')} style={{ fontFamily: FONT.sans, color: C.emerald }} className="mt-2 px-2 text-xs font-semibold">
        View all activity →
      </button>
    </div>
  )
}
