import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, fmt, type JobPosting } from '../context'
import { C, FONT, AppShell, Header, StatusBadge, PillButton } from '../components/MobileLayout'
import { DataTable, type DataTableColumn } from '../components/dataview/DataTable'
import { Board } from '../components/dataview/Board'
import { Timeline } from '../components/dataview/Timeline'
import { CalendarView } from '../components/dataview/CalendarView'
import { ViewSwitcher, useViewMode } from '../components/dataview/ViewSwitcher'
import { Drawer } from '../components/shell/Drawer'
import { TagsCell, CustomFieldsEditor } from '../components/dataview/CustomFieldsEditor'

const BOARD_COLUMNS = [
  { id: 'open', label: 'Open' },
  { id: 'awarded', label: 'Awarded' },
  { id: 'closed', label: 'Closed' },
]

function parsedDeadline(job: JobPosting): Date {
  const d = new Date(job.deadline)
  if (!isNaN(d.getTime())) return d
  const fallback = new Date()
  fallback.setDate(fallback.getDate() + 30)
  return fallback
}

/** List/Board/Timeline/Calendar view-switcher for Tenders — the same
 * generic dataview components WorkspaceProjectsScreen introduced, reused
 * here on JobPosting data instead of being rebuilt. */
export function WorkspaceJobsScreen() {
  const nav = useNavigate()
  const { jobs, updateJobStatus } = useApp()
  const [mode, setMode] = useViewMode('jobs')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const preview = jobs.find((j) => j.id === previewId) ?? null

  const columns: DataTableColumn<JobPosting>[] = [
    { key: 'title', header: 'Tender', sortValue: (j) => j.title, render: (j) => <span className="font-medium">{j.title}</span>, width: 'minmax(200px, 2fr)' },
    { key: 'status', header: 'Status', sortValue: (j) => j.status, render: (j) => <StatusBadge status={j.status} /> },
    { key: 'category', header: 'Category', sortValue: (j) => j.category, render: (j) => <span style={{ color: C.inkMuted }}>{j.category}</span> },
    { key: 'location', header: 'Location', sortValue: (j) => j.location, render: (j) => <span style={{ color: C.inkMuted }}>{j.location}</span> },
    { key: 'budget', header: 'Budget', sortValue: (j) => j.budget, align: 'right', render: (j) => <span style={{ color: C.ink }}>{fmt(j.budget)}</span> },
    { key: 'bids', header: 'Bids', sortValue: (j) => j.bids, align: 'right', render: (j) => <span style={{ color: C.inkMuted }}>{j.bids}</span> },
    { key: 'deadline', header: 'Deadline', sortValue: (j) => j.deadline, render: (j) => <span style={{ color: C.inkMuted }}>{j.deadline}</span> },
    { key: 'tags', header: 'Tags', render: (j) => <TagsCell entityId={j.id} /> },
  ]

  return (
    <AppShell>
      <Header title="Tenders" subtitle={`${jobs.length} total`} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <ViewSwitcher mode={mode} onChange={setMode} />
        <PillButton onClick={() => nav('/funder/post-job')} variant="secondary">+ New tender</PillButton>
      </div>

      {mode === 'list' && (
        <DataTable
          columns={columns}
          rows={jobs}
          getRowId={(j) => j.id}
          onRowClick={(j) => setPreviewId(j.id)}
          bulkActions={[
            { label: 'Mark awarded', onClick: (rows) => rows.forEach((j) => updateJobStatus(j.id, 'awarded')) },
            { label: 'Close', onClick: (rows) => rows.forEach((j) => updateJobStatus(j.id, 'closed')) },
          ]}
        />
      )}

      {mode === 'board' && (
        <Board
          columns={BOARD_COLUMNS}
          rows={jobs}
          getRowId={(j) => j.id}
          getStatus={(j) => j.status}
          onCardMove={(j, _from, to) => updateJobStatus(j.id, to)}
          renderCard={(j) => (
            <button onClick={() => setPreviewId(j.id)} className="w-full text-left">
              <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-sm font-bold">{j.title}</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-1 text-[10px] uppercase tracking-wider">{j.location}</div>
              <div className="mt-2 flex items-center justify-between">
                <span style={{ fontFamily: FONT.serif, color: C.forest }} className="text-sm font-bold">{fmt(j.budget)}</span>
                <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{j.bids} bids</span>
              </div>
            </button>
          )}
        />
      )}

      {mode === 'timeline' && (
        <Timeline
          rows={jobs}
          getRowId={(j) => j.id}
          getLabel={(j) => j.title}
          getSegments={(j) => {
            const end = parsedDeadline(j)
            const start = new Date(end)
            start.setDate(start.getDate() - 21)
            return [{ label: j.status === 'awarded' ? 'Awarded' : `Due ${j.deadline}`, start, end, color: j.status === 'awarded' ? C.emerald : C.gold, onClick: () => setPreviewId(j.id) }]
          }}
        />
      )}

      {mode === 'calendar' && (
        <CalendarView
          items={jobs.map((j) => ({
            id: j.id,
            date: parsedDeadline(j).toISOString().slice(0, 10),
            label: j.title,
            color: j.status === 'awarded' ? C.emerald : C.gold,
            onClick: () => setPreviewId(j.id),
          }))}
        />
      )}

      <Drawer
        open={!!preview}
        onClose={() => setPreviewId(null)}
        subtitle={preview?.category}
        title={preview?.title}
        footer={preview && (
          <div className="space-y-2">
            <PillButton fullWidth onClick={() => nav(`/funder/tender/${preview.id}/bids`)}>View bids ({preview.bids}) →</PillButton>
            <PillButton fullWidth variant="secondary" onClick={() => nav(`/contractor/job/${preview.id}`)}>View full tender →</PillButton>
          </div>
        )}
      >
        {preview && (
          <div className="space-y-4">
            <StatusBadge status={preview.status} />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest">Budget</div>
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold">{fmt(preview.budget)}</div>
              </div>
              <div className="rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest">Bids so far</div>
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold">{preview.bids}</div>
              </div>
            </div>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed">{preview.description}</p>
            <CustomFieldsEditor key={preview.id} entityId={preview.id} />
          </div>
        )}
      </Drawer>
    </AppShell>
  )
}
