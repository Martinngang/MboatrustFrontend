import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaterials } from '../materials'
import {
  useMyInventoryQuery, useBulkInventoryActionMutation, useDuplicateInventoryItemMutation,
  useArchiveInventoryItemMutation, useRestoreInventoryItemMutation, useDeleteInventoryItemMutation,
  type InventoryFilters, type InventoryItemRecord,
} from '../api/inventoryItems'
import { apiErrorMessage } from '../api/client'
import { CATEGORY_NAMES } from '../inventoryTaxonomy'
import { C, FONT, AppShell, Header, PillButton } from '../components/MobileLayout'
import { ChipGroup } from '../components/Chip'
import { InventoryItemCard } from '../components/InventoryItemCard'
import { EmptyState } from '../components/EmptyState'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { ConfirmDialog } from '../components/Modal'
import { AppIcon } from '../components/icons'
import { useToast } from '../components/Toast'

const SORT_OPTIONS: { value: InventoryFilters['sortBy']; label: string }[] = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'price', label: 'Price' },
  { value: 'quantityAvailable', label: 'Stock level' },
  { value: 'createdAt', label: 'Recently added' },
]

const PAGE_SIZE = 20

/** The supplier owner's full catalogue manager — search, category/
 * status/low-stock filters, sort, bulk select, and every per-item action
 * (edit/duplicate/archive/restore/delete). Deliberately its own full-screen
 * route rather than a dashboard tab: a real professional catalogue can run
 * into hundreds of products, and cramming search+filters+bulk actions into
 * a dashboard tab would fight the dashboard's own "quick glance" purpose. */
export function InventoryScreen() {
  const nav = useNavigate()
  const { show: showToast } = useToast()
  const { mySupplier, isLoadingMySupplier } = useMaterials()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const [category, setCategory] = useState('All')
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<NonNullable<InventoryFilters['sortBy']>>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [debouncedSearch, category, statusFilter, lowStockOnly, sortBy, sortDir])

  const filters: InventoryFilters = {
    search: debouncedSearch || undefined,
    category: category === 'All' ? undefined : category,
    status: statusFilter,
    lowStockOnly: lowStockOnly || undefined,
    sortBy, sortDir, page, limit: PAGE_SIZE,
  }
  const { data, isLoading, isFetching } = useMyInventoryQuery(filters, Boolean(mySupplier))
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const toggleSelect = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false) }

  const bulkMutation = useBulkInventoryActionMutation()
  const duplicateMutation = useDuplicateInventoryItemMutation()
  const archiveMutation = useArchiveInventoryItemMutation()
  const restoreMutation = useRestoreInventoryItemMutation()
  const deleteMutation = useDeleteInventoryItemMutation()
  const [deleteTarget, setDeleteTarget] = useState<InventoryItemRecord | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  const runBulk = (action: 'archive' | 'restore' | 'delete') => {
    bulkMutation.mutate({ ids: [...selectedIds], action }, {
      onSuccess: (res) => { showToast({ title: `${res.matched} item${res.matched === 1 ? '' : 's'} ${action === 'delete' ? 'deleted' : action + 'd'}`, tone: 'success' }); clearSelection(); setBulkDeleteConfirm(false) },
      onError: (err) => showToast({ title: 'Bulk action failed', description: apiErrorMessage(err), tone: 'error' }),
    })
  }

  if (isLoadingMySupplier) return <AppShell noNav>{null}</AppShell>

  if (!mySupplier) {
    return (
      <AppShell>
        <Header title="Inventory" back />
        <div className="px-5 py-8">
          <EmptyState icon="store" title="Register as a supplier first" description="You'll be able to manage a full product catalogue once your store is set up." illustration="tilt" action={<PillButton onClick={() => nav('/supplier/register')}>Get started</PillButton>} />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="Inventory" subtitle={`${total} product${total === 1 ? '' : 's'}`} back action={
        <button onClick={() => nav('/supplier/inventory/new')} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: C.forest }}>
          <AppIcon name="plus" size={15} /> Add
        </button>
      } />

      <div className="space-y-3 px-5 py-4 sm:mx-auto sm:max-w-3xl">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: C.parchmentDark, background: C.white }}>
          <AppIcon name="search" size={15} style={{ color: C.inkSubtle }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, brand…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ fontFamily: FONT.sans, color: C.ink }}
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search"><AppIcon name="close" size={14} style={{ color: C.inkSubtle }} /></button>
          )}
        </div>

        {/* Category filter */}
        <div className="overflow-x-auto pb-1">
          <ChipGroup options={['All', ...CATEGORY_NAMES]} value={category} onChange={(v) => setCategory(v as string)} />
        </div>

        {/* Status / low-stock / sort row */}
        <div className="flex flex-wrap items-center gap-2">
          <ChipGroup options={['active', 'archived', 'all']} value={statusFilter} onChange={(v) => setStatusFilter(v as typeof statusFilter)} />
          <button
            onClick={() => setLowStockOnly((v) => !v)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
            style={{ borderColor: lowStockOnly ? 'var(--status-error-text)' : C.parchmentDark, background: lowStockOnly ? 'var(--status-error-bg)' : C.white, color: lowStockOnly ? 'var(--status-error-text)' : C.inkMuted, fontFamily: FONT.sans }}
          >
            <AppIcon name="alert" size={12} /> Low stock only
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border px-2.5 py-1.5 text-xs outline-none"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }}
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              aria-label={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              className="flex h-8 w-8 items-center justify-center rounded-lg border"
              style={{ borderColor: C.parchmentDark }}
            >
              <AppIcon name="sortArrows" size={14} style={{ color: C.inkSubtle }} />
            </button>
          </div>
        </div>

        {/* Select-mode toggle */}
        <div className="flex items-center justify-between">
          <button onClick={() => (selectMode ? clearSelection() : setSelectMode(true))} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-xs font-semibold">
            {selectMode ? 'Cancel selection' : 'Select multiple'}
          </button>
          {isFetching && !isLoading && <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">Updating…</span>}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="py-10 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkSubtle }}>Loading…</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="package"
            title={total === 0 && !debouncedSearch && category === 'All' && statusFilter === 'active' && !lowStockOnly ? 'No products yet' : 'No products match these filters'}
            description={total === 0 ? "Add what you stock so funders and contractors can order it against a milestone." : 'Try a different search, category, or filter combination.'}
            illustration="tilt"
            action={total === 0 ? <PillButton onClick={() => nav('/supplier/inventory/new')}>Add your first product</PillButton> : undefined}
          />
        ) : (
          <StaggerList className="space-y-2">
            {items.map((item) => (
              <StaggerItem key={item.id}>
                <InventoryItemCard
                  item={item}
                  selectable={selectMode}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={() => toggleSelect(item.id)}
                  onOpen={selectMode ? undefined : () => nav(`/supplier/inventory/${item.id}/edit`)}
                  onDuplicate={selectMode ? undefined : () => duplicateMutation.mutate(item.id, {
                    onSuccess: () => showToast({ title: 'Product duplicated', tone: 'success' }),
                    onError: (err) => showToast({ title: 'Failed', description: apiErrorMessage(err), tone: 'error' }),
                  })}
                  onArchive={selectMode || item.status === 'archived' ? undefined : () => archiveMutation.mutate(item.id, {
                    onSuccess: () => showToast({ title: 'Product archived', tone: 'success' }),
                  })}
                  onRestore={selectMode || item.status === 'active' ? undefined : () => restoreMutation.mutate(item.id, {
                    onSuccess: () => showToast({ title: 'Product restored', tone: 'success' }),
                  })}
                  onDelete={selectMode ? undefined : () => setDeleteTarget(item)}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}>← Prev</button>
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wider">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}>Next →</button>
          </div>
        )}
      </div>

      {/* Floating bulk-action bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-5 pb-6 pt-3 backdrop-blur-xl sm:mx-auto sm:max-w-3xl" style={{ background: C.glassBg, borderTop: `1px solid ${C.glassBorder}`, boxShadow: C.shadowLg }}>
          <div className="flex items-center justify-between gap-2">
            <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              <button onClick={() => runBulk('archive')} className="rounded-full px-3 py-2 text-xs font-semibold" style={{ background: C.parchment, color: C.ink, fontFamily: FONT.sans }}>Archive</button>
              <button onClick={() => runBulk('restore')} className="rounded-full px-3 py-2 text-xs font-semibold" style={{ background: C.parchment, color: C.forest, fontFamily: FONT.sans }}>Restore</button>
              <button onClick={() => setBulkDeleteConfirm(true)} className="rounded-full px-3 py-2 text-xs font-semibold" style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => { showToast({ title: 'Product deleted', tone: 'success' }); setDeleteTarget(null) },
            onError: (err) => showToast({ title: 'Failed', description: apiErrorMessage(err), tone: 'error' }),
          })
        }}
        title="Delete this product?"
        description={`${deleteTarget?.name} will be permanently removed. This can't be undone — consider archiving instead if you might restock it later.`}
        confirmLabel="Delete"
        danger
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        onCancel={() => setBulkDeleteConfirm(false)}
        onConfirm={() => runBulk('delete')}
        title={`Delete ${selectedIds.size} product${selectedIds.size === 1 ? '' : 's'}?`}
        description="This can't be undone — consider archiving instead if you might restock these later."
        confirmLabel="Delete all"
        danger
      />
    </AppShell>
  )
}
