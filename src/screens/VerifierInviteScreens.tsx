import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context'
import { C, FONT, PillButton } from '../components/MobileLayout'
import { Spinner } from '../components/AuthControls'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'
import { fetchVerifierInvitationPreview, useAcceptVerifierInvitationMutation, type VerifierInvitationPreview } from '../api/projects'
import { setPendingVerifierInvite } from '../api/pendingVerifierInvite'

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  accepted: { title: 'Already accepted', body: 'This invitation has already been accepted by someone.' },
  revoked: { title: 'Invitation revoked', body: 'The funder who sent this invitation has withdrawn it.' },
  expired: { title: 'Invitation expired', body: 'This invitation link is no longer valid. Ask the funder to send a new one.' },
}

/**
 * Public accept page for a verifier invitation link (`#/verifier-invite/:token`)
 * — mirrors ReferralScreen/pendingReferral.ts's web-only, hash-route,
 * capture-through-signup pattern exactly. Accepting here grants ONLY the
 * verifier role and creates a VerificationTask scoped to this one project;
 * it never creates a VerifierProfile and never touches the funder's own
 * account (see verifierInvitationController.acceptInvitation). Mobile's only
 * role in this flow is generating/sharing this same link — acceptance
 * itself always happens here, on web, whichever device it's opened on.
 */
export function VerifierInviteAcceptScreen() {
  const { token } = useParams<{ token: string }>()
  const nav = useNavigate()
  const { isLoggedIn } = useApp()
  const { show: showToast } = useToast()
  const [preview, setPreview] = useState<VerifierInvitationPreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const acceptMutation = useAcceptVerifierInvitationMutation()
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (!token) return
    fetchVerifierInvitationPreview(token)
      .then(setPreview)
      .catch((err) => setLoadError(apiErrorMessage(err, 'This invitation link is invalid or no longer available.')))
      .finally(() => setLoading(false))
  }, [token])

  const goToSignup = () => {
    if (token) setPendingVerifierInvite(token)
    nav(`/signup?verifierInvite=${token}`)
  }

  const goToLogin = () => {
    if (token) setPendingVerifierInvite(token)
    nav('/login')
  }

  const accept = () => {
    if (!token) return
    acceptMutation.mutate(token, {
      onSuccess: () => {
        setAccepted(true)
        showToast({ title: 'You are now the verifier for this project', tone: 'success' })
      },
      onError: (err) => showToast({ title: 'Could not accept invitation', description: apiErrorMessage(err, 'Please try again'), tone: 'error' }),
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.cream }}>
      <div className="w-full max-w-sm rounded-2xl border p-6" style={{ borderColor: C.parchmentDark, background: C.white }}>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">
          Verifier invitation
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-6 justify-center">
            <Spinner size={16} color={C.forest} />
            <span style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">Loading invitation…</span>
          </div>
        )}

        {!loading && (loadError || !preview) && (
          <div className="py-4">
            <h1 style={{ fontFamily: FONT.serif }} className="text-lg font-bold mb-2">Invitation not found</h1>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              {loadError || 'This invitation link is invalid.'}
            </p>
          </div>
        )}

        {!loading && preview && preview.status !== 'pending' && (
          <div className="py-4">
            <h1 style={{ fontFamily: FONT.serif }} className="text-lg font-bold mb-2">
              {STATUS_COPY[preview.status]?.title || 'Invitation unavailable'}
            </h1>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm">
              {STATUS_COPY[preview.status]?.body || 'This invitation can no longer be used.'}
            </p>
          </div>
        )}

        {!loading && preview && preview.status === 'pending' && !accepted && (
          <div className="py-2">
            <h1 style={{ fontFamily: FONT.serif }} className="text-lg font-bold mb-2">
              {preview.funderName || 'A funder'} invited you to verify a site location
            </h1>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-4 leading-relaxed">
              You're invited to confirm the exact location for <strong style={{ color: C.ink }}>{preview.projectTitle || 'a project'}</strong>
              {preview.locationName ? <> near <strong style={{ color: C.ink }}>{preview.locationName}</strong></> : null}.
              Accepting creates or uses your own Verifier account and gives you access only to this one project's
              location task — never to the funder's account, projects, or funds.
            </p>
            {isLoggedIn ? (
              <PillButton onClick={accept} fullWidth disabled={acceptMutation.isPending}>
                {acceptMutation.isPending ? 'Accepting…' : 'Accept and become the verifier for this project'}
              </PillButton>
            ) : (
              <div className="space-y-2">
                <PillButton onClick={goToSignup} fullWidth>Create a Verifier account</PillButton>
                <button
                  onClick={goToLogin}
                  className="w-full text-center text-xs font-semibold py-2"
                  style={{ fontFamily: FONT.sans, color: C.forest }}
                >
                  Already have an account? Sign in
                </button>
              </div>
            )}
          </div>
        )}

        {accepted && (
          <div className="py-4">
            <h1 style={{ fontFamily: FONT.serif }} className="text-lg font-bold mb-2">You're all set</h1>
            <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="text-sm mb-4">
              The verification task now appears in your Verifier dashboard.
            </p>
            <PillButton onClick={() => nav('/home')} fullWidth>Go to your dashboard</PillButton>
          </div>
        )}
      </div>
    </div>
  )
}
