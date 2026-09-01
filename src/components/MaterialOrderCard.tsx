import { fmt } from '../context'
import type { MaterialOrder } from '../materials'
import { resolveMilestonePayee } from '../materials'
import { C, FONT, Card, StatusBadge } from './MobileLayout'
import { AppIcon } from './icons'

/** Renders a MaterialOrder the same way a photo/video evidence entry
 * renders elsewhere (see MilestoneReviewScreen) — a receipt is this
 * milestone's evidence, not a bolted-on second UI. Shown wherever a
 * milestone with a linked material order is displayed: the funder's
 * review screen, the contractor's submission status, and the supplier's
 * own order list. */
export function MaterialOrderCard({ order, compact = false }: { order: MaterialOrder; compact?: boolean }) {
  const { payoutLabel } = resolveMilestonePayee(order)
  const isPaidToSupplier = order.status === 'confirmed' || order.status === 'out_for_delivery' || order.status === 'delivered'

  return (
    <Card>
      <div className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span style={{ color: C.forest }}><AppIcon name="store" size={16} /></span>
            <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">{order.supplierName}</div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {isPaidToSupplier && (
          <div className="flex items-center gap-1.5 mb-2 rounded-lg px-2 py-1" style={{ background: 'var(--status-info-bg)' }}>
            <AppIcon name="wallet" size={12} style={{ color: 'var(--status-info-text)' }} />
            <span style={{ fontFamily: FONT.mono, color: 'var(--status-info-text)' }} className="text-[9px] uppercase tracking-wider">{payoutLabel}</span>
          </div>
        )}

        <div className="space-y-1 mb-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span style={{ fontFamily: FONT.sans, color: C.inkMuted }}>{item.quantity}× {item.name}</span>
              <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{fmt(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: C.parchmentDark }}>
          <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">Total</span>
          <span style={{ fontFamily: FONT.serif, color: C.ink }} className="text-sm font-bold">{fmt(order.totalAmount)}</span>
        </div>

        {order.digitalReceiptUrl && (
          <div className="flex items-center gap-1.5 mt-2">
            <AppIcon name="receipt" size={12} style={{ color: C.inkSubtle }} />
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">
              Digital receipt · {order.confirmedAt ? new Date(order.confirmedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
            </span>
          </div>
        )}

        {order.status === 'rejected' && order.rejectionReason && (
          <div style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }} className="text-xs mt-2 italic">{order.rejectionReason}</div>
        )}

        {order.deliveryConfirmation && (
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-2">
            Delivered · confirmed by {order.deliveryConfirmation.confirmedByName || 'a project party'} · {new Date(order.deliveryConfirmation.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>
    </Card>
  )
}
