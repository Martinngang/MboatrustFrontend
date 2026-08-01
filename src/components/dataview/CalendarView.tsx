import { useState } from 'react'
import { C, FONT } from '../MobileLayout'

export interface CalendarItem {
  id: string
  date: string // 'YYYY-MM-DD'
  label: string
  color?: string
  onClick?: () => void
}

function getMonthGrid(year: number, month: number) {
  const startWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array.from({ length: startWeekday }, () => null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** Month-grid calendar view, generalizing the pattern already built for
 * AvailabilityCalendarScreen — plots arbitrary dated items (milestone due
 * dates, verifier visits, …) instead of just availability toggles. */
export function CalendarView({ items }: { items: CalendarItem[] }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const cells = getMonthGrid(viewYear, viewMonth)
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const dateKey = (day: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setViewMonth(m)
    setViewYear(y)
  }

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: C.parchmentDark, background: C.white, boxShadow: C.shadowSm }}>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--color-parchment)]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke={C.ink} strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
        <span style={{ fontFamily: FONT.serif }} className="font-bold">{monthLabel}</span>
        <button onClick={() => changeMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--color-parchment)]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke={C.ink} strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-center text-[9px] uppercase">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />
          const key = dateKey(day)
          const dayItems = items.filter((it) => it.date === key)
          const isToday = key === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          return (
            <div
              key={i}
              className="min-h-[64px] rounded-lg border p-1"
              style={{ borderColor: isToday ? C.emerald : C.parchmentDark, background: isToday ? 'var(--status-success-bg)' : 'transparent' }}
            >
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] px-0.5">{day}</div>
              <div className="mt-0.5 space-y-0.5">
                {dayItems.slice(0, 2).map((it) => (
                  <button
                    key={it.id}
                    onClick={it.onClick}
                    className="block w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-semibold text-white"
                    style={{ background: it.color ?? C.emerald }}
                    title={it.label}
                  >
                    {it.label}
                  </button>
                ))}
                {dayItems.length > 2 && (
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="px-1 text-[9px]">+{dayItems.length - 2} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
