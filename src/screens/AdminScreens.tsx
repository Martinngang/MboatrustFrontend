import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmt } from '../context'
import { C, FONT, Card, StatusBadge, PillButton } from '../components/MobileLayout'
import { AdminShell } from '../components/shell/AdminShell'
import { AdminKpiCard } from '../components/admin/AdminKpiCard'
import { AdminTrendChart } from '../components/admin/AdminTrendChart'
import { AppIcon } from '../components/icons'
import { ChipGroup } from '../components/Chip'
import { DataTable, type DataTableColumn } from '../components/dataview/DataTable'
import { Drawer } from '../components/shell/Drawer'
import { ConfirmDialog, Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import { downloadCsv } from '../lib/csv'
import {
  usePlatformStatsQuery, useSystemHealthQuery, useAdminActivityQuery,
  useAdminUsersQuery, useDeactivateUserMutation, useReactivateUserMutation, useGrantRoleMutation, useRevokeRoleMutation,
  useCreateAdminUserMutation, useUpdateAdminUserMutation, useDeleteAdminUserMutation, useAdminChangePasswordMutation,
  type AdminUser,
} from '../api/admin'
import { useAdminProjectsQuery, useProjectQuery, useAdminUpdateProjectMutation, useAdminRemoveProjectMutation, type AdminProjectRow } from '../api/projects'
import {
  useEscrowQuery, useAdminRefundEscrowMutation, useAdminCreateEscrowMutation, useAdminUpdateEscrowMutation, useAdminRemoveEscrowMutation,
  type EscrowEntry, type CreateEscrowInput,
} from '../api/escrow'
import { apiErrorMessage } from '../api/client'
import {
  useVerifierApplicationsQuery, useDecideVerifierApplicationMutation, useAdminUpdateVerifierProfileMutation,
  type VerifierProfileRecord,
} from '../api/verifierProfiles'
import {
  useSupplierApplicationsQuery, useDecideSupplierProfileMutation,
} from '../api/supplierProfiles'
import {
  useAllCertificationsQuery, useDecideCertificationMutation, useAdminUpdateCertificationMutation, useAdminRemoveCertificationMutation,
  type Certification,
} from '../api/certifications'
import { Tabs } from '../components/Tabs'
import {
  useAdminLandListingsQuery, useUpdateVerificationStatusMutation, useLandOffersForListingQuery, useVisitRequestsForListingQuery,
  useAdminUpdateListingMutation, useAdminRemoveListingMutation,
  type AdminLandListingRow,
} from '../api/land'
import { useAdminContractorsQuery, useAdminUpdateContractorProfileMutation, type AdminContractorRow } from '../api/contractors'
import { useBidsQuery } from '../api/tenders'
import {
  useContractsQuery, useAdminCreateContractMutation, useAdminUpdateContractMutation, useAdminRemoveContractMutation,
  type Contract,
} from '../api/contracts'
import {
  useAdminGroupsQuery, useGroupDashboardQuery, useAdminUpdateGroupMutation, useAdminRemoveGroupMutation,
  type AdminGroupRow,
} from '../api/groups'
import { useAdminReferralsQuery, useAdminRemoveReferralMutation, type AdminReferralRow } from '../api/referrals'
import { useAdminSubscriptionsQuery, useCancelSubscriptionMutation, type AdminSubscriptionRow } from '../api/subscriptions'
import {
  useAdminTeamMembersQuery, useUpdateTeamMemberRoleMutation, useRemoveTeamMemberMutation,
  type AdminTeamMemberRow,
} from '../api/teamMembers'
import {
  useVerificationTasksQuery, type BackendVerificationTask,
  useAdminRatingsQuery, useDeleteRatingMutation, useAdminCreateRatingMutation, useAdminUpdateRatingMutation,
  type AdminRatingRow,
} from '../api/reputation'
import {
  useAdminVideoSessionsQuery, useCancelVideoSessionMutation, useScheduleVideoSessionMutation,
  type VideoSession,
} from '../api/videoVerification'
import { useAdminConversationsQuery, type AdminConversationRow } from '../api/adminConversations'
import {
  useAdminNotificationsHistoryQuery, useBroadcastNotificationMutation,
  ADMIN_NOTIFICATION_TARGET_ROLES, type AdminNotificationTargetRole, type AdminNotificationHistoryRow,
} from '../api/adminNotifications'
import { useFeeConfigQuery, useUpsertFeeConfigMutation, useRemoveFeeConfigMutation, type FeeConfigRow } from '../api/feeConfig'
import {
  useAdminAccountsQuery, useSetAdminPermissionsMutation,
  ADMIN_PERMISSION_KEYS, type AdminPermissionKey, type AdminAccountRow,
} from '../api/adminAccounts'
import { useMyAdminPermissionsQuery } from '../api/session'
import { ADMIN_NAV } from '../components/shell/adminNav'
import { useUserSearchQuery } from '../api/users'
import type { SupplierProfile } from '../materials'

const ACTION_LABEL: Record<string, string> = {
  'user.deactivate': 'deactivated a user',
  'user.reactivate': 'reactivated a user',
  'user.grantRole': 'granted a role',
  'user.revokeRole': 'revoked a role',
  'escrow.refund': 'issued a refund',
  'dispute.resolve': 'resolved a dispute',
  'verifierProfile.approve': 'approved a verifier application',
  'verifierProfile.reject': 'rejected a verifier application',
  'contractorCertification.verify': 'verified a certification',
  'contractorCertification.reject': 'rejected a certification',
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function AdminOverviewScreen() {
  const nav = useNavigate()
  const { data: stats, isError: statsError } = usePlatformStatsQuery()
  const { data: health } = useSystemHealthQuery()
  const { data: activity = [] } = useAdminActivityQuery({ limit: 12 })

  if (statsError) {
    return (
      <AdminShell>
        <div className="mx-auto max-w-md py-10 text-center">
          <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">Access denied</div>
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-2 text-sm">This area is restricted to platform admins.</p>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Platform overview</div>
          <h1 style={{ fontFamily: FONT.serif, color: C.ink }} className="mt-1 text-2xl font-bold">Dashboard</h1>
        </div>
        <div className="hidden items-center gap-2 rounded-full px-3 py-1.5 sm:flex" style={{ background: 'var(--status-success-bg)' }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--status-success-text)' }} />
          <span style={{ fontFamily: FONT.mono, color: 'var(--status-success-text)' }} className="text-[10px] uppercase tracking-widest">
            {health?.db.connected ? 'Systems normal' : 'Checking…'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminKpiCard icon="users" label="Total users" value={stats ? String(stats.totalUsers) : '—'} tone="neutral" />
        <AdminKpiCard icon="folder" label="Active projects" value={stats ? String(stats.activeProjects) : '—'} tone="positive" />
        <AdminKpiCard icon="wallet" label="Escrow held" value={stats ? fmt(stats.totalEscrowHeld) : '—'} tone="revenue" />
        <AdminKpiCard icon="alert" label="Open disputes" value={stats ? String(stats.openDisputes) : '—'} tone="risk" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="p-4">
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-widest">New users — last 30 days</div>
            {stats && <AdminTrendChart data={stats.trends.newUsersByDay} color={C.forest} />}
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-widest">Escrow volume — last 30 days</div>
            {stats && <AdminTrendChart data={stats.trends.escrowVolumeByDay} color={C.amber} formatValue={(v) => fmt(v)} />}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Recent admin activity</div>
              <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px]">Audit log</span>
            </div>
            {activity.length === 0 ? (
              <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-6 text-center text-sm">No admin actions recorded yet.</p>
            ) : (
              <div className="max-h-72 space-y-0.5 overflow-y-auto">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--color-parchment)]">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: C.forest }} />
                    <div className="min-w-0 flex-1">
                      <p style={{ fontFamily: FONT.sans, color: C.ink }} className="text-xs">
                        <strong>{a.adminName}</strong> {ACTION_LABEL[a.action] || a.action}
                      </p>
                    </div>
                    <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="flex-shrink-0 text-[10px]">{timeAgo(a.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-widest">Quick actions</div>
            <div className="space-y-2">
              {[
                { label: 'Manage users', path: '/admin/users', icon: 'users' as const },
                { label: 'Review projects', path: '/admin/projects', icon: 'folder' as const },
                { label: 'Open disputes', path: '/admin/disputes', icon: 'scale' as const },
                { label: 'Verifications queue', path: '/admin/verifications', icon: 'shieldCheck' as const },
              ].map((a) => (
                <button
                  key={a.path}
                  onClick={() => nav(a.path)}
                  className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-parchment)]"
                  style={{ borderColor: C.parchmentDark }}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: C.parchment, color: C.forest }}>
                    <AppIcon name={a.icon} size={14} />
                  </span>
                  <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </AdminShell>
  )
}

// ── Users management ────────────────────────────────────────────────────────
const ROLE_OPTIONS = ['all', 'funder', 'contractor', 'land_seller', 'verifier', 'admin', 'supplier']
const GRANTABLE_ROLES = ['funder', 'contractor', 'land_seller', 'verifier', 'admin', 'supplier']

export function AdminUsersScreen() {
  const { show: showToast } = useToast()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<{ user: AdminUser; action: 'deactivate' | 'reactivate' } | null>(null)
  const [grantRoleValue, setGrantRoleValue] = useState('funder')
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const { data, isLoading } = useAdminUsersQuery({
    search: search.trim() || undefined,
    role: roleFilter === 'all' ? undefined : roleFilter,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    limit: 200,
  })
  const users = data?.users ?? []

  const deactivateMutation = useDeactivateUserMutation()
  const reactivateMutation = useReactivateUserMutation()
  const grantRoleMutation = useGrantRoleMutation()
  const revokeRoleMutation = useRevokeRoleMutation()
  const createMutation = useCreateAdminUserMutation()
  const updateMutation = useUpdateAdminUserMutation()
  const deleteMutation = useDeleteAdminUserMutation()
  const changePasswordMutation = useAdminChangePasswordMutation()

  function openEdit(u: AdminUser) {
    setSelected(u)
    setEditName(u.fullName)
    setEditEmail(u.email || '')
    setEditPhone(u.phoneNumber || '')
  }

  function handleCreate() {
    if (!createName.trim()) return
    createMutation.mutate(
      { fullName: createName.trim(), email: createEmail.trim() || undefined, phoneNumber: createPhone.trim() || undefined },
      {
        onSuccess: () => { showToast({ title: 'User created', tone: 'success' }); setCreateOpen(false); setCreateName(''); setCreateEmail(''); setCreatePhone('') },
        onError: (err) => showToast({ title: 'Create failed', description: apiErrorMessage(err), tone: 'error' }),
      }
    )
  }

  function handleSaveEdit() {
    if (!selected) return
    updateMutation.mutate(
      { userId: selected.id, input: { fullName: editName, email: editEmail || undefined, phoneNumber: editPhone || undefined } },
      {
        onSuccess: (updated) => { setSelected(updated); showToast({ title: 'User updated', tone: 'success' }) },
        onError: (err) => showToast({ title: 'Update failed', description: apiErrorMessage(err), tone: 'error' }),
      }
    )
  }

  function handleDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { showToast({ title: 'User permanently deleted', tone: 'success' }); setDeleteTarget(null); setDeleteConfirmText(''); setSelected(null) },
      onError: (err) => showToast({ title: 'Delete failed', description: apiErrorMessage(err), tone: 'error' }),
    })
  }

  function handleChangePassword() {
    if (!passwordTarget || newPassword.length < 6) return
    changePasswordMutation.mutate(
      { userId: passwordTarget.id, newPassword },
      {
        onSuccess: () => { showToast({ title: 'Password updated', tone: 'success' }); setPasswordTarget(null); setNewPassword('') },
        onError: (err) => showToast({ title: 'Failed to change password', description: apiErrorMessage(err), tone: 'error' }),
      }
    )
  }

  const applyStatusChange = (user: AdminUser, action: 'deactivate' | 'reactivate') => {
    const mutation = action === 'deactivate' ? deactivateMutation : reactivateMutation
    mutation.mutate(user.id, {
      onSuccess: () => showToast({ title: action === 'deactivate' ? 'User deactivated' : 'User reactivated', tone: 'success' }),
      onError: () => showToast({ title: 'Action failed', description: 'Please try again', tone: 'error' }),
    })
  }

  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: 'name', header: 'Name', sortValue: (u) => u.fullName,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: C.forest, fontFamily: FONT.serif }}>{u.fullName[0]?.toUpperCase() ?? '?'}</div>
          <span className="truncate font-medium">{u.fullName}</span>
        </div>
      ),
    },
    { key: 'contact', header: 'Contact', render: (u) => <span style={{ color: C.inkMuted }}>{u.email || u.phoneNumber || '—'}</span> },
    {
      key: 'roles', header: 'Roles',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.length === 0 ? <span style={{ color: C.inkSubtle }}>none</span> : u.roles.map((r) => (
            <span key={r} className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide" style={{ background: C.parchment, color: C.inkMuted, fontFamily: FONT.mono }}>{r.replace('_', ' ')}</span>
          ))}
        </div>
      ),
    },
    { key: 'kyc', header: 'KYC', render: (u) => <StatusBadge status={u.kycStatus} /> },
    { key: 'status', header: 'Status', sortValue: (u) => (u.isActive ? 1 : 0), render: (u) => <StatusBadge status={u.isActive ? 'active' : 'closed'} /> },
    { key: 'joined', header: 'Joined', sortValue: (u) => u.createdAt, render: (u) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{new Date(u.createdAt).toLocaleDateString()}</span> },
  ]

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">User management</div>
          <h1 style={{ fontFamily: FONT.serif, color: C.ink }} className="mt-1 text-2xl font-bold">{data ? `${data.total} users` : 'Users'}</h1>
        </div>
        <button
          onClick={() => downloadCsv('mboatrust-users', users, [
            { header: 'Name', value: (u) => u.fullName },
            { header: 'Email', value: (u) => u.email || '' },
            { header: 'Phone', value: (u) => u.phoneNumber || '' },
            { header: 'Roles', value: (u) => u.roles.join('; ') },
            { header: 'KYC status', value: (u) => u.kycStatus },
            { header: 'Active', value: (u) => (u.isActive ? 'yes' : 'no') },
            { header: 'Joined', value: (u) => u.createdAt },
          ])}
          className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors hover:bg-[var(--color-parchment)]"
          style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
        >
          <AppIcon name="folder" size={13} /> Export CSV
        </button>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
          style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
        >
          <AppIcon name="plus" size={13} /> New user
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          className="w-full rounded-xl border px-3.5 py-2 text-sm sm:max-w-xs"
          style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ChipGroup options={['all', 'active', 'inactive']} value={statusFilter} onChange={(v) => setStatusFilter(v as typeof statusFilter)} />
        </div>
      </div>
      <div className="mb-4 overflow-x-auto">
        <ChipGroup options={ROLE_OPTIONS} value={roleFilter} onChange={(v) => setRoleFilter(v as string)} />
      </div>

      {isLoading ? (
        <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={users}
          getRowId={(u) => u.id}
          onRowClick={openEdit}
          rowActions={(u) => (
            <button
              onClick={() => setConfirmTarget({ user: u, action: u.isActive ? 'deactivate' : 'reactivate' })}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold"
              style={u.isActive
                ? { background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }
                : { background: C.emerald, color: '#fff', fontFamily: FONT.sans }}
            >
              {u.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          )}
          bulkActions={[
            { label: 'Deactivate selected', danger: true, onClick: (rows) => rows.forEach((u) => u.isActive && applyStatusChange(u, 'deactivate')) },
            { label: 'Reactivate selected', onClick: (rows) => rows.forEach((u) => !u.isActive && applyStatusChange(u, 'reactivate')) },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => { if (confirmTarget) applyStatusChange(confirmTarget.user, confirmTarget.action); setConfirmTarget(null) }}
        title={confirmTarget?.action === 'deactivate' ? 'Deactivate this user?' : 'Reactivate this user?'}
        description={confirmTarget?.action === 'deactivate'
          ? `${confirmTarget?.user.fullName} will be signed out and unable to log back in until reactivated.`
          : `${confirmTarget?.user.fullName} will be able to sign in again.`}
        confirmLabel={confirmTarget?.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        danger={confirmTarget?.action === 'deactivate'}
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.fullName}
        subtitle="User detail"
        footer={selected && (
          <div className="flex w-full flex-col gap-2">
            <PillButton
              fullWidth
              variant={selected.isActive ? 'danger' : 'primary'}
              onClick={() => setConfirmTarget({ user: selected, action: selected.isActive ? 'deactivate' : 'reactivate' })}
            >
              {selected.isActive ? 'Deactivate user' : 'Reactivate user'}
            </PillButton>
            <button
              onClick={() => { setPasswordTarget(selected); setNewPassword('') }}
              className="w-full rounded-full py-2 text-xs font-semibold"
              style={{ background: C.parchment, color: C.ink, fontFamily: FONT.sans }}
            >
              Change password
            </button>
            <button
              onClick={() => { setDeleteTarget(selected); setDeleteConfirmText('') }}
              className="w-full rounded-full py-2 text-xs font-semibold"
              style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
            >
              Delete permanently
            </button>
          </div>
        )}
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: C.forest, fontFamily: FONT.serif }}>{selected.fullName[0]?.toUpperCase() ?? '?'}</div>
              <div className="min-w-0 flex-1">
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest">Editable profile</div>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
              <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone number" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
              <PillButton fullWidth onClick={handleSaveEdit} disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving…' : 'Save changes'}</PillButton>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1 text-[9px] uppercase tracking-widest">KYC status</div>
                <StatusBadge status={selected.kycStatus} />
              </div>
              <div className="rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1 text-[9px] uppercase tracking-widest">Account status</div>
                <StatusBadge status={selected.isActive ? 'active' : 'closed'} />
              </div>
            </div>

            <div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">Roles</div>
              <div className="flex flex-wrap gap-1.5">
                {selected.roles.length === 0 && <span style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">No roles assigned</span>}
                {selected.roles.map((r) => (
                  <span key={r} className="flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-[11px]" style={{ background: C.parchment, color: C.ink, fontFamily: FONT.sans }}>
                    {r.replace('_', ' ')}
                    <button
                      onClick={() => revokeRoleMutation.mutate({ userId: selected.id, roleType: r }, {
                        onSuccess: (updated) => { setSelected(updated); showToast({ title: 'Role revoked', tone: 'success' }) },
                        onError: () => showToast({ title: 'Failed to revoke role', tone: 'error' }),
                      })}
                      className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-black/10"
                      aria-label={`Revoke ${r}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <select
                  value={grantRoleValue}
                  onChange={(e) => setGrantRoleValue(e.target.value)}
                  className="flex-1 rounded-lg border px-2.5 py-1.5 text-xs"
                  style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}
                >
                  {GRANTABLE_ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
                <button
                  onClick={() => grantRoleMutation.mutate({ userId: selected.id, roleType: grantRoleValue }, {
                    onSuccess: (updated) => { setSelected(updated); showToast({ title: 'Role granted', tone: 'success' }) },
                    onError: () => showToast({ title: 'Failed to grant role', tone: 'error' }),
                  })}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
                >
                  Grant
                </button>
              </div>
            </div>

            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[11px]">
              Joined {new Date(selected.createdAt).toLocaleDateString()}
            </div>
          </div>
        )}
      </Drawer>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New user" size="sm"
        footer={<PillButton onClick={handleCreate} disabled={!createName.trim() || createMutation.isPending}>{createMutation.isPending ? 'Creating…' : 'Create user'}</PillButton>}
      >
        <div className="space-y-3">
          <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Full name" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
          <input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="Email (optional)" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
          <input value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} placeholder="Phone number (optional)" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">This account has no roles or sign-in method yet — the person links it themselves the first time they sign in with this email.</p>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteConfirmText('') }} title="Delete this user permanently?" size="sm"
        footer={(
          <PillButton variant="danger" onClick={handleDelete} disabled={deleteConfirmText !== 'DELETE' || deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Deleting…' : 'Delete permanently'}
          </PillButton>
        )}
      >
        <div className="space-y-3">
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
            {deleteTarget?.fullName} and everything they solely own (projects, listings, ratings, messages) will be permanently erased. This cannot be undone.
          </p>
          <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[11px] uppercase tracking-widest">Type DELETE to confirm</p>
          <input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full rounded-lg border px-2.5 py-1.5 text-sm"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, background: C.white, color: C.ink }}
          />
        </div>
      </Modal>

      <Modal open={!!passwordTarget} onClose={() => { setPasswordTarget(null); setNewPassword('') }} title="Change password" size="sm"
        footer={<PillButton onClick={handleChangePassword} disabled={newPassword.length < 6 || changePasswordMutation.isPending}>{changePasswordMutation.isPending ? 'Saving…' : 'Set password'}</PillButton>}
      >
        <div className="space-y-3">
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
            Sets a new sign-in password for {passwordTarget?.fullName} directly. Only works for an account with a real linked sign-in identity.
          </p>
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 6 characters)"
            className="w-full rounded-lg border px-2.5 py-1.5 text-sm"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, background: C.white, color: C.ink }}
          />
        </div>
      </Modal>
    </AdminShell>
  )
}

// ── Projects & Escrow management ────────────────────────────────────────────
const PROJECT_STATUS_OPTIONS = ['all', 'draft', 'open', 'funded', 'in_progress', 'completed', 'disputed', 'cancelled']

const ESCROW_TYPES = ['fund', 'release', 'refund', 'fee_deduction'] as const
const PAYMENT_PROVIDERS = ['mtn_momo', 'orange_money', 'flutterwave', 'stripe'] as const
const ESCROW_STATUSES = ['pending', 'completed', 'failed', 'reversed'] as const

function ProjectEscrowLedger({ projectId }: { projectId: string }) {
  const { show: showToast } = useToast()
  const { data } = useEscrowQuery({ projectId })
  const refundMutation = useAdminRefundEscrowMutation()
  const createMutation = useAdminCreateEscrowMutation()
  const updateMutation = useAdminUpdateEscrowMutation()
  const removeMutation = useAdminRemoveEscrowMutation()
  const [confirmRefundId, setConfirmRefundId] = useState<string | null>(null)
  const entries = data?.entries ?? []

  const [createOpen, setCreateOpen] = useState(false)
  const [newType, setNewType] = useState<CreateEscrowInput['type']>('fund')
  const [newGross, setNewGross] = useState('')
  const [newNet, setNewNet] = useState('')
  const [newProvider, setNewProvider] = useState<CreateEscrowInput['paymentProvider']>('mtn_momo')
  const [newReason, setNewReason] = useState('')

  const [editTarget, setEditTarget] = useState<EscrowEntry | null>(null)
  const [editStatus, setEditStatus] = useState<EscrowEntry['status']>('pending')
  const [editNet, setEditNet] = useState('')
  const [editReason, setEditReason] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<EscrowEntry | null>(null)
  const [deleteReason, setDeleteReason] = useState('')

  function handleCreate() {
    if (!newGross || !newNet || !newReason.trim()) return
    createMutation.mutate(
      { projectId, type: newType, grossAmount: Number(newGross), netAmount: Number(newNet), paymentProvider: newProvider, providerRole: newType === 'release' || newType === 'refund' ? 'disbursement' : 'collection', reason: newReason.trim() },
      {
        onSuccess: () => { showToast({ title: 'Transaction recorded', tone: 'success' }); setCreateOpen(false); setNewGross(''); setNewNet(''); setNewReason('') },
        onError: (err) => showToast({ title: 'Create failed', description: apiErrorMessage(err), tone: 'error' }),
      }
    )
  }

  function handleSaveEdit() {
    if (!editTarget || !editReason.trim()) return
    updateMutation.mutate(
      { escrowId: editTarget.id, input: { status: editStatus, netAmount: Number(editNet), reason: editReason.trim() } },
      {
        onSuccess: () => { showToast({ title: 'Transaction updated', tone: 'success' }); setEditTarget(null) },
        onError: (err) => showToast({ title: 'Update failed', description: apiErrorMessage(err), tone: 'error' }),
      }
    )
  }

  function handleDelete() {
    if (!deleteTarget || !deleteReason.trim()) return
    removeMutation.mutate(
      { escrowId: deleteTarget.id, reason: deleteReason.trim() },
      {
        onSuccess: () => { showToast({ title: 'Transaction deleted', tone: 'success' }); setDeleteTarget(null); setDeleteReason('') },
        onError: (err) => showToast({ title: 'Delete failed', description: apiErrorMessage(err), tone: 'error' }),
      }
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Escrow ledger</div>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-lg px-2.5 py-1 text-[10px] font-semibold"
          style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
        >+ New transaction</button>
      </div>
      {entries.length === 0 ? (
        <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">No escrow transactions on this project.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs" style={{ borderColor: C.parchmentDark }}>
              <div>
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="font-medium capitalize">{e.type} · {fmt(e.netAmount)}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{e.paymentProvider} · {new Date(e.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={e.status} />
                {e.type === 'fund' && e.status === 'completed' && (
                  <button
                    onClick={() => setConfirmRefundId(e.id)}
                    className="rounded-lg px-2 py-1 text-[10px] font-semibold"
                    style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                  >
                    Refund
                  </button>
                )}
                <button
                  onClick={() => { setEditTarget(e); setEditStatus(e.status); setEditNet(String(e.netAmount)); setEditReason('') }}
                  className="rounded-lg px-2 py-1 text-[10px] font-semibold"
                  style={{ background: C.parchment, color: C.ink, fontFamily: FONT.sans }}
                >Edit</button>
                <button
                  onClick={() => { setDeleteTarget(e); setDeleteReason('') }}
                  className="rounded-lg px-2 py-1 text-[10px] font-semibold"
                  style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                >Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!confirmRefundId}
        onCancel={() => setConfirmRefundId(null)}
        onConfirm={() => {
          if (!confirmRefundId) return
          refundMutation.mutate(confirmRefundId, {
            onSuccess: () => showToast({ title: 'Refund issued', tone: 'success' }),
            onError: (err) => showToast({ title: 'Refund failed', description: apiErrorMessage(err), tone: 'error' }),
          })
          setConfirmRefundId(null)
        }}
        title="Issue a refund?"
        description="This reverses the funding transaction and disburses it back to the funder. This cannot be undone."
        confirmLabel="Refund"
        danger
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New escrow transaction" size="sm"
        footer={<PillButton onClick={handleCreate} disabled={!newGross || !newNet || !newReason.trim() || createMutation.isPending}>{createMutation.isPending ? 'Recording…' : 'Record transaction'}</PillButton>}
      >
        <div className="space-y-3">
          <select value={newType} onChange={(e) => setNewType(e.target.value as CreateEscrowInput['type'])} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}>
            {ESCROW_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
          <select value={newProvider} onChange={(e) => setNewProvider(e.target.value as CreateEscrowInput['paymentProvider'])} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}>
            {PAYMENT_PROVIDERS.map((p) => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
          </select>
          <input type="number" min={0} value={newGross} onChange={(e) => setNewGross(e.target.value)} placeholder="Gross amount" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, background: C.white, color: C.ink }} />
          <input type="number" min={0} value={newNet} onChange={(e) => setNewNet(e.target.value)} placeholder="Net amount" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, background: C.white, color: C.ink }} />
          <textarea value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Reason (required — recorded in the audit log)" rows={2} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
        </div>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit transaction" size="sm"
        footer={<PillButton onClick={handleSaveEdit} disabled={!editReason.trim() || updateMutation.isPending}>{updateMutation.isPending ? 'Saving…' : 'Save changes'}</PillButton>}
      >
        <div className="space-y-3">
          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as EscrowEntry['status'])} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}>
            {ESCROW_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="number" min={0} value={editNet} onChange={(e) => setEditNet(e.target.value)} placeholder="Net amount" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, background: C.white, color: C.ink }} />
          <textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="Reason (required — recorded in the audit log)" rows={2} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete this transaction?" size="sm"
        footer={<PillButton variant="danger" onClick={handleDelete} disabled={!deleteReason.trim() || removeMutation.isPending}>{removeMutation.isPending ? 'Deleting…' : 'Delete permanently'}</PillButton>}
      >
        <div className="space-y-3">
          <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">This permanently removes the ledger row. This cannot be undone.</p>
          <textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Reason (required — recorded in the audit log)" rows={2} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
        </div>
      </Modal>
    </div>
  )
}

function AdminProjectEditForm({ project }: { project: { id: string; title: string; description: string; location: string } }) {
  const { show: showToast } = useToast()
  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description)
  const [locationName, setLocationName] = useState(project.location)
  const updateMutation = useAdminUpdateProjectMutation()

  function handleSave() {
    updateMutation.mutate(
      { projectId: project.id, input: { title, description, locationName } },
      {
        onSuccess: () => showToast({ title: 'Project updated', tone: 'success' }),
        onError: (err) => showToast({ title: 'Update failed', description: apiErrorMessage(err), tone: 'error' }),
      }
    )
  }

  return (
    <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
      <input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Location" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
      <PillButton fullWidth onClick={handleSave} disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving…' : 'Save changes'}</PillButton>
    </div>
  )
}

function AdminProjectDetail({ projectId }: { projectId: string }) {
  const { data: project } = useProjectQuery(projectId)
  if (!project) return <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-sm">Loading…</p>
  return (
    <div className="space-y-5">
      <div>
        <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold">{project.title}</div>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-1 text-[10px] uppercase tracking-widest">{project.category} · {project.location}</div>
        <div className="mt-2"><StatusBadge status={project.status} /></div>
      </div>

      {(project.status === 'draft' || project.status === 'open') && (
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">Edit project</div>
          <AdminProjectEditForm project={{ id: project.id, title: project.title, description: project.description, location: project.location }} />
        </div>
      )}

      <div>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">Milestones ({project.milestones.length})</div>
        <div className="space-y-2">
          {project.milestones.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs" style={{ borderColor: C.parchmentDark }}>
              <span style={{ fontFamily: FONT.sans, color: C.ink }}>{m.title} · {fmt(m.amount)}</span>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>
      </div>

      <ProjectEscrowLedger projectId={projectId} />
    </div>
  )
}

export function AdminProjectsScreen() {
  const { show: showToast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminProjectRow | null>(null)

  const { data, isLoading } = useAdminProjectsQuery({
    search: search.trim() || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  })
  const projects = data?.projects ?? []
  const removeMutation = useAdminRemoveProjectMutation()

  function handleDelete() {
    if (!deleteTarget) return
    removeMutation.mutate(deleteTarget.id, {
      onSuccess: () => { showToast({ title: 'Project deleted', tone: 'success' }); setDeleteTarget(null) },
      onError: (err) => { showToast({ title: 'Delete failed', description: apiErrorMessage(err), tone: 'error' }); setDeleteTarget(null) },
    })
  }

  const columns: DataTableColumn<AdminProjectRow>[] = [
    { key: 'title', header: 'Title', sortValue: (p) => p.title, render: (p) => <span className="font-medium">{p.title}</span> },
    { key: 'owner', header: 'Owner', sortValue: (p) => p.ownerName, render: (p) => <span style={{ color: C.inkMuted }}>{p.ownerName}</span> },
    { key: 'type', header: 'Type', render: (p) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle, textTransform: 'capitalize' }}>{p.projectType.replace('_', ' ')}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'amount', header: 'Total', align: 'right', sortValue: (p) => p.totalAmount, render: (p) => <span style={{ fontFamily: FONT.mono }}>{fmt(p.totalAmount)}</span> },
    { key: 'milestones', header: 'Milestones', align: 'center', sortValue: (p) => p.milestonesCount, render: (p) => <span>{p.milestonesCount}</span> },
    { key: 'created', header: 'Created', sortValue: (p) => p.createdAt, render: (p) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{new Date(p.createdAt).toLocaleDateString()}</span> },
  ]

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Projects & escrow</div>
          <h1 style={{ fontFamily: FONT.serif, color: C.ink }} className="mt-1 text-2xl font-bold">{data ? `${data.total} projects` : 'Projects'}</h1>
        </div>
        <button
          onClick={() => downloadCsv('mboatrust-projects', projects, [
            { header: 'Title', value: (p) => p.title },
            { header: 'Owner', value: (p) => p.ownerName },
            { header: 'Type', value: (p) => p.projectType },
            { header: 'Status', value: (p) => p.status },
            { header: 'Total amount', value: (p) => p.totalAmount },
            { header: 'Milestones', value: (p) => p.milestonesCount },
            { header: 'Created', value: (p) => p.createdAt },
          ])}
          className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors hover:bg-[var(--color-parchment)]"
          style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
        >
          <AppIcon name="folder" size={13} /> Export CSV
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, owner…"
          className="w-full rounded-xl border px-3.5 py-2 text-sm sm:max-w-xs"
          style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}
        />
      </div>
      <div className="mb-4 overflow-x-auto">
        <ChipGroup options={PROJECT_STATUS_OPTIONS} value={statusFilter} onChange={(v) => setStatusFilter(v as string)} />
      </div>

      {isLoading ? (
        <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={projects}
          getRowId={(p) => p.id}
          onRowClick={(p) => setSelectedId(p.id)}
          rowActions={(p) => p.status === 'draft' ? (
            <button
              onClick={() => setDeleteTarget(p)}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold"
              style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
            >Delete</button>
          ) : null}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this project?"
        description={`${deleteTarget?.title} will be permanently removed. Only draft projects can be deleted.`}
        confirmLabel="Delete"
        danger
      />

      <Drawer open={!!selectedId} onClose={() => setSelectedId(null)} title="Project detail" subtitle="Projects & escrow">
        {selectedId && <AdminProjectDetail projectId={selectedId} />}
      </Drawer>
    </AdminShell>
  )
}

// ── Verifications (verifier applications + contractor certifications) ──────
export function AdminVerificationsScreen() {
  const { show: showToast } = useToast()
  const [tab, setTab] = useState<'verifiers' | 'suppliers' | 'certifications' | 'tasks' | 'video' | 'ratings' | 'conversations'>('verifiers')

  const { data: applications = [], isLoading: appsLoading } = useVerifierApplicationsQuery('pending')
  // Supplier registrations — real backend now (see api/supplierProfiles.ts),
  // same review-queue shape as verifier applications above. Fetches every
  // status (not just 'pending') since this tab also shows rejected ones
  // awaiting resubmission.
  const { data: suppliers = [], isLoading: suppliersLoading } = useSupplierApplicationsQuery()
  const decideSupplierMutation = useDecideSupplierProfileMutation()
  const pendingSuppliers = suppliers.filter((s) => s.verificationStatus === 'pending')
  const decideVerifier = useDecideVerifierApplicationMutation()
  const updateVerifierProfile = useAdminUpdateVerifierProfileMutation()
  const [verifierEditTarget, setVerifierEditTarget] = useState<VerifierProfileRecord | null>(null)
  const [verifierEditSpecialties, setVerifierEditSpecialties] = useState('')
  const [verifierEditRegions, setVerifierEditRegions] = useState('')
  const [verifierEditBio, setVerifierEditBio] = useState('')

  const { data: allCerts = [], isLoading: certsLoading } = useAllCertificationsQuery()
  const pendingCerts = allCerts.filter((c) => c.status === 'pending')
  const decideCert = useDecideCertificationMutation()
  const updateCert = useAdminUpdateCertificationMutation()
  const removeCert = useAdminRemoveCertificationMutation()
  const [certEditTarget, setCertEditTarget] = useState<Certification | null>(null)
  const [certEditTitle, setCertEditTitle] = useState('')
  const [certEditIssuer, setCertEditIssuer] = useState('')
  const [certDeleteTarget, setCertDeleteTarget] = useState<Certification | null>(null)

  const { data: tasks = [], isLoading: tasksLoading } = useVerificationTasksQuery()
  const { data: videoSessions = [], isLoading: videoLoading } = useAdminVideoSessionsQuery()
  const { data: ratingsData, isLoading: ratingsLoading } = useAdminRatingsQuery()
  const deleteRating = useDeleteRatingMutation()
  const createRating = useAdminCreateRatingMutation()
  const updateRating = useAdminUpdateRatingMutation()
  const [ratingToDelete, setRatingToDelete] = useState<AdminRatingRow | null>(null)
  const [ratingCreateOpen, setRatingCreateOpen] = useState(false)
  const [ratingFromUserId, setRatingFromUserId] = useState('')
  const [ratingToUserId, setRatingToUserId] = useState('')
  const [ratingProjectId, setRatingProjectId] = useState('')
  const [ratingRoleContext, setRatingRoleContext] = useState<'contractor' | 'verifier' | 'land_seller' | 'supplier'>('contractor')
  const [ratingNewScore, setRatingNewScore] = useState(5)
  const [ratingNewComment, setRatingNewComment] = useState('')
  const [ratingEditTarget, setRatingEditTarget] = useState<AdminRatingRow | null>(null)
  const [ratingEditScore, setRatingEditScore] = useState(5)
  const [ratingEditComment, setRatingEditComment] = useState('')
  const { data: conversationsData, isLoading: conversationsLoading } = useAdminConversationsQuery()

  const cancelVideoSession = useCancelVideoSessionMutation()
  const scheduleVideoSession = useScheduleVideoSessionMutation()
  const [videoCancelTarget, setVideoCancelTarget] = useState<VideoSession | null>(null)
  const [videoScheduleTarget, setVideoScheduleTarget] = useState<VideoSession | null>(null)
  const [videoScheduledFor, setVideoScheduledFor] = useState('')
  const [videoMeetingUrl, setVideoMeetingUrl] = useState('')

  const taskColumns: DataTableColumn<BackendVerificationTask>[] = [
    { key: 'target', header: 'Target', render: (t) => <span className="font-medium">{t.target?.title ?? 'Unknown'}{t.target?.milestoneTitle ? ` — ${t.target.milestoneTitle}` : ''}</span> },
    { key: 'type', header: 'Type', render: (t) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle, textTransform: 'capitalize' }}>{t.targetType.replace('_', ' ')}</span> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'match', header: 'Confirmed match', render: (t) => t.confirmedMatch == null ? <span style={{ color: C.inkSubtle }}>—</span> : <StatusBadge status={t.confirmedMatch ? 'verified' : 'rejected'} /> },
    { key: 'created', header: 'Assigned', sortValue: (t) => t.createdAt, render: (t) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{new Date(t.createdAt).toLocaleDateString()}</span> },
  ]

  const videoColumns: DataTableColumn<VideoSession>[] = [
    { key: 'project', header: 'Project', render: (v) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{v.projectId}</span> },
    { key: 'status', header: 'Status', render: (v) => <StatusBadge status={v.status} /> },
    { key: 'scheduled', header: 'Scheduled for', render: (v) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{v.scheduledFor ? new Date(v.scheduledFor).toLocaleString() : '—'}</span> },
    { key: 'notes', header: 'Notes', render: (v) => <span style={{ color: C.inkMuted }}>{v.notes || '—'}</span> },
  ]

  const ratingColumns: DataTableColumn<AdminRatingRow>[] = [
    { key: 'from', header: 'From', sortValue: (r) => r.fromName, render: (r) => <span className="font-medium">{r.fromName}</span> },
    { key: 'to', header: 'To', sortValue: (r) => r.toName, render: (r) => <span>{r.toName}</span> },
    { key: 'score', header: 'Score', align: 'center', sortValue: (r) => r.score, render: (r) => <span>{'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}</span> },
    { key: 'comment', header: 'Comment', render: (r) => <span style={{ color: C.inkMuted }}>{r.comment || '—'}</span> },
    { key: 'context', header: 'Context', render: (r) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle, textTransform: 'uppercase' }}>{r.roleContext}</span> },
  ]

  const conversationColumns: DataTableColumn<AdminConversationRow>[] = [
    { key: 'participants', header: 'Participants', render: (c) => <span className="font-medium">{c.participantNames.join(', ')}</span> },
    { key: 'context', header: 'Context', render: (c) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle, textTransform: 'capitalize' }}>{c.contextType.replace('_', ' ')}</span> },
    { key: 'messages', header: 'Messages', align: 'center', sortValue: (c) => c.messageCount, render: (c) => <span>{c.messageCount}</span> },
    { key: 'active', header: 'Last active', sortValue: (c) => c.updatedAt, render: (c) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{new Date(c.updatedAt).toLocaleDateString()}</span> },
  ]

  const verifierColumns: DataTableColumn<VerifierProfileRecord>[] = [
    { key: 'name', header: 'Applicant', sortValue: (v) => v.userName ?? '', render: (v) => <span className="font-medium">{v.userName ?? '—'}</span> },
    { key: 'specialties', header: 'Specialties', render: (v) => <span style={{ color: C.inkMuted }}>{v.specialties.join(', ') || '—'}</span> },
    { key: 'regions', header: 'Regions', render: (v) => <span style={{ color: C.inkMuted }}>{v.regions.join(', ') || '—'}</span> },
    { key: 'status', header: 'Status', render: (v) => <StatusBadge status={v.applicationStatus} /> },
  ]

  const supplierColumns: DataTableColumn<SupplierProfile>[] = [
    { key: 'business', header: 'Business', sortValue: (s) => s.businessName, render: (s) => <span className="font-medium">{s.businessName}</span> },
    { key: 'owner', header: 'Owner', render: (s) => <span style={{ color: C.inkMuted }}>{s.ownerName}</span> },
    { key: 'categories', header: 'Categories', render: (s) => <span style={{ color: C.inkMuted }}>{s.registeredCategories.join(', ') || '—'}</span> },
    { key: 'region', header: 'Region', render: (s) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{s.address}, {s.region}</span> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.verificationStatus} /> },
  ]

  const certColumns: DataTableColumn<Certification>[] = [
    { key: 'contractor', header: 'Contractor', sortValue: (c) => c.contractorName ?? '', render: (c) => <span className="font-medium">{c.contractorName ?? '—'}</span> },
    { key: 'name', header: 'Certification', sortValue: (c) => c.name, render: (c) => <span>{c.name}</span> },
    { key: 'issuer', header: 'Issuer', render: (c) => <span style={{ color: C.inkMuted }}>{c.issuer}</span> },
    { key: 'uploaded', header: 'Uploaded', render: (c) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{c.dateUploaded}</span> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  ]

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Trust & safety</div>
          <h1 style={{ fontFamily: FONT.serif, color: C.ink }} className="mt-1 text-2xl font-bold">Verifications</h1>
        </div>
        {tab === 'ratings' && (
          <button
            onClick={() => { setRatingCreateOpen(true); setRatingFromUserId(''); setRatingToUserId(''); setRatingProjectId(''); setRatingNewScore(5); setRatingNewComment('') }}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
            style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
          >
            <AppIcon name="plus" size={13} /> New rating
          </button>
        )}
      </div>

      <Tabs
        tabs={[
          { id: 'verifiers', label: `Verifier applications (${applications.length})` },
          { id: 'suppliers', label: `Suppliers (${pendingSuppliers.length})` },
          { id: 'certifications', label: `Certifications (${pendingCerts.length})` },
          { id: 'tasks', label: `Verification tasks (${tasks.length})` },
          { id: 'video', label: `Video sessions (${videoSessions.length})` },
          { id: 'ratings', label: `Ratings (${ratingsData?.total ?? 0})` },
          { id: 'conversations', label: `Conversations (${conversationsData?.total ?? 0})` },
        ]}
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        variant="pill"
      />

      <div className="mt-5">
        {tab === 'verifiers' ? (
          appsLoading ? (
            <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
          ) : (
            <DataTable
              columns={verifierColumns}
              rows={applications}
              getRowId={(v) => v.id}
              emptyState={<div className="py-10 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkSubtle }}>No pending verifier applications.</div>}
              rowActions={(v) => (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => decideVerifier.mutate({ id: v.id, decision: 'approve' }, {
                      onSuccess: () => showToast({ title: 'Verifier approved', tone: 'success' }),
                      onError: (err) => showToast({ title: 'Failed', description: apiErrorMessage(err), tone: 'error' }),
                    })}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: C.emerald, color: '#fff', fontFamily: FONT.sans }}
                  >Approve</button>
                  <button
                    onClick={() => decideVerifier.mutate({ id: v.id, decision: 'reject' }, {
                      onSuccess: () => showToast({ title: 'Application rejected', tone: 'success' }),
                      onError: (err) => showToast({ title: 'Failed', description: apiErrorMessage(err), tone: 'error' }),
                    })}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                  >Reject</button>
                  <button
                    onClick={() => { setVerifierEditTarget(v); setVerifierEditSpecialties(v.specialties.join(', ')); setVerifierEditRegions(v.regions.join(', ')); setVerifierEditBio(v.bio) }}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: C.parchment, color: C.ink, fontFamily: FONT.sans }}
                  >Edit</button>
                </div>
              )}
            />
          )
        ) : tab === 'suppliers' ? (
          suppliersLoading ? (
            <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
          ) : (
          <DataTable
            columns={supplierColumns}
            rows={suppliers.filter((s) => s.verificationStatus === 'pending' || s.verificationStatus === 'rejected')}
            getRowId={(s) => s.id}
            emptyState={<div className="py-10 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkSubtle }}>No pending supplier registrations.</div>}
            rowActions={(s) => (
              s.verificationStatus === 'pending' ? (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => decideSupplierMutation.mutate({ id: s.id, decision: 'approve' }, {
                      onSuccess: () => showToast({ title: 'Supplier verified', tone: 'success' }),
                      onError: (err) => showToast({ title: 'Failed', description: apiErrorMessage(err), tone: 'error' }),
                    })}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: C.emerald, color: '#fff', fontFamily: FONT.sans }}
                  >Approve</button>
                  <button
                    onClick={() => decideSupplierMutation.mutate({ id: s.id, decision: 'reject' }, {
                      onSuccess: () => showToast({ title: 'Registration rejected', tone: 'success' }),
                      onError: (err) => showToast({ title: 'Failed', description: apiErrorMessage(err), tone: 'error' }),
                    })}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                  >Reject</button>
                </div>
              ) : (
                <span style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs italic">Rejected — awaiting resubmission</span>
              )
            )}
          />
          )
        ) : tab === 'certifications' ? (
          certsLoading ? (
            <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
          ) : (
            <DataTable
              columns={certColumns}
              rows={allCerts}
              getRowId={(c) => c.id}
              emptyState={<div className="py-10 text-center text-sm" style={{ fontFamily: FONT.sans, color: C.inkSubtle }}>No certifications yet.</div>}
              rowActions={(c) => (
                <div className="flex gap-1.5">
                  {c.status === 'pending' && (
                    <>
                      <button
                        onClick={() => decideCert.mutate({ certId: c.id, status: 'verified' }, {
                          onSuccess: () => showToast({ title: 'Certification verified', tone: 'success' }),
                          onError: (err) => showToast({ title: 'Failed', description: apiErrorMessage(err), tone: 'error' }),
                        })}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                        style={{ background: C.emerald, color: '#fff', fontFamily: FONT.sans }}
                      >Verify</button>
                      <button
                        onClick={() => decideCert.mutate({ certId: c.id, status: 'rejected' }, {
                          onSuccess: () => showToast({ title: 'Certification rejected', tone: 'success' }),
                          onError: (err) => showToast({ title: 'Failed', description: apiErrorMessage(err), tone: 'error' }),
                        })}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                        style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                      >Reject</button>
                    </>
                  )}
                  <button
                    onClick={() => { setCertEditTarget(c); setCertEditTitle(c.name); setCertEditIssuer(c.issuer) }}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: C.parchment, color: C.ink, fontFamily: FONT.sans }}
                  >Edit</button>
                  <button
                    onClick={() => setCertDeleteTarget(c)}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                  >Delete</button>
                </div>
              )}
            />
          )
        ) : tab === 'tasks' ? (
          tasksLoading ? (
            <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
          ) : (
            <DataTable columns={taskColumns} rows={tasks} getRowId={(t) => t._id} />
          )
        ) : tab === 'video' ? (
          videoLoading ? (
            <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
          ) : (
            <DataTable
              columns={videoColumns}
              rows={videoSessions}
              getRowId={(v) => v.id}
              rowActions={(v) => v.status === 'completed' || v.status === 'cancelled' ? null : (
                <div className="flex gap-1.5">
                  {v.status === 'requested' && (
                    <button
                      onClick={() => { setVideoScheduleTarget(v); setVideoScheduledFor(''); setVideoMeetingUrl('') }}
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                      style={{ background: C.parchment, color: C.ink, fontFamily: FONT.sans }}
                    >Schedule</button>
                  )}
                  <button
                    onClick={() => setVideoCancelTarget(v)}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                  >Cancel</button>
                </div>
              )}
            />
          )
        ) : tab === 'ratings' ? (
          ratingsLoading ? (
            <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
          ) : (
            <DataTable
              columns={ratingColumns}
              rows={ratingsData?.ratings ?? []}
              getRowId={(r) => r.id}
              rowActions={(r) => (
                <div className="flex gap-1.5">
                <button
                  onClick={() => { setRatingEditTarget(r); setRatingEditScore(r.score); setRatingEditComment(r.comment) }}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                  style={{ background: C.parchment, color: C.ink, fontFamily: FONT.sans }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setRatingToDelete(r)}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                  style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                >
                  Remove
                </button>
                </div>
              )}
            />
          )
        ) : (
          conversationsLoading ? (
            <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
          ) : (
            <DataTable columns={conversationColumns} rows={conversationsData?.conversations ?? []} getRowId={(c) => c.id} />
          )
        )}
      </div>

      <ConfirmDialog
        open={!!ratingToDelete}
        onCancel={() => setRatingToDelete(null)}
        onConfirm={() => {
          if (!ratingToDelete) return
          deleteRating.mutate(ratingToDelete.id, {
            onSuccess: () => showToast({ title: 'Rating removed', tone: 'success' }),
            onError: (err) => showToast({ title: 'Failed to remove rating', description: apiErrorMessage(err), tone: 'error' }),
          })
          setRatingToDelete(null)
        }}
        title="Remove this rating?"
        description={ratingToDelete ? `Removes ${ratingToDelete.fromName}'s review of ${ratingToDelete.toName}. This cannot be undone.` : undefined}
        confirmLabel="Remove"
        danger
      />

      <Modal open={ratingCreateOpen} onClose={() => setRatingCreateOpen(false)} title="New rating" size="sm"
        footer={(
          <PillButton
            onClick={() => {
              if (!ratingFromUserId || !ratingToUserId || !ratingProjectId) return
              createRating.mutate(
                { fromUserId: ratingFromUserId, toUserId: ratingToUserId, projectId: ratingProjectId, score: ratingNewScore, comment: ratingNewComment, roleContext: ratingRoleContext },
                {
                  onSuccess: () => { showToast({ title: 'Rating created', tone: 'success' }); setRatingCreateOpen(false) },
                  onError: (err) => showToast({ title: 'Create failed', description: apiErrorMessage(err), tone: 'error' }),
                }
              )
            }}
            disabled={!ratingFromUserId || !ratingToUserId || !ratingProjectId || createRating.isPending}
          >
            {createRating.isPending ? 'Creating…' : 'Create rating'}
          </PillButton>
        )}
      >
        <div className="space-y-3">
          <input value={ratingFromUserId} onChange={(e) => setRatingFromUserId(e.target.value)} placeholder="From user ID" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, background: C.white, color: C.ink }} />
          <input value={ratingToUserId} onChange={(e) => setRatingToUserId(e.target.value)} placeholder="To user ID" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, background: C.white, color: C.ink }} />
          <input value={ratingProjectId} onChange={(e) => setRatingProjectId(e.target.value)} placeholder="Project ID" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, background: C.white, color: C.ink }} />
          <select value={ratingRoleContext} onChange={(e) => setRatingRoleContext(e.target.value as typeof ratingRoleContext)} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}>
            {(['contractor', 'verifier', 'land_seller', 'supplier'] as const).map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
          <select value={ratingNewScore} onChange={(e) => setRatingNewScore(Number(e.target.value))} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}
          </select>
          <textarea value={ratingNewComment} onChange={(e) => setRatingNewComment(e.target.value)} placeholder="Comment" rows={3} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
        </div>
      </Modal>

      <Modal open={!!ratingEditTarget} onClose={() => setRatingEditTarget(null)} title="Edit rating" size="sm"
        footer={(
          <PillButton
            onClick={() => {
              if (!ratingEditTarget) return
              updateRating.mutate({ ratingId: ratingEditTarget.id, score: ratingEditScore, comment: ratingEditComment }, {
                onSuccess: () => { showToast({ title: 'Rating updated', tone: 'success' }); setRatingEditTarget(null) },
                onError: (err) => showToast({ title: 'Update failed', description: apiErrorMessage(err), tone: 'error' }),
              })
            }}
            disabled={updateRating.isPending}
          >
            {updateRating.isPending ? 'Saving…' : 'Save changes'}
          </PillButton>
        )}
      >
        <div className="space-y-3">
          <select value={ratingEditScore} onChange={(e) => setRatingEditScore(Number(e.target.value))} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}
          </select>
          <textarea value={ratingEditComment} onChange={(e) => setRatingEditComment(e.target.value)} placeholder="Comment" rows={3} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
        </div>
      </Modal>

      <Modal open={!!certEditTarget} onClose={() => setCertEditTarget(null)} title="Edit certification" size="sm"
        footer={(
          <PillButton
            onClick={() => {
              if (!certEditTarget) return
              updateCert.mutate({ certId: certEditTarget.id, title: certEditTitle, issuer: certEditIssuer }, {
                onSuccess: () => { showToast({ title: 'Certification updated', tone: 'success' }); setCertEditTarget(null) },
                onError: (err) => showToast({ title: 'Update failed', description: apiErrorMessage(err), tone: 'error' }),
              })
            }}
            disabled={updateCert.isPending}
          >
            {updateCert.isPending ? 'Saving…' : 'Save changes'}
          </PillButton>
        )}
      >
        <div className="space-y-3">
          <input value={certEditTitle} onChange={(e) => setCertEditTitle(e.target.value)} placeholder="Certification title" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
          <input value={certEditIssuer} onChange={(e) => setCertEditIssuer(e.target.value)} placeholder="Issuer" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!certDeleteTarget}
        onCancel={() => setCertDeleteTarget(null)}
        onConfirm={() => {
          if (!certDeleteTarget) return
          removeCert.mutate(certDeleteTarget.id, {
            onSuccess: () => showToast({ title: 'Certification deleted', tone: 'success' }),
            onError: (err) => showToast({ title: 'Delete failed', description: apiErrorMessage(err), tone: 'error' }),
          })
          setCertDeleteTarget(null)
        }}
        title="Delete this certification?"
        description={certDeleteTarget ? `${certDeleteTarget.name} will be permanently removed.` : undefined}
        confirmLabel="Delete"
        danger
      />

      <Modal open={!!verifierEditTarget} onClose={() => setVerifierEditTarget(null)} title="Edit verifier profile" size="sm"
        footer={(
          <PillButton
            onClick={() => {
              if (!verifierEditTarget) return
              updateVerifierProfile.mutate(
                {
                  userId: verifierEditTarget.userId,
                  specialties: verifierEditSpecialties.split(',').map((s) => s.trim()).filter(Boolean),
                  regions: verifierEditRegions.split(',').map((s) => s.trim()).filter(Boolean),
                  bio: verifierEditBio,
                },
                {
                  onSuccess: () => { showToast({ title: 'Verifier profile updated', tone: 'success' }); setVerifierEditTarget(null) },
                  onError: (err) => showToast({ title: 'Update failed', description: apiErrorMessage(err), tone: 'error' }),
                }
              )
            }}
            disabled={updateVerifierProfile.isPending}
          >
            {updateVerifierProfile.isPending ? 'Saving…' : 'Save changes'}
          </PillButton>
        )}
      >
        <div className="space-y-3">
          <input value={verifierEditSpecialties} onChange={(e) => setVerifierEditSpecialties(e.target.value)} placeholder="Specialties (comma-separated)" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
          <input value={verifierEditRegions} onChange={(e) => setVerifierEditRegions(e.target.value)} placeholder="Regions (comma-separated)" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
          <textarea value={verifierEditBio} onChange={(e) => setVerifierEditBio(e.target.value)} placeholder="Bio" rows={3} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
        </div>
      </Modal>

      <Modal open={!!videoScheduleTarget} onClose={() => setVideoScheduleTarget(null)} title="Schedule video verification" size="sm"
        footer={(
          <PillButton
            onClick={() => {
              if (!videoScheduleTarget || !videoScheduledFor || !videoMeetingUrl) return
              scheduleVideoSession.mutate({ sessionId: videoScheduleTarget.id, scheduledFor: videoScheduledFor, meetingUrl: videoMeetingUrl }, {
                onSuccess: () => { showToast({ title: 'Session scheduled', tone: 'success' }); setVideoScheduleTarget(null) },
                onError: (err) => showToast({ title: 'Schedule failed', description: apiErrorMessage(err), tone: 'error' }),
              })
            }}
            disabled={scheduleVideoSession.isPending || !videoScheduledFor || !videoMeetingUrl}
          >
            {scheduleVideoSession.isPending ? 'Saving…' : 'Schedule'}
          </PillButton>
        )}
      >
        <div className="space-y-3">
          <input type="datetime-local" value={videoScheduledFor} onChange={(e) => setVideoScheduledFor(e.target.value)} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
          <input value={videoMeetingUrl} onChange={(e) => setVideoMeetingUrl(e.target.value)} placeholder="Meeting URL" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!videoCancelTarget}
        onCancel={() => setVideoCancelTarget(null)}
        onConfirm={() => {
          if (!videoCancelTarget) return
          cancelVideoSession.mutate(videoCancelTarget.id, {
            onSuccess: () => showToast({ title: 'Session cancelled', tone: 'success' }),
            onError: (err) => showToast({ title: 'Cancel failed', description: apiErrorMessage(err), tone: 'error' }),
          })
          setVideoCancelTarget(null)
        }}
        title="Cancel this video verification session?"
        confirmLabel="Cancel session"
        danger
      />
    </AdminShell>
  )
}

// ── Land management ──────────────────────────────────────────────────────
const LAND_STATUS_OPTIONS = ['all', 'unverified', 'pending', 'verified', 'flagged']

function AdminLandEditForm({ listing, onSaved }: { listing: AdminLandListingRow; onSaved: () => void }) {
  const { show: showToast } = useToast()
  const [title, setTitle] = useState(listing.title)
  const [region, setRegion] = useState(listing.region)
  const [city, setCity] = useState(listing.city)
  const [price, setPrice] = useState(String(listing.price))
  const updateMutation = useAdminUpdateListingMutation()

  function handleSave() {
    updateMutation.mutate(
      { listingId: listing.id, input: { title, region, city, price: Number(price) } },
      {
        onSuccess: () => { showToast({ title: 'Listing updated', tone: 'success' }); onSaved() },
        onError: (err) => showToast({ title: 'Update failed', description: apiErrorMessage(err), tone: 'error' }),
      }
    )
  }

  return (
    <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
      <div className="grid grid-cols-2 gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="col-span-2 rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
        <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Region" className="rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
        <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" className="col-span-2 rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, background: C.white, color: C.ink }} />
      </div>
      <PillButton fullWidth onClick={handleSave} disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving…' : 'Save changes'}</PillButton>
    </div>
  )
}

function AdminLandDetail({ listingId }: { listingId: string }) {
  const { data: offers = [], isLoading: offersLoading } = useLandOffersForListingQuery(listingId)
  const { data: visits = [], isLoading: visitsLoading } = useVisitRequestsForListingQuery(listingId)
  return (
    <div className="space-y-5">
      <div>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">Offers ({offers.length})</div>
        {offersLoading ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">Loading…</p>
        ) : offers.length === 0 ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">No offers yet.</p>
        ) : (
          <div className="space-y-2">
            {offers.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs" style={{ borderColor: C.parchmentDark }}>
                <div>
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="font-medium">{o.buyerName} · {fmt(o.offerAmount)}</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{new Date(o.createdAt).toLocaleDateString()}</div>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">Visit requests ({visits.length})</div>
        {visitsLoading ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">Loading…</p>
        ) : visits.length === 0 ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">No visit requests yet.</p>
        ) : (
          <div className="space-y-2">
            {visits.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs" style={{ borderColor: C.parchmentDark }}>
                <div>
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="font-medium">{v.requestedByName}</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{v.confirmedDate ? new Date(v.confirmedDate).toLocaleDateString() : 'Not confirmed'}</div>
                </div>
                <StatusBadge status={v.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function AdminLandScreen() {
  const { show: showToast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<AdminLandListingRow | null>(null)
  const [verifyTarget, setVerifyTarget] = useState<{ listing: AdminLandListingRow; status: 'verified' | 'flagged' } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminLandListingRow | null>(null)

  const { data, isLoading } = useAdminLandListingsQuery({
    search: search.trim() || undefined,
    verificationStatus: statusFilter === 'all' ? undefined : statusFilter,
  })
  const listings = data?.listings ?? []
  const verifyMutation = useUpdateVerificationStatusMutation()
  const removeMutation = useAdminRemoveListingMutation()

  function handleDelete() {
    if (!deleteTarget) return
    removeMutation.mutate(deleteTarget.id, {
      onSuccess: () => { showToast({ title: 'Listing deleted', tone: 'success' }); setSelected(null); setDeleteTarget(null) },
      onError: (err) => { showToast({ title: 'Delete failed', description: apiErrorMessage(err), tone: 'error' }); setDeleteTarget(null) },
    })
  }

  const applyVerification = (listing: AdminLandListingRow, status: 'verified' | 'flagged') => {
    verifyMutation.mutate({ listingId: listing.id, verificationStatus: status, disputeReason: status === 'flagged' ? 'Flagged by admin review' : undefined }, {
      onSuccess: () => showToast({ title: status === 'verified' ? 'Listing verified' : 'Listing flagged', tone: 'success' }),
      onError: (err) => showToast({ title: 'Action failed', description: apiErrorMessage(err), tone: 'error' }),
    })
  }

  const columns: DataTableColumn<AdminLandListingRow>[] = [
    { key: 'title', header: 'Title', sortValue: (l) => l.title, render: (l) => <span className="font-medium">{l.title}</span> },
    { key: 'seller', header: 'Seller', sortValue: (l) => l.sellerName, render: (l) => <span style={{ color: C.inkMuted }}>{l.sellerName}</span> },
    { key: 'location', header: 'Location', render: (l) => <span style={{ color: C.inkMuted }}>{l.city}, {l.region}</span> },
    { key: 'price', header: 'Price', align: 'right', sortValue: (l) => l.price, render: (l) => <span style={{ fontFamily: FONT.mono }}>{fmt(l.price)}</span> },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.verificationStatus} /> },
    { key: 'dispute', header: 'Flagged', render: (l) => l.disputeFlag ? <StatusBadge status="disputed" /> : <span style={{ color: C.inkSubtle }}>—</span> },
    { key: 'created', header: 'Listed', sortValue: (l) => l.createdAt, render: (l) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{new Date(l.createdAt).toLocaleDateString()}</span> },
  ]

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Land</div>
          <h1 style={{ fontFamily: FONT.serif, color: C.ink }} className="mt-1 text-2xl font-bold">{data ? `${data.total} listings` : 'Land listings'}</h1>
        </div>
        <button
          onClick={() => downloadCsv('mboatrust-land-listings', listings, [
            { header: 'Title', value: (l) => l.title },
            { header: 'Seller', value: (l) => l.sellerName },
            { header: 'City', value: (l) => l.city },
            { header: 'Region', value: (l) => l.region },
            { header: 'Price', value: (l) => l.price },
            { header: 'Status', value: (l) => l.verificationStatus },
            { header: 'Flagged', value: (l) => (l.disputeFlag ? 'yes' : 'no') },
            { header: 'Listed', value: (l) => l.createdAt },
          ])}
          className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors hover:bg-[var(--color-parchment)]"
          style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
        >
          <AppIcon name="folder" size={13} /> Export CSV
        </button>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, region, city, seller…"
          className="w-full rounded-xl border px-3.5 py-2 text-sm sm:max-w-xs"
          style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}
        />
      </div>
      <div className="mb-4">
        <ChipGroup options={LAND_STATUS_OPTIONS} value={statusFilter} onChange={(v) => setStatusFilter(v as string)} />
      </div>

      {isLoading ? (
        <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={listings}
          getRowId={(l) => l.id}
          onRowClick={setSelected}
          rowActions={(l) => (
            <div className="flex gap-1.5">
              {l.verificationStatus !== 'verified' && (
                <>
                  <button
                    onClick={() => setVerifyTarget({ listing: l, status: 'verified' })}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: C.emerald, color: '#fff', fontFamily: FONT.sans }}
                  >Verify</button>
                  <button
                    onClick={() => setVerifyTarget({ listing: l, status: 'flagged' })}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                  >Flag</button>
                </>
              )}
              <button
                onClick={() => setDeleteTarget(l)}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
              >Delete</button>
            </div>
          )}
        />
      )}

      <ConfirmDialog
        open={!!verifyTarget}
        onCancel={() => setVerifyTarget(null)}
        onConfirm={() => { if (verifyTarget) applyVerification(verifyTarget.listing, verifyTarget.status); setVerifyTarget(null) }}
        title={verifyTarget?.status === 'verified' ? 'Verify this listing?' : 'Flag this listing?'}
        description={verifyTarget?.status === 'verified'
          ? `${verifyTarget?.listing.title} becomes purchasable once verified.`
          : `${verifyTarget?.listing.title} will be marked as disputed/flagged and hidden from confident buyers.`}
        confirmLabel={verifyTarget?.status === 'verified' ? 'Verify' : 'Flag'}
        danger={verifyTarget?.status === 'flagged'}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this listing?"
        description={`${deleteTarget?.title} will be permanently removed. This can't be undone.`}
        confirmLabel="Delete"
        danger
      />

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.title} subtitle="Land listing">
        {selected && (
          <div className="space-y-5">
            <AdminLandEditForm listing={selected} onSaved={() => setSelected(null)} />
            <AdminLandDetail listingId={selected.id} />
          </div>
        )}
      </Drawer>
    </AdminShell>
  )
}

// ── Contractors management ──────────────────────────────────────────────────
function AdminContractorEditForm({ contractor }: { contractor: AdminContractorRow }) {
  const { show: showToast } = useToast()
  const [categories, setCategories] = useState(contractor.categories.join(', '))
  const [regions, setRegions] = useState(contractor.regions.join(', '))
  const [bio, setBio] = useState(contractor.bio)
  const [yearsExperience, setYearsExperience] = useState(String(contractor.yearsExperience))
  const updateMutation = useAdminUpdateContractorProfileMutation()

  function handleSave() {
    updateMutation.mutate(
      {
        userId: contractor.userId,
        input: {
          categories: categories.split(',').map((s) => s.trim()).filter(Boolean),
          regions: regions.split(',').map((s) => s.trim()).filter(Boolean),
          bio,
          yearsExperience: Number(yearsExperience) || 0,
        },
      },
      {
        onSuccess: () => showToast({ title: 'Contractor profile updated', tone: 'success' }),
        onError: (err) => showToast({ title: 'Update failed', description: apiErrorMessage(err), tone: 'error' }),
      }
    )
  }

  return (
    <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
      <input value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="Categories (comma-separated)" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
      <input value={regions} onChange={(e) => setRegions(e.target.value)} placeholder="Regions (comma-separated)" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
      <input type="number" min={0} value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="Years experience" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, background: C.white, color: C.ink }} />
      <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={3} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
      <PillButton fullWidth onClick={handleSave} disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving…' : 'Save changes'}</PillButton>
    </div>
  )
}

const CONTRACT_STATUSES = ['active', 'completed', 'terminated'] as const

function AdminContractorDetail({ contractor }: { contractor: AdminContractorRow }) {
  const { show: showToast } = useToast()
  const userId = contractor.userId
  const { data: bids = [] } = useBidsQuery({ contractorId: userId })
  const { data: contracts = [] } = useContractsQuery({ contractorId: userId })
  const createContract = useAdminCreateContractMutation()
  const updateContract = useAdminUpdateContractMutation()
  const removeContract = useAdminRemoveContractMutation()

  const [createOpen, setCreateOpen] = useState(false)
  const [newBidId, setNewBidId] = useState('')
  const acceptedBids = bids.filter((b) => b.status === 'accepted')

  const [editTarget, setEditTarget] = useState<Contract | null>(null)
  const [editStatus, setEditStatus] = useState<Contract['status']>('active')
  const [editText, setEditText] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null)

  function handleCreate() {
    if (!newBidId) return
    const bid = bids.find((b) => b.id === newBidId)
    createContract.mutate(
      { projectId: bid?.jobId || '', bidId: newBidId },
      {
        onSuccess: () => { showToast({ title: 'Contract created', tone: 'success' }); setCreateOpen(false); setNewBidId('') },
        onError: (err) => showToast({ title: 'Create failed', description: apiErrorMessage(err), tone: 'error' }),
      }
    )
  }

  return (
    <div className="space-y-5">
      <AdminContractorEditForm contractor={contractor} />
      <div>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">Bids ({bids.length})</div>
        {bids.length === 0 ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">No bids placed yet.</p>
        ) : (
          <div className="space-y-2">
            {bids.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs" style={{ borderColor: C.parchmentDark }}>
                <div>
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="font-medium">{b.jobTitle || 'Job'} · {fmt(b.price)}</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{b.submitted}</div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Contracts ({contracts.length})</div>
          <button
            onClick={() => setCreateOpen(true)}
            disabled={acceptedBids.length === 0}
            className="rounded-lg px-2.5 py-1 text-[10px] font-semibold disabled:opacity-40"
            style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
          >+ New contract</button>
        </div>
        {contracts.length === 0 ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">No contracts yet.</p>
        ) : (
          <div className="space-y-2">
            {contracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs" style={{ borderColor: C.parchmentDark }}>
                <div>
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="font-medium">{c.projectTitle} · {fmt(c.totalAmount)}</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{new Date(c.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={c.status} />
                  <button
                    onClick={() => { setEditTarget(c); setEditStatus(c.status); setEditText(c.generatedDocumentText) }}
                    className="rounded-lg px-2 py-1 text-[10px] font-semibold"
                    style={{ background: C.parchment, color: C.ink, fontFamily: FONT.sans }}
                  >Edit</button>
                  <button
                    onClick={() => setDeleteTarget(c)}
                    className="rounded-lg px-2 py-1 text-[10px] font-semibold"
                    style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                  >Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New contract" size="sm"
        footer={<PillButton onClick={handleCreate} disabled={!newBidId || createContract.isPending}>{createContract.isPending ? 'Creating…' : 'Create contract'}</PillButton>}
      >
        <div className="space-y-3">
          <select value={newBidId} onChange={(e) => setNewBidId(e.target.value)} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}>
            <option value="">Select an accepted bid…</option>
            {acceptedBids.map((b) => <option key={b.id} value={b.id}>{b.jobTitle || 'Job'} · {fmt(b.price)}</option>)}
          </select>
        </div>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit contract" size="sm"
        footer={(
          <PillButton
            onClick={() => {
              if (!editTarget) return
              updateContract.mutate({ contractId: editTarget.id, input: { status: editStatus, generatedDocumentText: editText } }, {
                onSuccess: () => { showToast({ title: 'Contract updated', tone: 'success' }); setEditTarget(null) },
                onError: (err) => showToast({ title: 'Update failed', description: apiErrorMessage(err), tone: 'error' }),
              })
            }}
            disabled={updateContract.isPending}
          >
            {updateContract.isPending ? 'Saving…' : 'Save changes'}
          </PillButton>
        )}
      >
        <div className="space-y-3">
          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as Contract['status'])} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}>
            {CONTRACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="Contract terms" rows={4} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          removeContract.mutate(deleteTarget.id, {
            onSuccess: () => showToast({ title: 'Contract deleted', tone: 'success' }),
            onError: (err) => showToast({ title: 'Delete failed', description: apiErrorMessage(err), tone: 'error' }),
          })
          setDeleteTarget(null)
        }}
        title="Delete this contract?"
        description={deleteTarget ? `The contract for ${deleteTarget.projectTitle} will be permanently removed.` : undefined}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}

export function AdminContractorsScreen() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminContractorRow | null>(null)

  const { data, isLoading } = useAdminContractorsQuery({ search: search.trim() || undefined })
  const contractors = data?.contractors ?? []

  const columns: DataTableColumn<AdminContractorRow>[] = [
    { key: 'name', header: 'Name', sortValue: (c) => c.fullName, render: (c) => <span className="font-medium">{c.fullName}</span> },
    { key: 'categories', header: 'Categories', render: (c) => <span style={{ color: C.inkMuted }}>{c.categories.join(', ') || '—'}</span> },
    { key: 'regions', header: 'Regions', render: (c) => <span style={{ color: C.inkMuted }}>{c.regions.join(', ') || '—'}</span> },
    { key: 'experience', header: 'Years', align: 'center', sortValue: (c) => c.yearsExperience, render: (c) => <span>{c.yearsExperience}</span> },
    { key: 'jobs', header: 'Completed', align: 'center', sortValue: (c) => c.completedProjects, render: (c) => <span>{c.completedProjects}</span> },
    { key: 'rating', header: 'Rating', align: 'center', sortValue: (c) => c.avgRating ?? 0, render: (c) => <span>{c.avgRating != null ? `${c.avgRating.toFixed(1)} (${c.ratingCount})` : '—'}</span> },
    { key: 'kyc', header: 'KYC', render: (c) => <StatusBadge status={c.kycStatus ?? 'unverified'} /> },
    { key: 'available', header: 'Available', render: (c) => c.isAvailable ? <StatusBadge status="active" /> : <StatusBadge status="closed" /> },
  ]

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Contractors</div>
          <h1 style={{ fontFamily: FONT.serif, color: C.ink }} className="mt-1 text-2xl font-bold">{data ? `${data.total} contractors` : 'Contractors'}</h1>
        </div>
        <button
          onClick={() => downloadCsv('mboatrust-contractors', contractors, [
            { header: 'Name', value: (c) => c.fullName },
            { header: 'Categories', value: (c) => c.categories.join('; ') },
            { header: 'Regions', value: (c) => c.regions.join('; ') },
            { header: 'Years experience', value: (c) => c.yearsExperience },
            { header: 'Completed projects', value: (c) => c.completedProjects },
            { header: 'Avg rating', value: (c) => c.avgRating ?? '' },
            { header: 'KYC status', value: (c) => c.kycStatus ?? '' },
            { header: 'Available', value: (c) => (c.isAvailable ? 'yes' : 'no') },
          ])}
          className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors hover:bg-[var(--color-parchment)]"
          style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
        >
          <AppIcon name="folder" size={13} /> Export CSV
        </button>
      </div>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name…"
          className="w-full rounded-xl border px-3.5 py-2 text-sm sm:max-w-xs"
          style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}
        />
      </div>

      {isLoading ? (
        <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
      ) : (
        <DataTable columns={columns} rows={contractors} getRowId={(c) => c.userId} onRowClick={setSelected} />
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.fullName} subtitle="Contractor detail">
        {selected && <AdminContractorDetail contractor={selected} />}
      </Drawer>
    </AdminShell>
  )
}

// ── Community & Funding ──────────────────────────────────────────────────
function AdminGroupDetail({ groupId }: { groupId: string }) {
  const { data: dashboard } = useGroupDashboardQuery(groupId)
  if (!dashboard) return <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-sm">Loading…</p>
  return (
    <div className="space-y-5">
      {dashboard.fundingSummary && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
            <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">{fmt(dashboard.fundingSummary.raised)}</div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest">Raised</div>
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
            <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">{fmt(dashboard.fundingSummary.released)}</div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest">Released</div>
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
            <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">{fmt(dashboard.fundingSummary.escrowBalance)}</div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-widest">In escrow</div>
          </div>
        </div>
      )}
      <div>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">Members ({dashboard.memberCount})</div>
        <div className="space-y-2">
          {dashboard.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs" style={{ borderColor: C.parchmentDark }}>
              <span style={{ fontFamily: FONT.sans, color: C.ink }}>{m.name}</span>
              <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="uppercase">{m.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AdminCommunityScreen() {
  const { show: showToast } = useToast()
  const [tab, setTab] = useState<'groups' | 'referrals' | 'subscriptions' | 'team'>('groups')
  const [selectedGroup, setSelectedGroup] = useState<AdminGroupRow | null>(null)
  const [groupEditTarget, setGroupEditTarget] = useState<AdminGroupRow | null>(null)
  const [groupEditName, setGroupEditName] = useState('')
  const [groupEditPurpose, setGroupEditPurpose] = useState('')
  const [groupEditDescription, setGroupEditDescription] = useState('')
  const [groupDeleteTarget, setGroupDeleteTarget] = useState<AdminGroupRow | null>(null)
  const [referralDeleteTarget, setReferralDeleteTarget] = useState<AdminReferralRow | null>(null)
  const [subCancelTarget, setSubCancelTarget] = useState<AdminSubscriptionRow | null>(null)
  const [teamDeleteTarget, setTeamDeleteTarget] = useState<AdminTeamMemberRow | null>(null)

  const { data: groupsData, isLoading: groupsLoading } = useAdminGroupsQuery()
  const { data: referralsData, isLoading: referralsLoading } = useAdminReferralsQuery()
  const { data: subsData, isLoading: subsLoading } = useAdminSubscriptionsQuery()
  const { data: teamData, isLoading: teamLoading } = useAdminTeamMembersQuery()
  const updateGroup = useAdminUpdateGroupMutation()
  const removeGroup = useAdminRemoveGroupMutation()
  const removeReferral = useAdminRemoveReferralMutation()
  const cancelSubscription = useCancelSubscriptionMutation()
  const updateTeamRole = useUpdateTeamMemberRoleMutation()
  const removeTeamMember = useRemoveTeamMemberMutation()

  const groupColumns: DataTableColumn<AdminGroupRow>[] = [
    { key: 'name', header: 'Group', sortValue: (g) => g.name, render: (g) => <span className="font-medium">{g.name}</span> },
    { key: 'purpose', header: 'Purpose', render: (g) => <span style={{ color: C.inkMuted }}>{g.purpose || '—'}</span> },
    { key: 'creator', header: 'Created by', render: (g) => <span style={{ color: C.inkMuted }}>{g.createdByName}</span> },
    { key: 'members', header: 'Members', align: 'center', sortValue: (g) => g.memberCount, render: (g) => <span>{g.memberCount}</span> },
    { key: 'linked', header: 'Linked project', render: (g) => g.linkedProjectId ? <StatusBadge status="active" /> : <span style={{ color: C.inkSubtle }}>—</span> },
  ]

  const referralColumns: DataTableColumn<AdminReferralRow>[] = [
    { key: 'referrer', header: 'Referrer', sortValue: (r) => r.referrerName, render: (r) => <span className="font-medium">{r.referrerName}</span> },
    { key: 'referred', header: 'Referred', render: (r) => <span style={{ color: C.inkMuted }}>{r.referredName ?? 'Not yet claimed'}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'reward', header: 'Reward', align: 'right', render: (r) => <span style={{ fontFamily: FONT.mono }}>{r.rewardAmount != null ? fmt(r.rewardAmount) : '—'}</span> },
    { key: 'created', header: 'Created', sortValue: (r) => r.createdAt, render: (r) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{new Date(r.createdAt).toLocaleDateString()}</span> },
  ]

  const subColumns: DataTableColumn<AdminSubscriptionRow>[] = [
    { key: 'user', header: 'User', sortValue: (s) => s.userName, render: (s) => <span className="font-medium">{s.userName}</span> },
    { key: 'plan', header: 'Plan', render: (s) => <span style={{ color: C.inkMuted, textTransform: 'capitalize' }}>{s.planType.replace('_', ' ')}</span> },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    { key: 'renewal', header: 'Renews', render: (s) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{s.renewalDate ? new Date(s.renewalDate).toLocaleDateString() : '—'}</span> },
  ]

  const teamColumns: DataTableColumn<AdminTeamMemberRow>[] = [
    { key: 'owner', header: 'Team owner', sortValue: (t) => t.ownerName, render: (t) => <span className="font-medium">{t.ownerName}</span> },
    { key: 'member', header: 'Member', render: (t) => <span style={{ color: C.inkMuted }}>{t.memberName}</span> },
    { key: 'role', header: 'Role', render: (t) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle, textTransform: 'uppercase' }}>{t.role}</span> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
  ]

  return (
    <AdminShell>
      <div className="mb-6">
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Community & funding</div>
        <h1 style={{ fontFamily: FONT.serif, color: C.ink }} className="mt-1 text-2xl font-bold">Community</h1>
      </div>

      <Tabs
        tabs={[
          { id: 'groups', label: `Groups (${groupsData?.total ?? 0})` },
          { id: 'referrals', label: `Referrals (${referralsData?.total ?? 0})` },
          { id: 'subscriptions', label: `Subscriptions (${subsData?.total ?? 0})` },
          { id: 'team', label: `Team members (${teamData?.total ?? 0})` },
        ]}
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        variant="pill"
      />

      <div className="mt-5">
        {tab === 'groups' && (groupsLoading ? <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p> : (
          <DataTable
            columns={groupColumns}
            rows={groupsData?.groups ?? []}
            getRowId={(g) => g.id}
            onRowClick={setSelectedGroup}
            rowActions={(g) => (
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setGroupEditTarget(g); setGroupEditName(g.name); setGroupEditPurpose(g.purpose); setGroupEditDescription(g.description) }}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                  style={{ background: C.parchment, color: C.ink, fontFamily: FONT.sans }}
                >Edit</button>
                <button
                  onClick={() => setGroupDeleteTarget(g)}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                  style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                >Disband</button>
              </div>
            )}
          />
        ))}
        {tab === 'referrals' && (referralsLoading ? <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p> : (
          <DataTable
            columns={referralColumns}
            rows={referralsData?.referrals ?? []}
            getRowId={(r) => r.id}
            rowActions={(r) => (
              <button
                onClick={() => setReferralDeleteTarget(r)}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
              >Delete</button>
            )}
          />
        ))}
        {tab === 'subscriptions' && (subsLoading ? <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p> : (
          <DataTable
            columns={subColumns}
            rows={subsData?.subscriptions ?? []}
            getRowId={(s) => s.id}
            rowActions={(s) => s.status === 'active' ? (
              <button
                onClick={() => setSubCancelTarget(s)}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
              >Force cancel</button>
            ) : null}
          />
        ))}
        {tab === 'team' && (teamLoading ? <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p> : (
          <DataTable
            columns={teamColumns}
            rows={teamData?.members ?? []}
            getRowId={(t) => t.id}
            rowActions={(t) => t.role === 'owner' ? null : (
              <div className="flex gap-1.5">
                <button
                  onClick={() => updateTeamRole.mutate({ id: t.id, role: t.role === 'approver' ? 'viewer' : 'approver' }, {
                    onSuccess: () => showToast({ title: 'Role updated', tone: 'success' }),
                    onError: (err) => showToast({ title: 'Update failed', description: apiErrorMessage(err), tone: 'error' }),
                  })}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                  style={{ background: C.parchment, color: C.ink, fontFamily: FONT.sans }}
                >{t.role === 'approver' ? 'Make viewer' : 'Make approver'}</button>
                <button
                  onClick={() => setTeamDeleteTarget(t)}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                  style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
                >Remove</button>
              </div>
            )}
          />
        ))}
      </div>

      <ConfirmDialog
        open={!!teamDeleteTarget}
        onCancel={() => setTeamDeleteTarget(null)}
        onConfirm={() => {
          if (!teamDeleteTarget) return
          removeTeamMember.mutate(teamDeleteTarget.id, {
            onSuccess: () => showToast({ title: 'Team member removed', tone: 'success' }),
            onError: (err) => showToast({ title: 'Remove failed', description: apiErrorMessage(err), tone: 'error' }),
          })
          setTeamDeleteTarget(null)
        }}
        title="Remove this team member?"
        description={teamDeleteTarget ? `${teamDeleteTarget.memberName} will be removed from ${teamDeleteTarget.ownerName}'s roster.` : undefined}
        confirmLabel="Remove"
        danger
      />

      <Modal open={!!groupEditTarget} onClose={() => setGroupEditTarget(null)} title="Edit group" size="sm"
        footer={(
          <PillButton
            onClick={() => {
              if (!groupEditTarget) return
              updateGroup.mutate({ groupId: groupEditTarget.id, input: { name: groupEditName, purpose: groupEditPurpose, description: groupEditDescription } }, {
                onSuccess: () => { showToast({ title: 'Group updated', tone: 'success' }); setGroupEditTarget(null) },
                onError: (err) => showToast({ title: 'Update failed', description: apiErrorMessage(err), tone: 'error' }),
              })
            }}
            disabled={updateGroup.isPending}
          >
            {updateGroup.isPending ? 'Saving…' : 'Save changes'}
          </PillButton>
        )}
      >
        <div className="space-y-3">
          <input value={groupEditName} onChange={(e) => setGroupEditName(e.target.value)} placeholder="Group name" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
          <input value={groupEditPurpose} onChange={(e) => setGroupEditPurpose(e.target.value)} placeholder="Purpose" className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
          <textarea value={groupEditDescription} onChange={(e) => setGroupEditDescription(e.target.value)} placeholder="Description" rows={3} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!groupDeleteTarget}
        onCancel={() => setGroupDeleteTarget(null)}
        onConfirm={() => {
          if (!groupDeleteTarget) return
          removeGroup.mutate(groupDeleteTarget.id, {
            onSuccess: () => showToast({ title: 'Group disbanded', tone: 'success' }),
            onError: (err) => showToast({ title: 'Disband failed', description: apiErrorMessage(err), tone: 'error' }),
          })
          setGroupDeleteTarget(null)
        }}
        title="Disband this group?"
        description={groupDeleteTarget ? `${groupDeleteTarget.name} and all its ${groupDeleteTarget.memberCount} membership row(s) will be permanently removed.` : undefined}
        confirmLabel="Disband"
        danger
      />

      <ConfirmDialog
        open={!!referralDeleteTarget}
        onCancel={() => setReferralDeleteTarget(null)}
        onConfirm={() => {
          if (!referralDeleteTarget) return
          removeReferral.mutate(referralDeleteTarget.id, {
            onSuccess: () => showToast({ title: 'Referral deleted', tone: 'success' }),
            onError: (err) => showToast({ title: 'Delete failed', description: apiErrorMessage(err), tone: 'error' }),
          })
          setReferralDeleteTarget(null)
        }}
        title="Delete this referral?"
        description={referralDeleteTarget ? `The referral from ${referralDeleteTarget.referrerName} will be permanently removed.` : undefined}
        confirmLabel="Delete"
        danger
      />

      <ConfirmDialog
        open={!!subCancelTarget}
        onCancel={() => setSubCancelTarget(null)}
        onConfirm={() => {
          if (!subCancelTarget) return
          cancelSubscription.mutate(subCancelTarget.id, {
            onSuccess: () => showToast({ title: 'Subscription cancelled', tone: 'success' }),
            onError: (err) => showToast({ title: 'Cancel failed', description: apiErrorMessage(err), tone: 'error' }),
          })
          setSubCancelTarget(null)
        }}
        title="Force-cancel this subscription?"
        description={subCancelTarget ? `${subCancelTarget.userName}'s ${subCancelTarget.planType.replace('_', ' ')} subscription will be cancelled immediately.` : undefined}
        confirmLabel="Cancel subscription"
        danger
      />

      <Drawer open={!!selectedGroup} onClose={() => setSelectedGroup(null)} title={selectedGroup?.name} subtitle="Group detail">
        {selectedGroup && <AdminGroupDetail groupId={selectedGroup.id} />}
      </Drawer>
    </AdminShell>
  )
}

// ── Notifications (broadcast composer) ──────────────────────────────────────
const NOTIFICATION_TYPE_OPTIONS = [
  { value: 'admin_announcement', label: 'General announcement' },
  { value: 'platform_maintenance', label: 'Maintenance notice' },
  { value: 'policy_update', label: 'Policy update' },
]

export function AdminNotificationsScreen() {
  const { show: showToast } = useToast()
  const [targetRole, setTargetRole] = useState<AdminNotificationTargetRole | 'all'>('all')
  const [type, setType] = useState(NOTIFICATION_TYPE_OPTIONS[0].value)
  const [message, setMessage] = useState('')

  const { data, isLoading } = useAdminNotificationsHistoryQuery()
  const broadcastMutation = useBroadcastNotificationMutation()

  const columns: DataTableColumn<AdminNotificationHistoryRow>[] = [
    { key: 'type', header: 'Type', render: (n) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle, textTransform: 'uppercase' }} className="text-[11px]">{n.type.replace(/_/g, ' ')}</span> },
    { key: 'message', header: 'Message', render: (n) => <span className="line-clamp-2 max-w-md">{n.message || '—'}</span> },
    { key: 'recipients', header: 'Recipients', align: 'right', sortValue: (n) => n.recipientCount, render: (n) => <span style={{ fontFamily: FONT.mono }}>{n.recipientCount}</span> },
    { key: 'read', header: 'Read', align: 'right', sortValue: (n) => n.readCount, render: (n) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{n.readCount}/{n.recipientCount}</span> },
    { key: 'sentBy', header: 'Sent by', render: (n) => <span style={{ color: C.inkMuted }}>{n.sentByName}</span> },
    { key: 'sent', header: 'Sent', sortValue: (n) => n.createdAt, render: (n) => <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }}>{new Date(n.createdAt).toLocaleString()}</span> },
  ]

  function handleSend() {
    if (!message.trim()) { showToast({ title: 'Write a message first', tone: 'error' }); return }
    broadcastMutation.mutate(
      { type, message: message.trim(), targetRole: targetRole === 'all' ? undefined : targetRole },
      {
        onSuccess: (result) => {
          showToast({ title: `Sent to ${result.recipientCount} user${result.recipientCount === 1 ? '' : 's'}`, tone: 'success' })
          setMessage('')
        },
        onError: (err) => showToast({ title: apiErrorMessage(err), tone: 'error' }),
      }
    )
  }

  return (
    <AdminShell>
      <div className="mb-6">
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Notifications</div>
        <h1 style={{ fontFamily: FONT.serif, color: C.ink }} className="mt-1 text-2xl font-bold">Broadcast composer</h1>
      </div>

      <Card className="mb-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 text-[10px] uppercase tracking-widest">Audience</div>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as typeof targetRole)}
              className="w-full rounded-lg border px-2.5 py-2 text-sm"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}
            >
              <option value="all">Everyone</option>
              {ADMIN_NOTIFICATION_TARGET_ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}s</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 text-[10px] uppercase tracking-widest">Type</div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border px-2.5 py-2 text-sm"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}
            >
              {NOTIFICATION_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-1.5 text-[10px] uppercase tracking-widest">Message</div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What should this audience know?"
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <PillButton onClick={handleSend} disabled={broadcastMutation.isPending}>
            {broadcastMutation.isPending ? 'Sending…' : 'Send broadcast'}
          </PillButton>
        </div>
      </Card>

      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-3 text-[10px] uppercase tracking-widest">Send history</div>
      {isLoading ? (
        <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
      ) : (
        <DataTable columns={columns} rows={data?.items ?? []} getRowId={(n) => n.broadcastId} emptyState="No broadcasts sent yet" />
      )}
    </AdminShell>
  )
}

// ── Platform settings ────────────────────────────────────────────────────────
const CONFIG_LABELS: Record<string, string> = {
  gemini: 'Gemini AI (fraud/evidence analysis)',
  cloudinary: 'Cloudinary (media uploads)',
  stripe: 'Stripe',
  flutterwave: 'Flutterwave',
  firebase: 'Firebase (auth)',
  mtnMomo: 'MTN Mobile Money',
  orangeMoney: 'Orange Money',
}

function FeeConfigRowEditor({ row, onSave, onDelete, saving }: { row: FeeConfigRow; onSave: (input: { feeType: string; value: number; isFlat: boolean }) => void; onDelete: (row: FeeConfigRow) => void; saving: boolean }) {
  const [value, setValue] = useState(String(row.value))
  const [isFlat, setIsFlat] = useState(row.isFlat)
  const dirty = Number(value) !== row.value || isFlat !== row.isFlat

  return (
    <div className="flex flex-wrap items-center gap-3 border-b py-3 last:border-b-0" style={{ borderColor: C.parchmentDark }}>
      <div className="min-w-[140px] flex-1">
        <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-semibold capitalize">{row.feeType.replace(/_/g, ' ')}</div>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">Updated {new Date(row.updatedAt).toLocaleDateString()}</div>
      </div>
      <label className="flex items-center gap-1.5 text-xs" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>
        <input type="checkbox" checked={isFlat} onChange={(e) => setIsFlat(e.target.checked)} /> Flat amount
      </label>
      <input
        type="number"
        step="0.001"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-28 rounded-lg border px-2.5 py-1.5 text-sm"
        style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, background: C.white, color: C.ink }}
      />
      <button
        disabled={!dirty || saving || Number.isNaN(Number(value))}
        onClick={() => onSave({ feeType: row.feeType, value: Number(value), isFlat })}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
        style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
      >
        Save
      </button>
      <button
        onClick={() => onDelete(row)}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold"
        style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
      >
        Delete
      </button>
    </div>
  )
}

export function AdminSettingsScreen() {
  const { show: showToast } = useToast()
  const { data: feeConfigs, isLoading: feeLoading } = useFeeConfigQuery()
  const upsertMutation = useUpsertFeeConfigMutation()
  const removeFeeMutation = useRemoveFeeConfigMutation()
  const { data: health, isLoading: healthLoading } = useSystemHealthQuery()
  const [newFeeType, setNewFeeType] = useState('')
  const [feeDeleteTarget, setFeeDeleteTarget] = useState<FeeConfigRow | null>(null)

  function handleSave(input: { feeType: string; value: number; isFlat: boolean }) {
    upsertMutation.mutate(input, {
      onSuccess: () => showToast({ title: `Updated ${input.feeType.replace(/_/g, ' ')}`, tone: 'success' }),
      onError: (err) => showToast({ title: apiErrorMessage(err), tone: 'error' }),
    })
  }

  function handleDeleteFee() {
    if (!feeDeleteTarget) return
    removeFeeMutation.mutate(feeDeleteTarget.feeType, {
      onSuccess: () => showToast({ title: 'Fee type removed', tone: 'success' }),
      onError: (err) => showToast({ title: apiErrorMessage(err), tone: 'error' }),
    })
    setFeeDeleteTarget(null)
  }

  function handleAddFeeType() {
    const feeType = newFeeType.trim().toLowerCase().replace(/\s+/g, '_')
    if (!feeType) return
    upsertMutation.mutate({ feeType, value: 0, isFlat: false }, {
      onSuccess: () => { setNewFeeType(''); showToast({ title: 'Fee type added', tone: 'success' }) },
      onError: (err) => showToast({ title: apiErrorMessage(err), tone: 'error' }),
    })
  }

  return (
    <AdminShell>
      <div className="mb-6">
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Platform settings</div>
        <h1 style={{ fontFamily: FONT.serif, color: C.ink }} className="mt-1 text-2xl font-bold">Fees & system status</h1>
      </div>

      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">Fee configuration</div>
      <Card className="mb-6 p-5">
        {feeLoading ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-4 text-center text-sm">Loading…</p>
        ) : (feeConfigs ?? []).length === 0 ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-4 text-center text-sm">No fee types configured yet.</p>
        ) : (
          (feeConfigs ?? []).map((row) => (
            <FeeConfigRowEditor key={row.id} row={row} onSave={handleSave} onDelete={setFeeDeleteTarget} saving={upsertMutation.isPending} />
          ))
        )}

        <div className="mt-4 flex gap-2 border-t pt-4" style={{ borderColor: C.parchmentDark }}>
          <input
            value={newFeeType}
            onChange={(e) => setNewFeeType(e.target.value)}
            placeholder="New fee type key, e.g. escrow_release"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}
          />
          <button
            onClick={handleAddFeeType}
            disabled={!newFeeType.trim() || upsertMutation.isPending}
            className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40"
            style={{ background: C.ink, color: '#fff', fontFamily: FONT.sans }}
          >
            Add fee type
          </button>
        </div>
      </Card>

      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mb-2 text-[10px] uppercase tracking-widest">System configuration</div>
      <Card className="p-5">
        {healthLoading ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-4 text-center text-sm">Loading…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
              <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm">Database connection</span>
              <StatusBadge status={health?.db.connected ? 'active' : 'closed'} />
            </div>
            {Object.entries(health?.config ?? {}).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: C.parchmentDark }}>
                <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm">{CONFIG_LABELS[key] || key}</span>
                <StatusBadge status={enabled ? 'active' : 'closed'} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!feeDeleteTarget}
        onCancel={() => setFeeDeleteTarget(null)}
        onConfirm={handleDeleteFee}
        title="Delete this fee type?"
        description={feeDeleteTarget ? `${feeDeleteTarget.feeType.replace(/_/g, ' ')} will be permanently removed. Any flow still resolving this fee type will need it re-added first.` : undefined}
        confirmLabel="Delete"
        danger
      />
    </AdminShell>
  )
}

// ── Admin accounts & permissions (RBAC) ──────────────────────────────────────
const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  ADMIN_NAV.flatMap((section) => section.items.map((item) => [item.key, item.label]))
)

function PermissionEditor({ account, onClose }: { account: AdminAccountRow; onClose: () => void }) {
  const { show: showToast } = useToast()
  const [restricted, setRestricted] = useState(account.adminPermissions != null)
  const [selected, setSelected] = useState<Set<AdminPermissionKey>>(new Set(account.adminPermissions ?? []))
  const setPermissionsMutation = useSetAdminPermissionsMutation()

  function toggle(key: AdminPermissionKey) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleSave() {
    setPermissionsMutation.mutate(
      { userId: account.id, permissions: restricted ? Array.from(selected) : null },
      {
        onSuccess: () => { showToast({ title: 'Permissions updated', tone: 'success' }); onClose() },
        onError: (err) => showToast({ title: apiErrorMessage(err), tone: 'error' }),
      }
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: C.forest, fontFamily: FONT.serif }}>{account.fullName[0]?.toUpperCase() ?? '?'}</div>
        <div className="min-w-0">
          <div style={{ fontFamily: FONT.sans, color: C.ink }} className="truncate text-sm font-semibold">{account.fullName}</div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="truncate text-[11px]">{account.email || account.phoneNumber || '—'}</div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm" style={{ fontFamily: FONT.sans, color: C.ink }}>
        <input type="checkbox" checked={restricted} onChange={(e) => setRestricted(e.target.checked)} />
        Restrict this admin to specific sections
      </label>

      {!restricted ? (
        <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">This admin has full, unrestricted access to every section.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {ADMIN_PERMISSION_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs" style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}>
              <input type="checkbox" checked={selected.has(key)} onChange={() => toggle(key)} />
              {PERMISSION_LABELS[key] || key}
            </label>
          ))}
        </div>
      )}

      <PillButton fullWidth onClick={handleSave} disabled={setPermissionsMutation.isPending}>
        {setPermissionsMutation.isPending ? 'Saving…' : 'Save permissions'}
      </PillButton>
    </div>
  )
}

function PromoteAdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { show: showToast } = useToast()
  const [query, setQuery] = useState('')
  const { data: results = [] } = useUserSearchQuery(query)
  const grantMutation = useGrantRoleMutation()

  function promote(userId: string) {
    grantMutation.mutate({ userId, roleType: 'admin' }, {
      onSuccess: () => { showToast({ title: 'Promoted to admin', tone: 'success' }); onClose() },
      onError: (err) => showToast({ title: 'Promote failed', description: apiErrorMessage(err), tone: 'error' }),
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Promote user to admin" size="sm">
      <div className="space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="w-full rounded-lg border px-2.5 py-1.5 text-sm"
          style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, background: C.white, color: C.ink }}
        />
        {results.length === 0 && query.trim().length >= 2 && (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">No matching users.</p>
        )}
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {results.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs" style={{ borderColor: C.parchmentDark }}>
              <div>
                <div style={{ fontFamily: FONT.sans, color: C.ink }} className="font-medium">{u.fullName}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{u.email || u.phoneNumber}{u.roles.includes('admin') ? ' · already admin' : ''}</div>
              </div>
              <button
                onClick={() => promote(u.id)}
                disabled={u.roles.includes('admin') || grantMutation.isPending}
                className="rounded-lg px-2.5 py-1 text-[10px] font-semibold disabled:opacity-40"
                style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
              >Promote</button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export function AdminAccountsScreen() {
  const { show: showToast } = useToast()
  const { data: accounts, isLoading } = useAdminAccountsQuery()
  const { data: myPermissions } = useMyAdminPermissionsQuery(true)
  const canManage = myPermissions == null // only an unrestricted admin may edit — matches requireUnrestrictedAdmin server-side
  const [editing, setEditing] = useState<AdminAccountRow | null>(null)
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<AdminAccountRow | null>(null)
  const revokeMutation = useRevokeRoleMutation()

  const columns: DataTableColumn<AdminAccountRow>[] = [
    { key: 'name', header: 'Name', sortValue: (a) => a.fullName, render: (a) => <span className="font-medium">{a.fullName}</span> },
    { key: 'contact', header: 'Contact', render: (a) => <span style={{ color: C.inkMuted }}>{a.email || a.phoneNumber || '—'}</span> },
    {
      key: 'access', header: 'Access', render: (a) => a.adminPermissions == null ? (
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: C.parchment, color: C.forest, fontFamily: FONT.mono }}>Full access</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {a.adminPermissions.length === 0 && <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">No sections</span>}
          {a.adminPermissions.map((p) => (
            <span key={p} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: C.parchment, color: C.inkMuted, fontFamily: FONT.mono }}>{PERMISSION_LABELS[p] || p}</span>
          ))}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.isActive ? 'active' : 'closed'} /> },
  ]

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Platform</div>
          <h1 style={{ fontFamily: FONT.serif, color: C.ink }} className="mt-1 text-2xl font-bold">Admin accounts</h1>
          {!canManage && (
            <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="mt-2 text-xs">You have restricted access, so you can view this list but can't edit it — only an unrestricted admin can.</p>
          )}
        </div>
        {canManage && (
          <button
            onClick={() => setPromoteOpen(true)}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
            style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
          >
            <AppIcon name="plus" size={13} /> Promote to admin
          </button>
        )}
      </div>

      {isLoading ? (
        <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="py-8 text-center text-sm">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={accounts ?? []}
          getRowId={(a) => a.id}
          onRowClick={canManage ? setEditing : undefined}
          rowActions={canManage ? (a) => (
            <button
              onClick={() => setRevokeTarget(a)}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold"
              style={{ background: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}
            >Revoke admin</button>
          ) : undefined}
        />
      )}

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing?.fullName} subtitle="Admin permissions">
        {editing && <PermissionEditor account={editing} onClose={() => setEditing(null)} />}
      </Drawer>

      <PromoteAdminModal open={promoteOpen} onClose={() => setPromoteOpen(false)} />

      <ConfirmDialog
        open={!!revokeTarget}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (!revokeTarget) return
          revokeMutation.mutate({ userId: revokeTarget.id, roleType: 'admin' }, {
            onSuccess: () => showToast({ title: 'Admin access revoked', tone: 'success' }),
            onError: (err) => showToast({ title: 'Revoke failed', description: apiErrorMessage(err), tone: 'error' }),
          })
          setRevokeTarget(null)
        }}
        title="Revoke admin access?"
        description={revokeTarget ? `${revokeTarget.fullName} will lose admin access to this dashboard entirely.` : undefined}
        confirmLabel="Revoke"
        danger
      />
    </AdminShell>
  )
}
