import type { ReactNode } from 'react'
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { C, FONT } from '../MobileLayout'

export interface BoardColumn {
  id: string
  label: string
}

/** Kanban board grouped by a configurable status column list. Drag-and-drop
 * via @dnd-kit/core for real keyboard/touch/screen-reader support. Invalid
 * moves (rejected by `isValidMove`) simply don't call `onCardMove`, so the
 * card stays put — no separate "snap back" animation needed since we never
 * optimistically move it in the first place. */
export function Board<T>({ columns, rows, getRowId, getStatus, renderCard, onCardMove, isValidMove }: {
  columns: BoardColumn[]
  rows: T[]
  getRowId: (row: T) => string
  getStatus: (row: T) => string
  renderCard: (row: T) => ReactNode
  onCardMove: (row: T, from: string, to: string) => void
  isValidMove?: (row: T, from: string, to: string) => boolean
}) {
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const row = rows.find((r) => getRowId(r) === String(active.id))
    if (!row) return
    const from = getStatus(row)
    const to = String(over.id)
    if (from === to) return
    if (isValidMove && !isValidMove(row, from, to)) return
    onCardMove(row, from, to)
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((col) => {
          const colRows = rows.filter((r) => getStatus(r) === col.id)
          return (
            <BoardColumnZone key={col.id} column={col} count={colRows.length}>
              {colRows.map((row) => (
                <BoardCard key={getRowId(row)} id={getRowId(row)}>
                  {renderCard(row)}
                </BoardCard>
              ))}
            </BoardColumnZone>
          )
        })}
      </div>
    </DndContext>
  )
}

function BoardColumnZone({ column, count, children }: { column: BoardColumn; count: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  return (
    <div
      ref={setNodeRef}
      className="flex w-72 flex-shrink-0 flex-col rounded-2xl border p-3 transition-colors"
      style={{ borderColor: isOver ? C.emerald : C.parchmentDark, background: isOver ? 'var(--status-success-bg)' : C.parchment }}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[10px] uppercase tracking-widest">{column.label}</span>
        <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{count}</span>
      </div>
      <div className="flex flex-col gap-2 min-h-[60px]">
        {children}
        {count === 0 && (
          <div className="rounded-xl border border-dashed py-6 text-center" style={{ borderColor: C.parchmentDark }}>
            <span style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">Drop here</span>
          </div>
        )}
      </div>
    </div>
  )
}

function BoardCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-xl border p-3 active:cursor-grabbing"
      style={{
        borderColor: C.parchmentDark,
        background: C.white,
        boxShadow: C.shadowSm,
        opacity: isDragging ? 0.4 : 1,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 50 : undefined,
        position: isDragging ? 'relative' : undefined,
      }}
    >
      {children}
    </div>
  )
}
