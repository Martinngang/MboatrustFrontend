import { C, FONT } from '../MobileLayout'
import { AppIcon, type IconName } from '../icons'

/** Stat tile for the admin overview — colored left accent keyed to the
 * metric's semantic tone (matches the reference command-center pattern:
 * green=positive, gold=revenue/pending, red=risk, blue=neutral/info), big
 * number, label, optional delta pill. */
export function AdminKpiCard({ icon, label, value, tone = 'neutral', delta }: {
  icon: IconName
  label: string
  value: string
  tone?: 'positive' | 'revenue' | 'risk' | 'neutral'
  delta?: { value: string; positive: boolean }
}) {
  const accent = { positive: C.forest, revenue: C.amber, risk: 'var(--status-error-text)', neutral: C.steel }[tone]
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 transition-transform hover:-translate-y-0.5"
      style={{ borderColor: C.parchmentDark, borderLeftColor: accent, borderLeftWidth: 3, background: C.white, boxShadow: C.shadowSm }}
    >
      <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${accent}1a`, color: accent }}>
        <AppIcon name={icon} size={16} />
      </div>
      <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-2xl font-bold">{value}</div>
      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-1 text-[10px] uppercase tracking-widest">{label}</div>
      {delta && (
        <div
          className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={delta.positive
            ? { background: 'var(--status-success-bg)', color: 'var(--status-success-text)' }
            : { background: 'var(--status-error-bg)', color: 'var(--status-error-text)' }}
        >
          <AppIcon name={delta.positive ? 'sparkles' : 'alert'} size={10} />
          {delta.value}
        </div>
      )}
    </div>
  )
}
