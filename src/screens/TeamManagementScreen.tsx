import { useState } from 'react'
import { useTeam, type TeamRole, type TeamPermission } from '../team'
import { useTeamActivityQuery } from '../api/teamMembers'
import { useApp } from '../context'
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

// Only meaningful for a contractor's own team — a delegate with this
// permission can create/submit/update milestone evidence on the
// contractor's behalf (see projectController.assertProjectParty's delegate
// check). Nothing else the contractor can do is ever granted by this.
const DELEGATE_PERMISSION: TeamPermission = 'submit_milestones'

function activityLabel(action: string, detail: Record<string, unknown>): string {
  switch (action) {
    case 'member.invited':
      return `Invited ${detail.email || 'a member'}`
    case 'member.permissionsChanged':
      return `Updated permissions${detail.permissions && Array.isArray(detail.permissions) && detail.permissions.length > 0 ? ' (can submit milestones)' : ' (no delegated permissions)'}`
    case 'member.removed':
      return `Removed ${detail.email || 'a member'}`
    case 'milestone.submittedOnBehalf':
      return `Submitted milestone evidence${detail.milestoneName ? ` for "${detail.milestoneName}"` : ''} on your behalf`
    default:
      return action.replace(/[._]/g, ' ')
  }
}

/** For diaspora-group/association accounts sharing one Mboa Trust account,
 * and for a contractor delegating milestone-evidence submission to a
 * trusted team member — who's on the team, what they can do, and a durable
 * history of every invite/permission-change/removal/on-behalf submission. */
export function TeamManagementScreen() {
  const { members, inviteMember, updateMemberRole, updateMemberPermissions, removeMember } = useTeam()
  const { role } = useApp()
  const isContractor = role === 'contractor'
  const { data: activity = [] } = useTeamActivityQuery(isContractor)
  const { show: showToast } = useToast()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'viewer' as TeamRole, canSubmitMilestones: false })
  const removeTarget = members.find((m) => m.id === removingId)

  const submitInvite = () => {
    if (!form.name.trim() || !form.email.trim()) return
    inviteMember({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      permissions: form.canSubmitMilestones ? [DELEGATE_PERMISSION] : [],
    })
    showToast({ title: 'Member added', description: `${form.name.trim()} added as ${ROLE_META[form.role].label}. No email is sent yet — let them know directly.`, tone: 'success' })
    setInviteOpen(false)
    setForm({ name: '', email: '', role: 'viewer', canSubmitMilestones: false })
  }

  const toggleDelegatePermission = (memberId: string, permissions: TeamPermission[]) => {
    const has = permissions.includes(DELEGATE_PERMISSION)
    updateMemberPermissions(memberId, has ? permissions.filter((p) => p !== DELEGATE_PERMISSION) : [...permissions, DELEGATE_PERMISSION])
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
        <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mb-4 text-xs leading-relaxed">
          Who's on your team. Inviting someone doesn't send an email yet — let them know directly — and roles here don't restrict access elsewhere in the app yet, but the list is saved to your account.
        </p>
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
                {isContractor && m.role !== 'owner' && m.status === 'active' && (
                  <label className="flex items-center gap-2 px-4 pb-3 -mt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={m.permissions.includes(DELEGATE_PERMISSION)}
                      onChange={() => toggleDelegatePermission(m.id, m.permissions)}
                      className="h-3.5 w-3.5"
                    />
                    <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs">Can submit milestones on my behalf</span>
                  </label>
                )}
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

        {isContractor && (
          <div className="mt-6 space-y-2">
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Activity history</div>
            {activity.length === 0 ? (
              <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs italic">No team activity yet.</p>
            ) : (
              activity.map((row) => (
                <div key={row.id} className="rounded-xl border px-3 py-2.5" style={{ borderColor: C.parchmentDark }}>
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-xs">{activityLabel(row.action, row.detail)}</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">
                    {row.actorName} · {new Date(row.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
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
          {isContractor && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.canSubmitMilestones}
                onChange={(e) => setForm({ ...form, canSubmitMilestones: e.target.checked })}
                className="h-4 w-4"
              />
              <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm">Can submit milestones on my behalf</span>
            </label>
          )}
          <PillButton onClick={submitInvite} fullWidth disabled={!form.name.trim() || !form.email.trim()}>Send invitation</PillButton>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        onCancel={() => setRemovingId(null)}
        onConfirm={() => { if (removingId) removeMember(removingId); setRemovingId(null) }}
        title="Remove this person?"
        description={removeTarget ? `${removeTarget.name} will be removed from this list.` : undefined}
        confirmLabel="Remove"
        danger
      />
    </AppShell>
  )
}
