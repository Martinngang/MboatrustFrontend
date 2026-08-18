import { C, FONT, STATUS_TONE_VARS } from './MobileLayout'

export interface TimelineEvent {
  id: string
  label: string
  detail?: string
  timestamp?: string
  status: 'done' | 'current' | 'upcoming' | 'flagged'
}

const DOT_COLOR: Record<TimelineEvent['status'], string> = {
  done: C.forest,
  current: C.amber,
  upcoming: C.parchmentDark,
  // Was a hardcoded hex sitting next to otherwise theme-aware tokens.
  flagged: STATUS_TONE_VARS.error.text,
}

/**
 * Vertical chronological feed — one shared component reused on every
 * project/contract/land-deal detail screen instead of a bespoke timeline per
 * pillar. Callers derive `events` from their own real data.
 */
export function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div>
      {events.map((e, i) => (
        <div key={e.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ background: DOT_COLOR[e.status] }}>
              {e.status === 'done' ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7L5.5 9.5L11 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : e.status === 'flagged' ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2L11 10H1L6 2Z" stroke="white" strokeWidth="1.3" strokeLinejoin="round" />
                  <line x1="6" y1="5.3" x2="6" y2="7" stroke="white" strokeWidth="1" strokeLinecap="round" />
                  <circle cx="6" cy="8.3" r="0.5" fill="white" />
                </svg>
              ) : e.status === 'current' ? (
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: C.forestDark }} />
              ) : (
                <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{i + 1}</span>
              )}
            </div>
            {i < events.length - 1 && <div className="my-1 w-px flex-1" style={{ background: e.status === 'upcoming' ? C.parchmentDark : DOT_COLOR[e.status], minHeight: '18px' }} />}
          </div>
          <div className="min-w-0 flex-1 pb-4">
            <div className="flex items-center justify-between gap-2">
              <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{e.label}</span>
              {e.timestamp && <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="whitespace-nowrap text-[10px]">{e.timestamp}</span>}
            </div>
            {e.detail && <div style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="mt-0.5 text-[10px]">{e.detail}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
