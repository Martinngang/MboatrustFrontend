import { useState } from 'react'
import { C, FONT, Card } from './MobileLayout'
import { useToast } from './Toast'
import { apiErrorMessage } from '../api/client'
import {
  useFetchPlanDocumentMutation,
  useRecommendedVerifiersForProjectQuery,
  useRequestLocationVerificationMutation,
  useInviteVerifierMutation,
  useProjectVerifierInvitationsQuery,
  useRevokeVerifierInvitationMutation,
} from '../api/projects'

const STATUS_LABEL: Record<string, string> = { pending: 'Pending', accepted: 'Accepted', revoked: 'Revoked', expired: 'Expired' }
const STATUS_COLOR: Record<string, string> = { pending: C.amber, accepted: C.forest, revoked: C.inkSubtle, expired: C.inkSubtle }

/** Funder-facing verifier picker for "I don't know the exact location, send
 * a Verifier" — same ranked-candidate UI as the admin-only AssignVerifierRow
 * (src/screens/AdditionalScreens.tsx), reusing the identical scoring engine
 * (verifierMatchingService) via a project-scoped, owner-authorized endpoint
 * instead of the admin-only generic one. Used both right after creating a
 * tender (PostJobScreen) and later from the project detail screen if the
 * funder didn't request one at creation time. */
export function RequestVerifierPanel({ projectId, onAssigned }: { projectId: string; onAssigned?: () => void }) {
  const { data: recommended, isLoading } = useRecommendedVerifiersForProjectQuery(projectId)
  const requestMutation = useRequestLocationVerificationMutation()
  const { show: showToast } = useToast()
  const [assignedTo, setAssignedTo] = useState<string | null>(null)

  const { data: invitations } = useProjectVerifierInvitationsQuery(projectId)
  const inviteMutation = useInviteVerifierMutation()
  const revokeMutation = useRevokeVerifierInvitationMutation()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const assign = (verifierId: string, fullName: string) => {
    requestMutation.mutate(
      { projectId, verifierId },
      {
        onSuccess: () => {
          setAssignedTo(verifierId)
          showToast({ title: `Requested ${fullName} to confirm the exact site location`, tone: 'success' })
          onAssigned?.()
        },
        onError: (err) => showToast({ title: 'Could not request verification', description: apiErrorMessage(err, 'Please try again'), tone: 'error' }),
      }
    )
  }

  const sendInvite = () => {
    if (!inviteEmail.trim()) return
    inviteMutation.mutate(
      { projectId, email: inviteEmail.trim(), name: inviteName.trim() || undefined },
      {
        onSuccess: ({ inviteUrl }) => {
          setLastInviteUrl(inviteUrl)
          setInviteEmail('')
          setInviteName('')
          showToast({ title: 'Invitation sent', description: 'We emailed them a link — you can also copy and share it yourself.', tone: 'success' })
        },
        onError: (err) => showToast({ title: 'Could not send invitation', description: apiErrorMessage(err, 'Please try again'), tone: 'error' }),
      }
    )
  }

  const copyLink = async () => {
    if (!lastInviteUrl) return
    try {
      await navigator.clipboard.writeText(lastInviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast({ title: 'Could not copy link', description: 'Select and copy it manually.', tone: 'error' })
    }
  }

  const revoke = (invitationId: string) => {
    revokeMutation.mutate(
      { projectId, invitationId },
      { onError: (err) => showToast({ title: 'Could not revoke invitation', description: apiErrorMessage(err, 'Please try again'), tone: 'error' }) }
    )
  }

  return (
    <Card>
      <div className="p-4">
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">
          Request a Verifier
        </div>
        <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mb-3">
          Pick a verifier to visit the site and confirm the exact coordinates on your behalf.
        </p>
        {isLoading && <div className="text-xs" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>Loading recommendations…</div>}
        {!isLoading && (recommended ?? []).length === 0 && (
          <div className="text-xs" style={{ fontFamily: FONT.sans, color: C.inkMuted }}>No approved verifiers available yet.</div>
        )}
        <div className="space-y-2">
          {(recommended ?? []).map((r) => (
            <div key={r.verifierId} className="flex items-center justify-between gap-2 rounded-lg p-2.5" style={{ background: C.parchment }}>
              <div className="min-w-0">
                <div style={{ fontFamily: FONT.sans }} className="text-xs font-semibold truncate">{r.fullName}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider">
                  Score {r.score.total}/100 · {r.openTaskCount} open task{r.openTaskCount === 1 ? '' : 's'}{r.regions.length > 0 ? ` · ${r.regions.join(', ')}` : ''}
                </div>
              </div>
              <button
                onClick={() => assign(r.verifierId, r.fullName)}
                disabled={requestMutation.isPending || assignedTo !== null}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                style={{ background: assignedTo === r.verifierId ? C.parchmentDark : C.forest, color: assignedTo === r.verifierId ? C.inkMuted : '#fff', fontFamily: FONT.sans }}
              >
                {assignedTo === r.verifierId ? 'Requested' : 'Request'}
              </button>
            </div>
          ))}
        </div>

        <div className="h-px my-4" style={{ background: C.parchmentDark }} />

        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">
          Invite your own verifier
        </div>
        <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-xs mb-3">
          Know someone who can confirm the site in person? Invite them by email or share a secure link — they'll create or
          sign in to their own Verifier account, and will only ever see this one project's location task, never your account.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <input
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Their email address"
            type="email"
            className="flex-1 rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
          />
          <input
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Their name (optional)"
            className="flex-1 rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: C.parchmentDark, fontFamily: FONT.sans, color: C.ink }}
          />
          <button
            onClick={sendInvite}
            disabled={inviteMutation.isPending || !inviteEmail.trim()}
            className="rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap"
            style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans, opacity: inviteMutation.isPending || !inviteEmail.trim() ? 0.6 : 1 }}
          >
            {inviteMutation.isPending ? 'Sending…' : 'Send invitation'}
          </button>
        </div>
        {lastInviteUrl && (
          <div className="flex items-center justify-between gap-2 rounded-lg p-2.5 mb-3" style={{ background: C.parchment }}>
            <span style={{ fontFamily: FONT.mono, color: C.inkMuted }} className="text-[11px] truncate">{lastInviteUrl}</span>
            <button
              onClick={copyLink}
              className="text-xs font-semibold whitespace-nowrap flex-shrink-0"
              style={{ fontFamily: FONT.sans, color: C.forest }}
            >
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
          </div>
        )}
        {(invitations ?? []).length > 0 && (
          <div className="space-y-1.5">
            {(invitations ?? []).map((inv) => (
              <div key={inv._id} className="flex items-center justify-between gap-2 rounded-lg p-2 text-xs" style={{ background: C.parchment }}>
                <div className="min-w-0">
                  <span style={{ fontFamily: FONT.sans, color: C.ink }} className="font-medium truncate">{inv.name || inv.email}</span>
                  {inv.name && <span style={{ fontFamily: FONT.sans, color: C.inkSubtle }}> · {inv.email}</span>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span style={{ fontFamily: FONT.mono, color: STATUS_COLOR[inv.status] }} className="text-[9px] uppercase tracking-wider">
                    {STATUS_LABEL[inv.status]}
                  </span>
                  {inv.status === 'pending' && (
                    <button
                      onClick={() => revoke(inv._id)}
                      disabled={revokeMutation.isPending}
                      style={{ fontFamily: FONT.sans, color: C.inkMuted }}
                      className="font-semibold"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

/** "View plan" — fetches the real fileUrl on demand (never cached
 * indefinitely, since the backend enforces who's allowed to see it fresh
 * each time) and opens it in a new tab. Only ever rendered by a caller that
 * already knows the viewer is authorized (owner/contractor/verifier/admin)
 * — matching this app's existing "only show what you can do" convention —
 * but the backend's own 403 is still the real enforcement either way. */
export function ViewPlanDocumentButton({ projectId }: { projectId: string }) {
  const fetchPlan = useFetchPlanDocumentMutation()
  const { show: showToast } = useToast()

  const open = () => {
    fetchPlan.mutate(projectId, {
      onSuccess: (doc) => window.open(doc.fileUrl, '_blank', 'noopener,noreferrer'),
      onError: (err) => showToast({ title: 'Could not open plan document', description: apiErrorMessage(err, 'Please try again'), tone: 'error' }),
    })
  }

  return (
    <button
      onClick={open}
      disabled={fetchPlan.isPending}
      className="text-xs font-semibold whitespace-nowrap"
      style={{ fontFamily: FONT.sans, color: C.forest }}
    >
      {fetchPlan.isPending ? 'Opening…' : 'View plan →'}
    </button>
  )
}
