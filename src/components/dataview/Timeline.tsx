import { useMemo } from 'react'
import { C, FONT } from '../MobileLayout'

export interface TimelineSegment {
  label: string
  start: Date
  end: Date
  color?: string
  onClick?: () => void
}

/** Horizontal date-scaled grid — rows = items, bars = date ranges plotted
 * proportionally across the overall span. Intentionally simple (not a full
 * Gantt tool): good enough for "which of my projects has milestones due
 * soon," not resource-leveling or dependency arrows. */
export function Timeline<T>({ rows, getRowId, getLabel, getSegments }: {
  rows: T[]
  getRowId: (row: T) => string
  getLabel: (row: T) => string
  getSegments: (row: T) => TimelineSegment[]
}) {
  const { rangeStart, rangeEnd, markers } = useMemo(() => {
    const allDates = rows.flatMap((r) => getSegments(r)).flatMap((s) => [s.start.getTime(), s.end.getTime()])
    if (allDates.length === 0) {
      const now = Date.now()
      return { rangeStart: now, rangeEnd: now + 30 * 86400000, markers: [] as { pct: number; label: string }[] }
    }
    const min = Math.min(...allDates)
    const max = Math.max(...allDates)
    const pad = Math.max((max - min) * 0.08, 86400000)
    const start = min - pad
    const end = max + pad
    const span = end - start
    const weekMs = 7 * 86400000
    const markerCount = Math.min(10, Math.max(3, Math.round(span / weekMs)))
    const markers = Array.from({ length: markerCount + 1 }, (_, i) => {
      const t = start + (span * i) / markerCount
      return { pct: (i / markerCount) * 100, label: new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
    })
    return { rangeStart: start, rangeEnd: end, markers }
  }, [rows, getSegments])

  const span = rangeEnd - rangeStart

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border p-8 text-center" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <span style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-sm">Nothing to plot yet.</span>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: C.parchmentDark, background: C.white, boxShadow: C.shadowSm }}>
      <div className="min-w-[720px]">
        {/* Date axis */}
        <div className="flex border-b" style={{ borderColor: C.parchmentDark }}>
          <div className="w-48 flex-shrink-0 border-r px-3 py-2" style={{ borderColor: C.parchmentDark }}>
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Item</span>
          </div>
          <div className="relative flex-1 py-2">
            {markers.map((m, i) => (
              <span
                key={i}
                className="absolute -translate-x-1/2 text-[10px]"
                style={{ left: `${m.pct}%`, fontFamily: FONT.mono, color: C.inkSubtle }}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* Rows */}
        {rows.map((row) => {
          const segments = getSegments(row)
          return (
            <div key={getRowId(row)} className="flex border-b last:border-0" style={{ borderColor: C.parchmentDark }}>
              <div className="w-48 flex-shrink-0 border-r px-3 py-3" style={{ borderColor: C.parchmentDark }}>
                <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium line-clamp-2">{getLabel(row)}</span>
              </div>
              <div className="relative flex-1 px-1 py-3">
                <div className="relative h-6">
                  {segments.map((seg, i) => {
                    const left = ((seg.start.getTime() - rangeStart) / span) * 100
                    const width = Math.max(((seg.end.getTime() - seg.start.getTime()) / span) * 100, 1.5)
                    return (
                      <button
                        key={i}
                        onClick={seg.onClick}
                        title={seg.label}
                        className="absolute top-0 h-6 rounded-md px-2 text-left text-[10px] font-semibold text-white truncate"
                        style={{ left: `${left}%`, width: `${width}%`, background: seg.color ?? C.emerald, fontFamily: FONT.sans }}
                      >
                        {seg.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
