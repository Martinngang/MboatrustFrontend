import { useState } from 'react'
import { useTeam, type TeamRole } from '../team'
import { C, FONT, AppShell, Header, Card, PillButton } from '../components/MobileLayout'
import { StaggerList, StaggerItem } from '../components/Stagger'
import { Modal, ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'

const ROLE_META: Record<TeamRole, { label: string; description: string }> = {
  owner: { label: 'Owner', description: 'Full access — fund, approve, and manage the team' },
  approver: { label: 'Approver', description: 'Can review and approve milestones' },
  viewer: { label: 'Viewer', description: 'Read-only access to projects and activity' },
}
const ROLE_ORDER: TeamRole[] = ['owner', 'approver', 'viewer']

/** For diaspora-group/association accounts sharing one Mboa Trust account:
 * who on the team can fund, approve milestones, or just view. */
export function TeamManagementScreen() {
  const { members, inviteMember, updateMemberRole, removeMember } = useTeam()
  const { show: showToast } = useToast()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'viewer' as TeamRole })
  const removeTarget = members.find((m) => m.id === removingId)

  const submitInvite = () => {
    if (!form.name.trim() || !form.email.trim()) return
    inviteMember({ name: form.name.trim(), email: form.email.trim(), role: form.role })
    showToast({ title: 'Invitation sent', description: `${form.name.trim()} added as ${ROLE_META[form.role].label}`, tone: 'success' })
    setInviteOpen(false)
    setForm({ name: '', email: '', role: 'viewer' })
  }

  return (
    <AppShell>
      <Header
        title="Team & Permissions"
        subtitle={`${members.length} people`}
        back
        action={<button onClick={() => setInviteOpen(true)} style={{ fontFamily: FONT.sans, color: C.forest }} className="text-sm font-semibold">+ Invite</button>}
      />

      <div className="px-5 py-4">
        <StaggerList className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
          {members.map((m) => (
            <StaggerItem key={m.id}>
              <Card>
                <div className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold text-sm text-white" style={{ background: C.forest, fontFamily: FONT.serif }}>
                    {m.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div style={{ fontFamily: FONT.sans, color: C.ink }} className="truncate text-sm font-semibold">{m.name}</div>
                    <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="truncate text-[10px]">{m.email}</div>
                  </div>
                  {m.role === 'owner' ? (
                    <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="flex-shrink-0 text-[10px] uppercase tracking-wider">Owner</span>
                  ) : (
                    <select
                      value={m.role}
                      onChange={(e) => updateMemberRole(m.id, e.target.value as TeamRole)}
                      className="flex-shrink-0 rounded-lg border px-2 py-1.5 text-xs outline-none"
                      style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink, background: C.white }}
                    >
                      {ROLE_ORDER.filter((r) => r !== 'owner').map((r) => (
                        <option key={r} value={r}>{ROLE_META[r].label}</option>
                      ))}
                    </select>
                  )}
                  {m.role !== 'owner' && (
                    <button onClick={() => setRemovingId(m.id)} style={{ color: 'var(--status-error-text)' }} className="flex-shrink-0 text-xs font-semibold">Remove</button>
                  )}
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>

        <div className="mt-6 space-y-2">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Role permissions</div>
          {ROLE_ORDER.map((r) => (
            <div key={r} className="flex items-center justify-between rounded-xl border px-3 py-2.5" style={{ borderColor: C.parchmentDark }}>
              <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">{ROLE_META[r].label}</span>
              <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">{ROLE_META[r].description}</span>
            </div>
          ))}
        </div>
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a team member">
        <div className="space-y-4">
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Patrick Ndifor"
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
            />
          </div>
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-1.5">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="patrick@example.com"
              type="email"
              className="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm focus:border-[var(--color-forest)] transition-colors"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
            />
          </div>
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Role</label>
            <div className="flex gap-2">
              {ROLE_ORDER.filter((r) => r !== 'owner').map((r) => (
                <button
                  key={r}
                  onClick={() => setForm({ ...form, role: r })}
                  className="flex-1 rounded-xl border-2 py-2.5 text-xs font-semibold transition-all"
                  style={{ borderColor: form.role === r ? C.forest : C.parchmentDark, background: form.role === r ? 'var(--status-success-bg)' : C.white, color: form.role === r ? C.forest : C.inkMuted, fontFamily: FONT.sans }}
                >
                  {ROLE_META[r].label}
                </button>
              ))}
            </div>
          </div>
          <PillButton onClick={submitInvite} fullWidth disabled={!form.name.trim() || !form.email.trim()}>Send invitation</PillButton>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        onCancel={() => setRemovingId(null)}
        onConfirm={() => { if (removingId) removeMember(removingId); setRemovingId(null) }}
        title="Remove this person?"
        description={removeTarget ? `${removeTarget.name} will lose access to this workspace.` : undefined}
        confirmLabel="Remove"
        danger
      />
    </AppShell>
  )
}
