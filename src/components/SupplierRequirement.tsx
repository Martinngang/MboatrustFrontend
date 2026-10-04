import { useState } from 'react'
import { C, FONT } from './MobileLayout'
import { AppIcon } from './icons'
import { useMaterials } from '../materials'
import type { SupplierRequirement as Requirement, SupplierSummary } from '../context'

const OPTIONS: { value: Requirement; label: string; desc: string }[] = [
  { value: 'none', label: 'No Supplier required', desc: 'The contractor handles their own materials.' },
  { value: 'have_supplier', label: 'I already have a Supplier', desc: 'Pick a verified supplier to attach to this project.' },
  { value: 'need_supplier', label: 'I need a Supplier', desc: 'Contractors will see that material sourcing/supplier coordination is required.' },
]

/** Funder-facing "Supplier required for this project" chooser used by the
 * tender creation form. Never auto-selects a supplier: "I already have a
 * Supplier" only counts once the funder has explicitly picked one. */
export function SupplierRequirementPicker({ value, supplierId, onChange }: {
  value: Requirement
  supplierId: string | null
  onChange: (next: { requirement: Requirement; supplierId: string | null }) => void
}) {
  const { suppliers } = useMaterials()
  const verified = suppliers.filter((s) => s.verificationStatus === 'verified')
  const [query, setQuery] = useState('')
  const matches = verified.filter((s) => !query.trim() || `${s.businessName} ${s.region}`.toLowerCase().includes(query.trim().toLowerCase()))
  const chosen = verified.find((s) => s.id === supplierId)

  return (
    <div>
      <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">
        Supplier required for this project?
      </label>
      <div className="grid grid-cols-1 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ requirement: opt.value, supplierId: opt.value === 'have_supplier' ? supplierId : null })}
            className="text-left rounded-xl border-2 px-3.5 py-2.5 transition-colors"
            style={{
              borderColor: value === opt.value ? C.forest : C.parchmentDark,
              background: value === opt.value ? 'var(--status-success-bg)' : C.white,
            }}
          >
            <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{opt.label}</div>
            <div style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>

      {value === 'have_supplier' && (
        <div className="mt-3 space-y-2">
          {chosen ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border p-3" style={{ borderColor: C.forest, background: C.white }}>
              <div className="min-w-0">
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold truncate">{chosen.businessName}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{chosen.region}</div>
              </div>
              <button type="button" onClick={() => onChange({ requirement: 'have_supplier', supplierId: null })} className="text-xs font-semibold flex-shrink-0" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search verified suppliers by name or region…"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
              />
              {verified.length === 0 ? (
                <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">No verified suppliers yet — choose "I need a Supplier" instead and pick one later.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-1.5">
                  {matches.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onChange({ requirement: 'have_supplier', supplierId: s.id })}
                      className="w-full text-left rounded-xl border px-3 py-2"
                      style={{ borderColor: C.parchmentDark, background: C.white }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold truncate">{s.businessName}</span>
                        <AppIcon name="shieldCheck" size={12} style={{ color: C.forest }} />
                      </div>
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">{s.region}</div>
                    </button>
                  ))}
                  {matches.length === 0 && <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs px-1">No suppliers match "{query}".</p>}
                </div>
              )}
              <p style={{ fontFamily: FONT.mono, color: 'var(--status-warning-text)' }} className="text-[10px] uppercase tracking-wider">
                Select a supplier to continue
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Small public chip for tender cards — nothing for "none" so tenders that
 * don't involve a supplier stay uncluttered. */
export function SupplierRequirementChip({ requirement, supplier }: { requirement?: Requirement; supplier?: SupplierSummary | null }) {
  if (!requirement || requirement === 'none') return null
  const need = requirement === 'need_supplier'
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        fontFamily: FONT.mono,
        background: need ? 'var(--status-warning-bg)' : 'var(--status-success-bg)',
        color: need ? 'var(--status-warning-text)' : 'var(--status-success-text)',
      }}
    >
      <AppIcon name="store" size={10} />
      {need ? 'Supplier needed' : supplier?.businessName ? `Supplier: ${supplier.businessName}` : 'Supplier assigned'}
    </span>
  )
}

/** The clear public notice on a tender's details page — what a contractor
 * needs to know before bidding. Renders nothing when no supplier is involved. */
export function SupplierRequirementNotice({ requirement, supplier }: { requirement?: Requirement; supplier?: SupplierSummary | null }) {
  if (!requirement || requirement === 'none') return null
  const need = requirement === 'need_supplier'
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: need ? 'var(--status-warning-text)' : C.forest,
        background: need ? 'var(--status-warning-bg)' : 'var(--status-success-bg)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <AppIcon name="store" size={15} style={{ color: need ? 'var(--status-warning-text)' : C.forest }} />
        <span style={{ fontFamily: FONT.mono, color: need ? 'var(--status-warning-text)' : C.forest }} className="text-[10px] uppercase tracking-widest">
          {need ? 'Supplier required — not yet assigned' : 'Supplier assigned'}
        </span>
      </div>
      <p style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm leading-relaxed">
        {need
          ? 'The funder still needs a supplier for this project. Supplier coordination and material sourcing will be required — factor this into your bid. A supplier is only attached once the funder selects one.'
          : <>The funder has selected <strong>{supplier?.businessName ?? 'a verified supplier'}</strong>{supplier?.region ? ` (${supplier.region})` : ''} to supply materials. Coordinate material requests with them during the project.</>}
      </p>
    </div>
  )
}
