import { C, FONT } from '../MobileLayout'
import { EmptyState } from '../EmptyState'

export interface AttentionItem {
  icon: string
  label: string
  sub?: string
  onClick: () => void
}

/** Role-agnostic list widget — each Home screen supplies its own
 * role-appropriate items (pending milestone reviews for funders, next
 * milestone to submit for recipients, active bids for contractors, pending
 * offers for sellers) so the widget itself stays generic and reusable. */
export function NeedsAttentionWidget({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return <EmptyState icon="🎉" title="You're all caught up" description="Nothing needs your attention right now." illustration="float" />
  }
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <button
          key={i}
          onClick={it.onClick}
          className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-parchment)]"
          style={{ borderColor: C.parchmentDark }}
        >
          <span className="text-lg flex-shrink-0">{it.icon}</span>
          <div className="min-w-0 flex-1">
            <div style={{ fontFamily: FONT.sans, color: C.ink }} className="truncate text-sm font-medium">{it.label}</div>
            {it.sub && <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="truncate text-[10px]">{it.sub}</div>}
          </div>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="flex-shrink-0"><path d="M4 3L9 7L4 11" stroke={C.inkSubtle} strokeWidth="1.3" strokeLinecap="round" /></svg>
        </button>
      ))}
    </div>
  )
}
