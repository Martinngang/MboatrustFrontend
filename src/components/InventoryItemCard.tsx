import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { InventoryItemRecord } from '../api/inventoryItems'
import { C, FONT, Card, StatusBadge } from './MobileLayout'
import { AppIcon } from './icons'

function fmtXAF(n: number) {
  return `XAF ${n.toLocaleString('en-US')}`
}

/** One product row in the inventory catalogue — used both by the owner's
 * management view (with select checkbox + action menu) and any read-only
 * browsing context (funder/recipient picking materials, public profile),
 * which just omits those two props. */
export function InventoryItemCard({
  item, selectable = false, selected = false, onToggleSelect, onOpen, onDuplicate, onArchive, onRestore, onDelete, quantityControl,
}: {
  item: InventoryItemRecord
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  onOpen?: () => void
  onDuplicate?: () => void
  onArchive?: () => void
  onRestore?: () => void
  onDelete?: () => void
  /** Funder/recipient ordering view swaps the action menu for a +/- quantity stepper. */
  quantityControl?: { quantity: number; onChange: (q: number) => void }
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const hasActions = onDuplicate || onArchive || onRestore || onDelete
  const thumb = item.images[0]

  return (
    <Card variant={onOpen ? 'interactive' : 'default'}>
      <div className="flex items-center gap-3 p-3">
        {selectable && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.() }}
            aria-label={selected ? 'Deselect item' : 'Select item'}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors"
            style={{ borderColor: selected ? C.forest : C.parchmentDark, background: selected ? C.forest : 'transparent' }}
          >
            {selected && <AppIcon name="check" size={13} style={{ color: '#fff' }} strokeWidth={2.5} />}
          </button>
        )}

        <button onClick={onOpen} disabled={!onOpen} className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: C.parchment }}>
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <AppIcon name="package" size={18} style={{ color: C.inkSubtle }} strokeWidth={1.5} />
          )}
        </button>

        <button onClick={onOpen} disabled={!onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <div style={{ fontFamily: FONT.sans }} className="truncate text-sm font-semibold">{item.name}</div>
            {item.status === 'archived' && <StatusBadge status="archived" />}
          </div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-0.5 truncate text-[10px] uppercase tracking-wider">
            {item.category}{item.subcategory ? ` · ${item.subcategory}` : ''}{item.sku ? ` · ${item.sku}` : ''}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span style={{ fontFamily: FONT.serif, color: C.ink }} className="text-sm font-bold">{fmtXAF(item.price)}</span>
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">/ {item.unit}</span>
            {item.isLowStock && (
              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.mono }}>
                Low stock
              </span>
            )}
          </div>
        </button>

        {quantityControl ? (
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              onClick={() => quantityControl.onChange(Math.max(0, quantityControl.quantity - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold"
              style={{ borderColor: C.parchmentDark }}
            >−</button>
            <span style={{ fontFamily: FONT.mono, color: C.ink }} className="w-6 text-center text-sm">{quantityControl.quantity}</span>
            <button
              onClick={() => quantityControl.onChange(quantityControl.quantity + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: C.forest }}
            >+</button>
          </div>
        ) : (
          <div className="flex flex-shrink-0 items-center gap-2 text-right">
            <div>
              <div style={{ fontFamily: FONT.mono, color: C.ink }} className="text-xs font-semibold">{item.quantityAvailable}</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase">in stock</div>
            </div>
            {hasActions && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
                  aria-label="More actions"
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-parchment)]"
                >
                  <AppIcon name="moreVertical" size={16} style={{ color: C.inkSubtle }} />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border py-1"
                        style={{ background: C.white, borderColor: C.parchmentDark, boxShadow: C.shadowLg }}
                      >
                        {onDuplicate && (
                          <button onClick={() => { setMenuOpen(false); onDuplicate() }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--color-parchment)]" style={{ fontFamily: FONT.sans, color: C.ink }}>
                            <AppIcon name="copy" size={13} /> Duplicate
                          </button>
                        )}
                        {onArchive && (
                          <button onClick={() => { setMenuOpen(false); onArchive() }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--color-parchment)]" style={{ fontFamily: FONT.sans, color: C.ink }}>
                            <AppIcon name="archive" size={13} /> Archive
                          </button>
                        )}
                        {onRestore && (
                          <button onClick={() => { setMenuOpen(false); onRestore() }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--color-parchment)]" style={{ fontFamily: FONT.sans, color: C.forest }}>
                            <AppIcon name="refresh" size={13} /> Restore
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={() => { setMenuOpen(false); onDelete() }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--color-parchment)]" style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }}>
                            <AppIcon name="trash" size={13} /> Delete
                          </button>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
