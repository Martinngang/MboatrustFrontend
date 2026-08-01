import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmt } from '../context'
import { useTemplates, type ProjectTemplate } from '../templates'
import { C, FONT, AppShell, Header, Card, PillButton } from '../components/MobileLayout'
import { EmptyState } from '../components/EmptyState'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { ConfirmDialog } from '../components/Modal'

/** Manage saved project templates — reusable milestone breakdowns for
 * recurring project types (see MilestonesScreen, where these get applied
 * when starting a new project). */
export function TemplatesScreen() {
  const nav = useNavigate()
  const { templates, deleteTemplate } = useTemplates()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const deleteTarget = templates.find((t) => t.id === deletingId)

  const total = (t: ProjectTemplate) => t.milestones.reduce((s, m) => s + m.amount, 0)

  return (
    <AppShell>
      <Header title="Project Templates" subtitle={`${templates.length} saved`} back />

      <div className="px-5 py-4">
        {templates.length === 0 ? (
          <EmptyState
            icon="🧩"
            title="No templates yet"
            description="Save a milestone breakdown as a template the next time you set up a project's milestones."
            illustration="tilt"
            action={<PillButton onClick={() => nav('/funder/create')}>Start a new project</PillButton>}
          />
        ) : (
          <StaggerList className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
            {templates.map((t) => (
              <StaggerItem key={t.id}>
                <Card>
                  <div className="p-4">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-sm font-bold">{t.name}</div>
                      <button onClick={() => setDeletingId(t.id)} style={{ color: 'var(--status-error-text)', fontFamily: FONT.mono }} className="flex-shrink-0 text-xs">Delete</button>
                    </div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-wider">{t.category} · {t.milestones.length} milestones</div>
                    <div className="space-y-1.5">
                      {t.milestones.map((m, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span style={{ fontFamily: FONT.sans, color: C.inkMuted }}>{m.title}</span>
                          <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{fmt(m.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 border-t pt-2 text-right" style={{ borderColor: C.parchmentDark }}>
                      <span style={{ fontFamily: FONT.serif, color: C.forest }} className="text-sm font-bold">{fmt(total(t))}</span>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId) deleteTemplate(deletingId); setDeletingId(null) }}
        title="Delete this template?"
        description={deleteTarget ? `"${deleteTarget.name}" will no longer be available to apply to new projects.` : undefined}
        confirmLabel="Delete template"
        danger
      />
    </AppShell>
  )
}
