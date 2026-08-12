import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, fmt, type LandListing } from '../context'
import { C, FONT, AppShell, Header, StatusBadge, PillButton } from '../components/MobileLayout'
import { DataTable, type DataTableColumn } from '../components/dataview/DataTable'
import { Board } from '../components/dataview/Board'
import { ViewSwitcher, useViewMode } from '../components/dataview/ViewSwitcher'
import { Drawer } from '../components/shell/Drawer'
import { TagsCell, CustomFieldsEditor } from '../components/dataview/CustomFieldsEditor'
import { AppIcon } from '../components/icons'

const BOARD_COLUMNS = [
  { id: 'pending', label: 'Pending' },
  { id: 'verified', label: 'Verified' },
  { id: 'disputed', label: 'Disputed' },
]

function statusOf(l: LandListing): 'pending' | 'verified' | 'disputed' {
  if (l.disputed) return 'disputed'
  if (l.verified) return 'verified'
  return 'pending'
}

/** List/Board view-switcher for Land listings — Timeline/Calendar are
 * omitted here (via ViewSwitcher's `available` prop) since listings have no
 * genuine date field to plot, unlike Projects (milestone due dates) or
 * Tenders (bid deadlines). */
export function WorkspaceLandScreen() {
  const nav = useNavigate()
  const { landListings, updateListingStatus } = useApp()
  const [mode, setMode] = useViewMode('land')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const preview = landListings.find((l) => l.id === previewId) ?? null

  const columns: DataTableColumn<LandListing>[] = [
    { key: 'title', header: 'Listing', sortValue: (l) => l.title, render: (l) => <span className="font-medium">{l.title}</span>, width: 'minmax(200px, 2fr)' },
    { key: 'status', header: 'Status', sortValue: (l) => statusOf(l), render: (l) => <StatusBadge status={statusOf(l)} /> },
    { key: 'location', header: 'Location', sortValue: (l) => l.city, render: (l) => <span style={{ color: C.inkMuted }}>{l.city}, {l.region}</span> },
    { key: 'size', header: 'Size', sortValue: (l) => l.size, render: (l) => <span style={{ color: C.inkMuted }}>{l.size}</span> },
    { key: 'price', header: 'Price', sortValue: (l) => l.price, align: 'right', render: (l) => <span style={{ color: C.ink }}>{fmt(l.price)}</span> },
    { key: 'seller', header: 'Seller', sortValue: (l) => l.seller, render: (l) => <span style={{ color: C.inkMuted }}>{l.seller}</span> },
    { key: 'tags', header: 'Tags', render: (l) => <TagsCell entityId={l.id} /> },
  ]

  return (
    <AppShell>
      <Header title="Land Listings" subtitle={`${landListings.length} total`} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ViewSwitcher mode={mode} onChange={setMode} available={['list', 'board']} />
        <PillButton onClick={() => nav('/land/create')} variant="secondary">+ New listing</PillButton>
      </div>

      {mode === 'list' && (
        <DataTable
          columns={columns}
          rows={landListings}
          getRowId={(l) => l.id}
          onRowClick={(l) => setPreviewId(l.id)}
          bulkActions={[
            { label: 'Mark verified', onClick: (rows) => rows.forEach((l) => updateListingStatus(l.id, 'verified')) },
            { label: 'Flag disputed', onClick: (rows) => rows.forEach((l) => updateListingStatus(l.id, 'disputed')), danger: true },
          ]}
        />
      )}

      {mode === 'board' && (
        <Board
          columns={BOARD_COLUMNS}
          rows={landListings}
          getRowId={(l) => l.id}
          getStatus={statusOf}
          onCardMove={(l, _from, to) => updateListingStatus(l.id, to as 'pending' | 'verified' | 'disputed')}
          renderCard={(l) => (
            <button onClick={() => setPreviewId(l.id)} className="w-full text-left">
              <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-sm font-bold">{l.title}</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-1 text-[10px] uppercase tracking-wider">{l.city}, {l.region}</div>
              <div className="mt-2" style={{ fontFamily: FONT.serif, color: C.forest }}>{fmt(l.price)}</div>
            </button>
          )}
        />
      )}

      <Drawer
        open={!!preview}
        onClose={() => setPreviewId(null)}
        subtitle={preview ? `${preview.city}, ${preview.region}` : undefined}
        title={preview?.title}
        footer={preview && (
          <PillButton fullWidth onClick={() => nav(`/land/listing/${preview.id}`)}>View full listing →</PillButton>
        )}
      >
        {preview && (
          <div className="space-y-4">
            <StatusBadge status={statusOf(preview)} />
            {preview.disputed && preview.disputeReason && (
              <div className="rounded-xl border p-3" style={{ background: 'var(--status-error-bg)', borderColor: 'var(--status-error-text)' }}>
                <p style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }} className="text-xs leading-relaxed">{preview.disputeReason}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest">Price</div>
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold">{fmt(preview.price)}</div>
              </div>
              <div className="rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest">Size</div>
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold">{preview.size}</div>
              </div>
            </div>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm leading-relaxed">{preview.description}</p>
            <div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">Documents</div>
              <div className="space-y-1.5">
                {preview.docs.map((d, i) => (
                  <div key={i} style={{ fontFamily: FONT.sans, color: C.ink }} className="inline-flex items-center gap-1.5 text-xs"><AppIcon name="clipboard" size={13} style={{ color: C.inkSubtle }} /> {d}</div>
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
