import { useState, type ReactNode } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { C, FONT } from '../MobileLayout'

export interface WidgetDef {
  id: string
  title: string
  render: () => ReactNode
}

/** Drag-to-reorder widget grid for the Home dashboard, persisted per role
 * (`sectionKey`) to localStorage — ClickUp/Notion-style customizable home.
 * Additive to the existing DashboardHero/QuickActionsGrid above it, not a
 * replacement, so nothing already on Home breaks. */
export function WidgetGrid({ sectionKey, widgets }: { sectionKey: string; widgets: WidgetDef[] }) {
  const storageKey = `mboatrust-widgets:${sectionKey}`
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
      if (Array.isArray(stored)) {
        const known = stored.filter((id): id is string => widgets.some((w) => w.id === id))
        const missing = widgets.map((w) => w.id).filter((id) => !known.includes(id))
        return [...known, ...missing]
      }
    } catch { /* ignore */ }
    return widgets.map((w) => w.id)
  })

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setOrder((ord) => {
      const next = arrayMove(ord, ord.indexOf(String(active.id)), ord.indexOf(String(over.id)))
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const ordered = order.map((id) => widgets.find((w) => w.id === id)).filter((w): w is WidgetDef => !!w)

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="grid gap-4 lg:grid-cols-2">
          {ordered.map((w) => (
            <SortableWidget key={w.id} id={w.id} title={w.title}>{w.render()}</SortableWidget>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableWidget({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined }}
      className="rounded-2xl border"
    >
      <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: C.parchmentDark }}>
        <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">{title}</span>
        <button
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${title}`}
          className="cursor-grab touch-none px-1.5 py-0.5 text-sm active:cursor-grabbing"
          style={{ color: C.inkSubtle }}
        >
          ⠿
        </button>
      </div>
      <div className="p-4" style={{ background: C.white }}>{children}</div>
    </div>
  )
}
