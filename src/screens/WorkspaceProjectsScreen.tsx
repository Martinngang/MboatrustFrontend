import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, fmt, type Project } from '../context'
import { C, FONT, AppShell, Header, StatusBadge, ProgressBar, PillButton } from '../components/MobileLayout'
import { DataTable, type DataTableColumn } from '../components/dataview/DataTable'
import { Board } from '../components/dataview/Board'
import { Timeline } from '../components/dataview/Timeline'
import { CalendarView } from '../components/dataview/CalendarView'
import { ViewSwitcher, useViewMode } from '../components/dataview/ViewSwitcher'
import { Drawer } from '../components/shell/Drawer'
import { TagsCell, CustomFieldsEditor } from '../components/dataview/CustomFieldsEditor'

const BOARD_COLUMNS = [
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'disputed', label: 'Disputed' },
]

function dueDate(project: Project): Date {
  const d = new Date()
  d.setDate(d.getDate() + (project.status === 'completed' ? -7 : Math.max(project.daysLeft, 1)))
  return d
}

/** Demonstrates the new List/Board/Timeline/Calendar view-switcher on real
 * Project data. The existing BrowseProjectsScreen (/funder/browse) is left
 * untouched and still reachable from its own deep links — this is the new
 * destination the Sidebar's "Projects" item now points to. */
export function WorkspaceProjectsScreen() {
  const nav = useNavigate()
  const { projects, updateProjectStatus } = useApp()
  const [mode, setMode] = useViewMode('projects')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const preview = projects.find((p) => p.id === previewId) ?? null

  const columns: DataTableColumn<Project>[] = [
    { key: 'title', header: 'Project', sortValue: (p) => p.title, render: (p) => <span className="font-medium">{p.title}</span>, width: 'minmax(200px, 2fr)' },
    { key: 'status', header: 'Status', sortValue: (p) => p.status, render: (p) => <StatusBadge status={p.status} /> },
    { key: 'category', header: 'Category', sortValue: (p) => p.category, render: (p) => <span style={{ color: C.inkMuted }}>{p.category}</span> },
    { key: 'location', header: 'Location', sortValue: (p) => p.location, render: (p) => <span style={{ color: C.inkMuted }}>{p.location}</span> },
    {
      key: 'progress', header: 'Funded', sortValue: (p) => p.raised / p.totalAmount,
      render: (p) => (
        <div className="min-w-[120px]">
          <ProgressBar pct={Math.round((p.raised / p.totalAmount) * 100)} />
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-1 text-[10px]">{fmt(p.raised)} / {fmt(p.totalAmount)}</div>
        </div>
      ),
      width: '160px',
    },
    { key: 'daysLeft', header: 'Days left', sortValue: (p) => p.daysLeft, align: 'right', render: (p) => <span style={{ color: C.inkMuted }}>{p.daysLeft > 0 ? p.daysLeft : 'Done'}</span> },
    { key: 'tags', header: 'Tags', render: (p) => <TagsCell entityId={p.id} /> },
  ]

  return (
    <AppShell>
      <Header title="Projects" subtitle={`${projects.length} total`} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <ViewSwitcher mode={mode} onChange={setMode} />
        <PillButton onClick={() => nav('/funder/create')} variant="secondary">+ New project</PillButton>
      </div>

      {mode === 'list' && (
        <DataTable
          columns={columns}
          rows={projects}
          getRowId={(p) => p.id}
          onRowClick={(p) => setPreviewId(p.id)}
          bulkActions={[
            { label: 'Mark completed', onClick: (rows) => rows.forEach((p) => updateProjectStatus(p.id, 'completed')) },
          ]}
        />
      )}

      {mode === 'board' && (
        <Board
          columns={BOARD_COLUMNS}
          rows={projects}
          getRowId={(p) => p.id}
          getStatus={(p) => p.status}
          onCardMove={(p, _from, to) => updateProjectStatus(p.id, to)}
          renderCard={(p) => (
            <button onClick={() => setPreviewId(p.id)} className="w-full text-left">
              <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-sm font-bold">{p.title}</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-1 text-[10px] uppercase tracking-wider">{p.location}</div>
              <div className="mt-2"><ProgressBar pct={Math.round((p.raised / p.totalAmount) * 100)} /></div>
            </button>
          )}
        />
      )}

      {mode === 'timeline' && (
        <Timeline
          rows={projects}
          getRowId={(p) => p.id}
          getLabel={(p) => p.title}
          getSegments={(p) => {
            const end = dueDate(p)
            const start = new Date(end)
            start.setDate(start.getDate() - (p.status === 'completed' ? 7 : Math.max(p.daysLeft, 7)))
            return [{
              label: p.status === 'completed' ? 'Completed' : `${p.daysLeft}d left`,
              start, end,
              color: p.status === 'completed' ? C.emerald : C.gold,
              onClick: () => setPreviewId(p.id),
            }]
          }}
        />
      )}

      {mode === 'calendar' && (
        <CalendarView
          items={projects.map((p) => ({
            id: p.id,
            date: dueDate(p).toISOString().slice(0, 10),
            label: p.title,
            color: p.status === 'completed' ? C.emerald : C.gold,
            onClick: () => setPreviewId(p.id),
          }))}
        />
      )}

      <Drawer
        open={!!preview}
        onClose={() => setPreviewId(null)}
        subtitle={preview?.category}
        title={preview?.title}
        footer={preview && (
          <PillButton fullWidth onClick={() => nav(`/funder/project/${preview.id}`)}>View full project →</PillButton>
        )}
      >
        {preview && (
          <div className="space-y-4">
            <StatusBadge status={preview.status} />
            <div>
              <ProgressBar pct={Math.round((preview.raised / preview.totalAmount) * 100)} />
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-1 text-[10px]">{fmt(preview.raised)} raised of {fmt(preview.totalAmount)}</div>
            </div>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed">{preview.description}</p>
            <div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">Milestones</div>
              <div className="space-y-2">
                {preview.milestones.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: C.parchmentDark }}>
                    <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-xs">{m.title}</span>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>
            </div>
            <CustomFieldsEditor key={preview.id} entityId={preview.id} />
          </div>
        )}
      </Drawer>
    </AppShell>
  )
}
