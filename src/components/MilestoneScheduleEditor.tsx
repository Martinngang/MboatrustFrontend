import { C, FONT } from './MobileLayout'
import { fmt } from '../context'

export interface DraftScheduleMilestone { id: number; title: string; amount: string; description: string }

/** Evenly splits `budget` across `count` rows, the last row absorbing the
 * rounding remainder — a starting point every caller lets the user
 * hand-edit afterward rather than the only option. */
export function evenSplitAmounts(budget: number, count: number): number[] {
  if (count <= 0) return []
  const per = Math.round(budget / count)
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? budget - per * (count - 1) : per))
}

export function makeDefaultSchedule(count = 3): DraftScheduleMilestone[] {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, title: `Milestone ${i + 1}`, amount: '', description: '' }))
}

export function scheduleTotal(ms: DraftScheduleMilestone[]): number {
  return ms.reduce((s, m) => s + (Number(m.amount) || 0), 0)
}

export function scheduleRowsValid(ms: DraftScheduleMilestone[]): boolean {
  return ms.length > 0 && ms.every((m) => m.title.trim() !== '' && Number(m.amount) > 0)
}

/** Shared row-editable payment-schedule builder — title + optional work
 * description + amount per row, a Milestones/Weekly framing toggle (only
 * relabels rows still carrying an auto-generated name, never a row someone
 * actually renamed), add/remove, one-tap even rebalance, and a running
 * total-vs-target check. Originally built inline in PostJobScreen for the
 * funder's initial ask; reused as-is by SubmitBidScreen (the contractor's
 * opening proposal) and the bid negotiation screen (either side's counter)
 * so a schedule looks and behaves identically everywhere it's negotiated. */
export function MilestoneScheduleEditor({
  milestones, onChange, budget, weekly, onWeeklyChange,
}: {
  milestones: DraftScheduleMilestone[]
  onChange: (ms: DraftScheduleMilestone[]) => void
  budget: number
  weekly: boolean
  onWeeklyChange: (weekly: boolean) => void
}) {
  const scheduleLabel = (i: number) => (weekly ? `Week ${i + 1}` : `Milestone ${i + 1}`)
  const isAutoLabel = (title: string) => /^(Milestone|Week) \d+$/.test(title.trim())

  const setWeeklyMode = (next: boolean) => {
    onWeeklyChange(next)
    onChange(milestones.map((m, i) => (isAutoLabel(m.title) ? { ...m, title: next ? `Week ${i + 1}` : `Milestone ${i + 1}` } : m)))
  }

  const addRow = () => {
    const amounts = evenSplitAmounts(budget, milestones.length + 1)
    onChange([...milestones, { id: Date.now(), title: scheduleLabel(milestones.length), amount: '', description: '' }].map((m, i) => ({ ...m, amount: String(amounts[i]) })))
  }
  const removeRow = (id: number) => {
    if (milestones.length <= 1) return
    const remaining = milestones.filter((m) => m.id !== id)
    const amounts = evenSplitAmounts(budget, remaining.length)
    onChange(remaining.map((m, i) => ({ ...m, amount: String(amounts[i]) })))
  }
  const updateRow = (id: number, field: 'title' | 'amount' | 'description', value: string) => {
    onChange(milestones.map((m) => (m.id === id ? { ...m, [field]: value } : m)))
  }
  const rebalance = () => {
    const amounts = evenSplitAmounts(budget, milestones.length)
    onChange(milestones.map((m, i) => ({ ...m, amount: String(amounts[i]) })))
  }

  const total = scheduleTotal(milestones)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Payment schedule</label>
        <div className="flex rounded-full border p-0.5" style={{ borderColor: C.parchmentDark }}>
          {(['milestones', 'weekly'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setWeeklyMode(mode === 'weekly')}
              className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors"
              style={{
                background: (mode === 'weekly') === weekly ? C.forest : 'transparent',
                color: (mode === 'weekly') === weekly ? '#fff' : C.inkMuted,
                fontFamily: FONT.sans,
              }}
            >
              {mode === 'weekly' ? 'Weekly' : 'Milestones'}
            </button>
          ))}
        </div>
      </div>
      <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mb-3">
        {weekly
          ? 'Break the work into weeks — each week gets its own payment amount and what’s due. Fully flexible: add, remove, or resize weeks freely.'
          : 'Break the work into milestones — pick any structure that fits this project (by phase, by week, by deliverable).'}
      </p>

      <div className="space-y-2">
        {milestones.map((m, i) => (
          <div key={m.id} className="rounded-2xl border p-3" style={{ borderColor: C.parchmentDark, background: C.white }}>
            <div className="flex items-center justify-between mb-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: C.forest, fontFamily: FONT.mono }}>{i + 1}</div>
              {milestones.length > 1 && (
                <button onClick={() => removeRow(m.id)} style={{ color: 'var(--status-error-text)', fontFamily: FONT.mono }} className="text-xs">Remove</button>
              )}
            </div>
            <input
              value={m.title}
              onChange={(e) => updateRow(m.id, 'title', e.target.value)}
              placeholder={scheduleLabel(i)}
              className="w-full border rounded-lg px-3 py-2 outline-none text-sm mb-2"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
            />
            <input
              value={m.description}
              onChange={(e) => updateRow(m.id, 'description', e.target.value)}
              placeholder="What work is due? (optional)"
              className="w-full border rounded-lg px-3 py-2 outline-none text-sm mb-2"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
            />
            <input
              type="number"
              value={m.amount}
              onChange={(e) => updateRow(m.id, 'amount', e.target.value)}
              placeholder="Amount (XAF)"
              className="w-full border rounded-lg px-3 py-2 outline-none text-sm"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={addRow}
          className="flex-1 py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm"
          style={{ borderColor: C.forest, color: C.forest, fontFamily: FONT.sans }}
        >
          + Add {weekly ? 'week' : 'milestone'}
        </button>
        <button
          onClick={rebalance}
          disabled={!budget}
          className="px-4 py-3 rounded-xl border text-sm font-semibold disabled:opacity-40"
          style={{ borderColor: C.parchmentDark, color: C.inkMuted, fontFamily: FONT.sans }}
        >
          Split evenly
        </button>
      </div>

      <div className="flex items-center justify-between mt-3 px-1">
        <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">Schedule total</span>
        <span style={{ fontFamily: FONT.mono, color: total === budget ? C.forest : 'var(--status-error-text)' }} className="text-xs font-bold">
          {fmt(total)} / {fmt(budget)}
        </span>
      </div>
      {budget > 0 && total !== budget && (
        <p style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }} className="text-xs mt-1">
          The schedule must add up to the target amount.
        </p>
      )}
    </div>
  )
}
