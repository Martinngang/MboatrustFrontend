import { useMemo, useState, type ReactNode } from 'react'
import { C, FONT } from '../MobileLayout'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Required to enable header-click sorting for this column. */
  sortValue?: (row: T) => string | number
  hideable?: boolean
  width?: string
  align?: 'left' | 'right' | 'center'
}

export interface BulkAction<T> {
  label: string
  onClick: (rows: T[]) => void
  danger?: boolean
}

/** Generic, headless-style data table: sortable columns, column show/hide,
 * row hover actions, checkbox bulk-select + bulk-action bar, sticky header.
 * Not tied to any one row shape — Projects/Tenders/Land all drive this
 * through their own `columns` + `getRowId`. */
export function DataTable<T>({ columns, rows, getRowId, onRowClick, rowActions, bulkActions, emptyState }: {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => ReactNode
  bulkActions?: BulkAction<T>[]
  emptyState?: ReactNode
}) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [columnMenuOpen, setColumnMenuOpen] = useState(false)

  const visibleColumns = columns.filter((c) => !hidden.has(c.key))

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const withValues = rows.map((row) => ({ row, v: col.sortValue!(row) }))
    withValues.sort((a, b) => (a.v < b.v ? -1 : a.v > b.v ? 1 : 0))
    if (sort.dir === 'desc') withValues.reverse()
    return withValues.map((x) => x.row)
  }, [rows, sort, columns])

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortValue) return
    setSort((s) => {
      if (!s || s.key !== col.key) return { key: col.key, dir: 'asc' }
      if (s.dir === 'asc') return { key: col.key, dir: 'desc' }
      return null
    })
  }

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const allSelected = rows.length > 0 && selected.size === rows.length
  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(rows.map(getRowId)))
  const selectedRows = rows.filter((r) => selected.has(getRowId(r)))

  if (rows.length === 0 && emptyState) return <>{emptyState}</>

  return (
    <div className="relative rounded-2xl border" style={{ borderColor: C.parchmentDark, background: C.white, boxShadow: C.shadowSm }}>
      <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: C.parchmentDark }}>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">
          {rows.length} {rows.length === 1 ? 'row' : 'rows'}{selected.size > 0 ? ` · ${selected.size} selected` : ''}
        </div>
        <div className="relative">
          <button
            onClick={() => setColumnMenuOpen((o) => !o)}
            className="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--color-parchment)]"
            style={{ fontFamily: FONT.sans, color: C.inkMuted }}
          >
            Columns
          </button>
          {columnMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setColumnMenuOpen(false)} />
              <div
                className="absolute right-0 top-8 z-20 w-48 rounded-xl border p-2"
                style={{ background: C.white, borderColor: C.parchmentDark, boxShadow: C.shadowLg }}
              >
                {columns.filter((c) => c.hideable !== false).map((c) => (
                  <label key={c.key} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--color-parchment)]">
                    <input
                      type="checkbox"
                      checked={!hidden.has(c.key)}
                      onChange={() => setHidden((h) => {
                        const next = new Set(h)
                        if (next.has(c.key)) next.delete(c.key)
                        else next.add(c.key)
                        return next
                      })}
                      style={{ accentColor: C.emerald }}
                    />
                    <span style={{ fontFamily: FONT.sans, color: C.ink }}>{c.header}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="sticky top-0 z-10" style={{ background: C.white }}>
              <th className="w-10 border-b px-3 py-2.5" style={{ borderColor: C.parchmentDark }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ accentColor: C.emerald }} />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col)}
                  className={`border-b px-3 py-2.5 text-${col.align ?? 'left'} ${col.sortValue ? 'cursor-pointer select-none' : ''}`}
                  style={{ borderColor: C.parchmentDark, width: col.width, fontFamily: FONT.mono, color: C.inkSubtle }}
                >
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest">
                    {col.header}
                    {sort?.key === col.key && <span>{sort.dir === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
              ))}
              {rowActions && <th className="border-b px-3 py-2.5" style={{ borderColor: C.parchmentDark }} />}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const id = getRowId(row)
              return (
                <tr
                  key={id}
                  className="group transition-colors hover:bg-[var(--color-parchment)]"
                  style={{ cursor: onRowClick ? 'pointer' : undefined }}
                >
                  <td className="border-b px-3 py-2.5" style={{ borderColor: C.parchmentDark }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(id)} onChange={() => toggleSelect(id)} style={{ accentColor: C.emerald }} />
                  </td>
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      onClick={() => onRowClick?.(row)}
                      className={`border-b px-3 py-2.5 text-${col.align ?? 'left'}`}
                      style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="border-b px-3 py-2.5 text-right opacity-0 transition-opacity group-hover:opacity-100" style={{ borderColor: C.parchmentDark }} onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {bulkActions && selected.size > 0 && (
        <div
          className="sticky bottom-0 flex items-center justify-between gap-3 border-t px-4 py-3"
          style={{ borderColor: C.parchmentDark, background: C.parchment }}
        >
          <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2">
            {bulkActions.map((a) => (
              <button
                key={a.label}
                onClick={() => { a.onClick(selectedRows); setSelected(new Set()) }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={a.danger
                  ? { background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }
                  : { background: C.emerald, color: C.white, fontFamily: FONT.sans }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
