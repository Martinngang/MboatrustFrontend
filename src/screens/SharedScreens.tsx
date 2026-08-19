import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context'
import { useMyKycStatusQuery, type KycStatus } from '../api/kyc'
import { useMyRoleTypesQuery, useUploadAvatarMutation } from '../api/session'
import { useTheme } from '../theme'
import { C, FONT, AppShell, Card, Header, PillButton, StatusBadge, MomoOmPicker } from '../components/MobileLayout'
import { useMySubscriptionsQuery, useCreateSubscriptionMutation, useCancelSubscriptionMutation, PLAN_PRICES, type PlanType } from '../api/subscriptions'
import { Switch } from '../components/Switch'
import { firebaseConfigured } from '../firebase'
import {
  getCurrentFirebaseUser, getLinkedProviderIds, linkGoogleToCurrentUser, linkEmailPasswordToCurrentUser,
} from '../api/firebaseAuth'
import { friendlyAuthError, isCredentialInUseError } from '../api/authErrors'
import { api, apiErrorMessage } from '../api/client'
import { useToast } from '../components/Toast'
import { PasswordField, TextField, InlineAlert, Spinner } from '../components/AuthControls'
import { useNotificationsDrawer } from '../components/NotificationsDrawer'
import { AppIcon, GoogleGlyph, type IconName } from '../components/icons'
import { useSetDeviceTokenMutation, requestPushToken, isPushAvailable } from '../api/push'

// ── Design language ────────────────────────────────────────────────────────
// Mboa Trust already speaks a distinctive dialect — parchment paper, forest
// ink, a wax seal for verification, gold for milestones. This pass leans
// into that "trust deed" identity rather than replacing it: every card reads
// like a page in a ledger, every verification reads like an official stamp,
// and the one recurring signature motif is the seal — used consistently for
// anything the platform is vouching for (identity, security, membership).

// A small hand-drawn glyph set in the same thin-stroke language as the
// existing chevron (1.3–1.4 stroke), so new icons never look bolted on.
type GlyphName =
  | 'globe' | 'wallet' | 'swap' | 'shield' | 'fingerprint' | 'bell' | 'sliders'
  | 'lifebuoy' | 'headset' | 'scroll' | 'fileText' | 'monitor' | 'download'
  | 'trash' | 'doorExit' | 'coin' | 'chat' | 'gift' | 'sparkles' | 'star' | 'calendar'

function Glyph({ name, size = 17, color = 'currentColor' }: { name: GlyphName; size?: number; color?: string }) {
  const s = { width: size, height: size }
  const p = { stroke: color, fill: 'none', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'globe': return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" {...p} /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" {...p} /></svg>
    case 'wallet': return <svg viewBox="0 0 24 24" {...s}><rect x="3" y="6" width="18" height="13" rx="2.5" {...p} /><path d="M3 10h18" {...p} /><circle cx="16.5" cy="14" r="1.1" fill={color} /></svg>
    case 'swap': return <svg viewBox="0 0 24 24" {...s}><path d="M6 8h13M16 5l3 3-3 3M18 16H5M8 13l-3 3 3 3" {...p} /></svg>
    case 'shield': return <svg viewBox="0 0 24 24" {...s}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" {...p} /><path d="M9 12l2 2 4-4.5" {...p} /></svg>
    case 'fingerprint': return <svg viewBox="0 0 24 24" {...s}><path d="M12 3a7 7 0 0 0-7 7v2a11 11 0 0 0 3 7.5M12 3a7 7 0 0 1 7 7v3M12 7a5 5 0 0 0-5 5v1a9 9 0 0 0 2.5 6.2M12 7a5 5 0 0 1 5 5v2M12 11a2.5 2.5 0 0 0-2.5 2.5c0 3 1 5.5 3 7.5M12 11a2.5 2.5 0 0 1 2.5 2.5v1.5" {...p} strokeWidth={1.3} /></svg>
    case 'bell': return <svg viewBox="0 0 24 24" {...s}><path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" {...p} /><path d="M10 19a2 2 0 0 0 4 0" {...p} /></svg>
    case 'sliders': return <svg viewBox="0 0 24 24" {...s}><path d="M4 6h9M17 6h3M4 12h3M9 12h11M4 18h13M19 18h1" {...p} /><circle cx="13" cy="6" r="2" {...p} /><circle cx="7" cy="12" r="2" {...p} /><circle cx="17" cy="18" r="2" {...p} /></svg>
    case 'lifebuoy': return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" {...p} /><circle cx="12" cy="12" r="4" {...p} /><path d="M5.6 5.6l3.2 3.2M18.4 5.6l-3.2 3.2M5.6 18.4l3.2-3.2M18.4 18.4l-3.2-3.2" {...p} /></svg>
    case 'headset': return <svg viewBox="0 0 24 24" {...s}><path d="M4 13v-1a8 8 0 0 1 16 0v1" {...p} /><rect x="3" y="13" width="4" height="6" rx="1.5" {...p} /><rect x="17" y="13" width="4" height="6" rx="1.5" {...p} /><path d="M19 19v1a3 3 0 0 1-3 3h-2" {...p} /></svg>
    case 'scroll': return <svg viewBox="0 0 24 24" {...s}><path d="M7 4h10v13a3 3 0 0 1-3 3H7" {...p} /><path d="M7 20a3 3 0 0 1-3-3V7a2 2 0 0 1 2-2" {...p} /><path d="M9 8h6M9 11h6" {...p} /></svg>
    case 'fileText': return <svg viewBox="0 0 24 24" {...s}><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" {...p} /><path d="M9 12h6M9 15.5h6" {...p} /></svg>
    case 'monitor': return <svg viewBox="0 0 24 24" {...s}><rect x="3" y="4" width="18" height="12" rx="1.5" {...p} /><path d="M8 20h8M12 16v4" {...p} /></svg>
    case 'download': return <svg viewBox="0 0 24 24" {...s}><path d="M12 3v12m0 0 4-4m-4 4-4-4" {...p} /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" {...p} /></svg>
    case 'trash': return <svg viewBox="0 0 24 24" {...s}><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" {...p} /></svg>
    case 'doorExit': return <svg viewBox="0 0 24 24" {...s}><path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" {...p} /><path d="M14 8l4 4-4 4M9 12h9" {...p} /></svg>
    case 'coin': return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" {...p} /><path d="M12 7v10M9 9.5c0-1 1-1.8 3-1.8s3 .8 3 1.8-1 1.5-3 1.8-3 .8-3 1.9 1 1.8 3 1.8 3-.8 3-1.8" {...p} strokeWidth={1.3} /></svg>
    case 'chat': return <svg viewBox="0 0 24 24" {...s}><path d="M4 5h16v11H8l-4 4V5Z" {...p} /></svg>
    case 'gift': return <svg viewBox="0 0 24 24" {...s}><rect x="3" y="9" width="18" height="4" rx="1" {...p} /><path d="M5 13h14v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7ZM12 9V21M12 9c-2-3-6-3-6-.5S9 9 12 9Zm0 0c2-3 6-3 6-.5S15 9 12 9Z" {...p} strokeWidth={1.3} /></svg>
    case 'sparkles': return <svg viewBox="0 0 24 24" {...s}><path d="M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3ZM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" fill={color} /></svg>
    case 'star': return <svg viewBox="0 0 24 24" {...s}><path d="M12 3.5l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.9l6.1-.8L12 3.5Z" {...p} strokeLinejoin="round" /></svg>
    case 'calendar': return <svg viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="16" rx="2" {...p} /><path d="M3 10h18M8 3v4M16 3v4" {...p} /></svg>
  }
}

// A single circular wax-seal stamp — the one recurring signature element,
// used everywhere the platform is formally vouching for something.
function Seal({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill={C.seal} />
      <circle cx="12" cy="12" r="9.4" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" strokeDasharray="1.4 2.1" />
      <path d="M7.2 12.3l3 3L17 8.6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Slim circular progress — used for the security score and the trust ring
// wrapped around the avatar. Deliberately restrained: one accent stroke,
// no gradient, no glow.
function ProgressRing({
  value, size = 56, stroke = 4, color = C.forest, track = C.parchmentDark, children,
}: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}

// ── Shared grouped-links list ─────────────────────────────────────────────────
// One visual pattern for every "list of destinations" block — used by both
// Settings (pure preferences) and the Menu hub (everything else), so the two
// screens read as one consistent system instead of two different UIs.
// Now icon-led with an optional "danger" tone for irreversible actions.
function GroupedLinks({ title, items, dashed, tone = 'default' }: {
  title: string
  items: { label: string; sub?: string; action: () => void; right?: ReactNode; icon?: GlyphName }[]
  dashed?: boolean
  tone?: 'default' | 'danger'
}) {
  const isDanger = tone === 'danger'
  return (
    <div>
      {title && <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">{title}</div>}
      <div
        className={`rounded-2xl border overflow-hidden ${dashed ? 'border-dashed' : ''}`}
        style={{ borderColor: isDanger ? 'var(--status-error-bg)' : C.parchmentDark, boxShadow: dashed ? 'none' : C.shadowSm }}
      >
        {items.map(({ label, sub, action, right, icon }, i) => (
          // A <div role="button"> rather than a real <button> — `right` may
          // itself be an interactive control (e.g. Switch, which renders its
          // own <button>), and a <button> can't legally contain one.
          <div
            key={label}
            role="button"
            tabIndex={0}
            onClick={action}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action() } }}
            className="group w-full flex items-center justify-between gap-3 px-4 py-4 text-left cursor-pointer transition-colors"
            style={{
              borderBottom: i < items.length - 1 ? `1px solid ${isDanger ? 'var(--status-error-bg)' : C.parchmentDark}` : 'none',
              background: C.white,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = isDanger ? 'var(--status-error-bg)' : C.parchment }}
            onMouseLeave={(e) => { e.currentTarget.style.background = C.white }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <span
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-active:scale-90"
                  style={{ background: isDanger ? 'var(--status-error-bg)' : C.parchment, color: isDanger ? 'var(--status-error-text)' : C.forest }}
                >
                  <Glyph name={icon} size={16} />
                </span>
              )}
              <div className="min-w-0">
                <div style={{ fontFamily: FONT.sans, color: isDanger ? 'var(--status-error-text)' : C.ink }} className="text-sm font-medium">{label}</div>
                {sub && <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">{sub}</div>}
              </div>
            </div>
            {right ?? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 transition-transform group-hover:translate-x-0.5">
                <path d="M4 3L9 7L4 11" stroke={isDanger ? 'var(--status-error-text)' : C.inkSubtle} strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Connected sign-in methods (account linking) ───────────────────────────────
// Reads the client-side Firebase truth (currentUser.providerData) rather
// than the backend's authProviders list — it updates the instant a link
// succeeds, no round-trip needed. The backend gets a best-effort sync call
// right after linking; middleware/auth.js also picks up the change
// automatically on the next authenticated request either way.
const PROVIDER_META: Record<string, { label: string; icon: ReactNode }> = {
  'google.com': { label: 'Google', icon: <GoogleGlyph size={17} /> },
  password: { label: 'Email & password', icon: <span style={{ color: C.forest }}><AppIcon name="mail" size={17} /></span> },
  phone: { label: 'Phone number', icon: <span style={{ color: C.forest }}><AppIcon name="phone" size={17} /></span> },
}

function SignInMethodsCard() {
  const { show: showToast } = useToast()
  const [linked, setLinked] = useState<string[]>(() => getLinkedProviderIds())
  const [linkingGoogle, setLinkingGoogle] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)

  const syncProvider = (provider: 'google' | 'email', providerId: string) => {
    api.post('/users/me/auth-providers', { provider, providerId }).catch(() => {})
  }

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true)
    try {
      const user = await linkGoogleToCurrentUser()
      const googleData = user.providerData.find((p) => p.providerId === 'google.com')
      if (googleData) syncProvider('google', googleData.uid)
      setLinked(getLinkedProviderIds())
      showToast({ title: 'Google connected', description: 'You can now sign in with Google too.', tone: 'success' })
    } catch (err) {
      const desc = isCredentialInUseError(err)
        ? 'That Google account is already linked to a different Mboa Trust account.'
        : friendlyAuthError(err)
      showToast({ title: 'Could not connect Google', description: desc, tone: 'error' })
    } finally {
      setLinkingGoogle(false)
    }
  }

  if (!firebaseConfigured) return null

  const linkedCount = linked.length

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Sign-in methods</div>
        <div style={{ fontFamily: FONT.mono, color: linkedCount >= 2 ? C.forest : C.amber }} className="text-[10px] uppercase tracking-widest">{linkedCount} of 3 linked</div>
      </div>
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: C.parchmentDark, boxShadow: C.shadowSm, background: C.white }}>
        {(['google.com', 'password', 'phone'] as const).map((key, i, arr) => {
          const meta = PROVIDER_META[key]
          const isLinked = linked.includes(key)
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 px-4 py-4"
              style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.parchmentDark}` : 'none' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ background: C.parchment }}>{meta.icon}</span>
                <div className="min-w-0">
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">{meta.label}</div>
                  <div style={{ fontFamily: FONT.mono, color: isLinked ? C.forest : C.inkSubtle }} className="text-[10px] mt-0.5 uppercase tracking-wide flex items-center gap-1">
                    {isLinked && <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: C.forest }} />}
                    {isLinked ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>
              {!isLinked && key === 'google.com' && (
                <button
                  onClick={handleLinkGoogle}
                  disabled={linkingGoogle}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all disabled:opacity-60 active:scale-95"
                  style={{ borderColor: C.parchmentDark, color: C.forest, fontFamily: FONT.sans }}
                >
                  {linkingGoogle && <Spinner size={12} color={C.forest} />}
                  {linkingGoogle ? 'Connecting…' : 'Link'}
                </button>
              )}
              {!isLinked && key === 'password' && !showEmailForm && (
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="flex-shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-all active:scale-95"
                  style={{ borderColor: C.parchmentDark, color: C.forest, fontFamily: FONT.sans }}
                >
                  Set password
                </button>
              )}
            </div>
          )
        })}
        {!linked.includes('password') && showEmailForm && (
          <LinkEmailPasswordForm
            onDone={(providerId) => { syncProvider('email', providerId); setLinked(getLinkedProviderIds()); setShowEmailForm(false) }}
            onCancel={() => setShowEmailForm(false)}
          />
        )}
      </div>
    </div>
  )
}

function LinkEmailPasswordForm({ onDone, onCancel }: { onDone: (providerId: string) => void; onCancel: () => void }) {
  const { show: showToast } = useToast()
  const [email, setEmail] = useState(getCurrentFirebaseUser()?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setSaving(true)
    try {
      const user = await linkEmailPasswordToCurrentUser(email, password)
      onDone(user.uid)
      showToast({ title: 'Password set', description: 'You can now sign in with email & password too.', tone: 'success' })
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 py-4 space-y-3" style={{ borderTop: `1px solid ${C.parchmentDark}`, background: C.parchment }}>
      {error && <InlineAlert>{error}</InlineAlert>}
      <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <PasswordField label="New password" value={password} onChange={setPassword} placeholder="At least 6 characters" autoComplete="new-password" />
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-xl border py-2.5 text-sm font-semibold" style={{ borderColor: C.parchmentDark, color: C.inkMuted, fontFamily: FONT.sans }}>Cancel</button>
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
          style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
        >
          {saving && <Spinner size={14} color={C.white} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Sessions ───────────────────────────────────────────────────────────────
// This platform never records a per-device session list, so there's nothing
// real to enumerate — a fabricated "Chrome on Windows, 2 days ago" row would
// just be a lie with a UI around it. What Firebase actually gives us is a
// single real action: invalidate every refresh token issued to this account,
// forcing every other signed-in device to re-authenticate.
function TrustedDevicesCard() {
  const { show: showToast } = useToast()
  const [revoking, setRevoking] = useState(false)

  const revokeAll = async () => {
    setRevoking(true)
    try {
      const { data } = await api.post<{ data: { revoked: boolean } }>('/users/me/sessions/revoke', {})
      showToast({
        title: data.data.revoked ? 'Signed out everywhere else' : 'Nothing to revoke',
        description: data.data.revoked ? 'Every other device must sign in again.' : 'No other active session was found for this account.',
        tone: data.data.revoked ? 'success' : 'info',
      })
    } catch (err) {
      showToast({ title: 'Could not sign out other devices', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div>
      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Sessions</div>
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: C.parchmentDark, boxShadow: C.shadowSm, background: C.white }}>
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: C.parchment, color: C.forest }}>
              <Glyph name="monitor" size={16} />
            </span>
            <div className="min-w-0">
              <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium truncate">Sign out of all other devices</div>
              <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5 truncate">Keeps this device signed in, ends every other session</div>
            </div>
          </div>
          <button onClick={revokeAll} disabled={revoking} className="flex-shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold active:scale-95 disabled:opacity-50" style={{ borderColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontFamily: FONT.sans }}>
            {revoking ? '…' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Notifications now live in the NotificationsDrawer overlay (see
// components/NotificationsDrawer.tsx) — a right-anchored sliding panel
// opened from the bell icon, not a routed page — so the existing left
// Sidebar/TopBar chrome stays visible and in place behind it.

// ── Settings layout scaffolding ───────────────────────────────────────────
// Nine blocks (Appearance, Account, Sign-in methods, Security, Notifications,
// Trusted devices, Privacy, Support, Danger zone) is too many peer-level
// cards to scan as a flat list once you're past a phone screen. They're
// grouped into four honest clusters — what they're each actually about, not
// an arbitrary split — plus Danger zone kept structurally separate, the way
// a real settings page (a bank's, not a to-do app's) would never let
// "delete account" share a shelf with "dark mode".
//
// On desktop this becomes a two-pane settings page: a sticky cluster nav on
// the left (the pattern of every serious settings surface — Stripe, Linear,
// GitHub) with scroll-spy highlighting, a single readable column on the
// right. On mobile the nav disappears and clusters simply stack in the same
// order, headed by the same labels.
type ClusterId = 'general' | 'security' | 'notifications' | 'support'
const CLUSTER_NAV: { id: ClusterId; label: string; desc: string }[] = [
  { id: 'general', label: 'General', desc: 'Appearance & account' },
  { id: 'security', label: 'Security & access', desc: 'Sign-in, PIN, devices' },
  { id: 'notifications', label: 'Notifications & privacy', desc: 'Alerts & your data' },
  { id: 'support', label: 'Support', desc: 'Help & contact' },
]

function ClusterHeading({ label, description }: { label: string; description: string }) {
  return (
    <div>
      <h2 style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">{label}</h2>
      <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs mt-1 max-w-md leading-relaxed">{description}</p>
    </div>
  )
}

// ── Settings — true preferences only ──────────────────────────────────────────
// Appearance, account basics, security, and notification toggles. Everything
// that isn't a personal preference (messaging, community, tools, staff
// features) lives in the Menu hub (ProfileScreen) instead of here.
export function SettingsScreen() {
  const nav = useNavigate()
  const { lang, logout, name, avatarUrl } = useApp()
  const { data: kycStatus = 'unverified' } = useMyKycStatusQuery()
  const kycLabel: Record<KycStatus, string> = { unverified: 'Not verified', pending: 'Under review', verified: 'Verified', rejected: 'Rejected — action needed' }
  const { theme, toggleTheme } = useTheme()
  const { show: showPushToast } = useToast()
  const setDeviceToken = useSetDeviceTokenMutation()
  // Reflects the browser's actual permission state on load rather than
  // defaulting to "on" — the old version always showed the switch enabled
  // regardless of whether push had ever actually been granted, and toggling
  // it did nothing beyond flipping local component state (reset on every
  // reload, never touched the backend's fcmDeviceToken, so notificationService
  // could never actually deliver a push either way).
  const [notifOn, setNotifOn] = useState(() => isPushAvailable() && Notification.permission === 'granted')
  const [pushBusy, setPushBusy] = useState(false)
  const togglePush = async () => {
    if (pushBusy) return
    setPushBusy(true)
    try {
      if (notifOn) {
        await setDeviceToken.mutateAsync(null)
        setNotifOn(false)
        return
      }
      const token = await requestPushToken()
      if (!token) {
        showPushToast({
          title: 'Could not enable push notifications',
          description: Notification.permission === 'denied'
            ? 'Notifications are blocked for this site in your browser settings.'
            : 'Please try again.',
          tone: 'error',
        })
        return
      }
      await setDeviceToken.mutateAsync(token)
      setNotifOn(true)
    } catch (err) {
      showPushToast({ title: 'Could not update push notifications', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setPushBusy(false)
    }
  }
  const [biometric, setBiometric] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { show: showToast } = useToast()

  // A quiet, honest security score — not a growth-hack meter, just a
  // reflection of the two things that actually protect this account.
  const securityScore = (kycStatus === 'verified' ? 60 : kycStatus === 'pending' ? 25 : 0) + (biometric ? 40 : 0)
  const scoreColor = securityScore >= 80 ? C.forest : securityScore >= 40 ? C.amber : 'var(--status-error-text)'

  // A real, immediate download of everything this account owns — not a
  // fire-and-forget request promising an email that nothing ever sends.
  const requestDataExport = async () => {
    setExporting(true)
    try {
      const { data } = await api.get('/users/me/export')
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mboatrust-data-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast({ title: 'Export downloaded', tone: 'success' })
    } catch (err) {
      showToast({ title: 'Export failed', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const appearanceItems = [
    {
      label: 'Dark mode',
      sub: theme === 'dark' ? 'On' : 'Off',
      action: toggleTheme,
      icon: 'sliders' as GlyphName,
      right: <Switch checked={theme === 'dark'} onChange={() => toggleTheme()} ariaLabel="Dark mode" />,
    },
  ]
  const accountItems = [
    { label: 'Language', sub: lang === 'en' ? 'English' : 'Français', action: () => nav('/language'), icon: 'globe' as GlyphName },
    { label: 'Linked MoMo account', sub: '+237 677 234 891 · MTN', action: () => {}, icon: 'wallet' as GlyphName },
    { label: 'Linked Orange Money', sub: 'Not connected', action: () => {}, icon: 'wallet' as GlyphName },
    { label: 'Switch role', sub: 'Change your primary role', action: () => nav('/role'), icon: 'swap' as GlyphName },
  ]
  const securityItems = [
    { label: 'Change PIN', sub: 'Update your 4-digit transaction PIN', action: () => {}, icon: 'shield' as GlyphName },
    {
      label: 'Biometric login',
      sub: 'Face ID / fingerprint',
      action: () => setBiometric(!biometric),
      icon: 'fingerprint' as GlyphName,
      right: <Switch checked={biometric} onChange={setBiometric} ariaLabel="Biometric login" />,
    },
    { label: 'ID verification (KYC/AML)', sub: `Status: ${kycLabel[kycStatus]}`, action: () => nav('/compliance/kyc'), icon: 'shield' as GlyphName },
  ]
  const notificationItems = [
    isPushAvailable()
      ? {
          label: 'Push notifications',
          sub: pushBusy ? 'Updating…' : 'Milestone updates, bids, approvals',
          action: togglePush,
          icon: 'bell' as GlyphName,
          right: <Switch checked={notifOn} onChange={togglePush} disabled={pushBusy} ariaLabel="Push notifications" />,
        }
      : { label: 'Push notifications', sub: 'Not supported in this browser', action: () => {}, icon: 'bell' as GlyphName },
    { label: 'Notification preferences', sub: 'Granular control per notification type', action: () => nav('/shared/notifications/preferences'), icon: 'sliders' as GlyphName },
  ]
  const privacyItems = [
    { label: 'Download your data', sub: exporting ? 'Preparing export…' : 'Export a copy of your account & history', action: requestDataExport, icon: 'download' as GlyphName },
    { label: 'Privacy policy', action: () => {}, icon: 'scroll' as GlyphName },
    { label: 'Terms of service', action: () => {}, icon: 'fileText' as GlyphName },
  ]
  const supportItems = [
    { label: 'How Mboa Trust works', sub: 'Walkthrough & FAQ', action: () => nav('/shared/help'), icon: 'lifebuoy' as GlyphName },
    { label: 'Contact support', sub: 'support@mboatrust.cm', action: () => {}, icon: 'headset' as GlyphName },
  ]

  // Scroll-spy: highlights the cluster currently in view so the sidebar
  // nav on desktop always reflects where you actually are, not just where
  // you last clicked.
  const [activeCluster, setActiveCluster] = useState<ClusterId>('general')
  const clusterRefs = useRef<Partial<Record<ClusterId, HTMLElement | null>>>({})
  const dangerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-cluster') as ClusterId | null
            if (id) setActiveCluster(id)
          }
        })
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 }
    )
    Object.values(clusterRefs.current).forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const scrollToCluster = (id: ClusterId) => clusterRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const scrollToDanger = () => dangerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const AccountSnapshot = () => (
    <div className="rounded-2xl border p-5 flex items-center gap-4" style={{ borderColor: C.parchmentDark, boxShadow: C.shadowSm, background: C.white }}>
      <ProgressRing value={securityScore} size={64} stroke={4} color={scoreColor}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden text-white text-base font-bold" style={{ background: C.forest, fontFamily: FONT.serif }}>
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : (name ? name[0] : 'M')}
        </div>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-base font-bold truncate">{name || 'Marie-Claire N.'}</div>
        <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-wide mt-0.5">Security score</div>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: C.parchmentDark, maxWidth: 140 }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${securityScore}%`, background: scoreColor }} />
          </div>
          <span style={{ fontFamily: FONT.mono, color: C.ink }} className="text-[10px] font-semibold">{securityScore}%</span>
        </div>
      </div>
    </div>
  )

  return (
    <AppShell>
      <Header title="Settings" back />

      <div className="pb-8 sm:mx-auto sm:max-w-5xl sm:px-6 sm:pt-6 sm:flex sm:items-start sm:gap-10">
        {/* ── Desktop sidebar: identity + cluster nav, sticky while the
            content column scrolls past it. Hidden below sm. ── */}
        <aside className="hidden sm:block sm:w-56 sm:flex-shrink-0 sm:sticky sm:top-6 sm:self-start space-y-6">
          <AccountSnapshot />
          <nav className="space-y-1">
            {CLUSTER_NAV.map((c) => (
              <button
                key={c.id}
                onClick={() => scrollToCluster(c.id)}
                className="w-full text-left rounded-xl px-3 py-2.5 flex items-start gap-2.5 transition-colors"
                style={{ background: activeCluster === c.id ? C.parchment : 'transparent' }}
              >
                <span className="w-1 rounded-full flex-shrink-0 mt-0.5" style={{ height: 28, background: activeCluster === c.id ? C.navActive : 'transparent' }} />
                <span className="min-w-0">
                  <span style={{ fontFamily: FONT.sans, color: activeCluster === c.id ? C.navActive : C.ink }} className="block text-sm font-semibold">{c.label}</span>
                  <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="block text-[10px] mt-0.5">{c.desc}</span>
                </span>
              </button>
            ))}
          </nav>
          <div className="pt-4" style={{ borderTop: `1px solid ${C.parchmentDark}` }}>
            <button
              onClick={scrollToDanger}
              className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-2.5 transition-colors"
              style={{ color: 'var(--status-error-text)' }}
            >
              <Glyph name="trash" size={14} />
              <span style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">Danger zone</span>
            </button>
          </div>
        </aside>

        {/* ── Content column ── */}
        <div className="flex-1 min-w-0 px-5 sm:px-0">
          {/* Mobile-only snapshot — the desktop version lives in the sidebar above */}
          <div className="sm:hidden pt-6 mb-8">
            <AccountSnapshot />
          </div>

          <div className="space-y-12 sm:space-y-14 max-w-xl">
            <section
              ref={(el) => { clusterRefs.current.general = el }}
              data-cluster="general"
              className="space-y-6 scroll-mt-24"
            >
              <ClusterHeading label="General" description="How Mboa Trust looks and feels for you." />
              <GroupedLinks title="Appearance" items={appearanceItems} />
              <GroupedLinks title="Account" items={accountItems} />
              <SignInMethodsCard />
            </section>

            <section
              ref={(el) => { clusterRefs.current.security = el }}
              data-cluster="security"
              className="space-y-6 scroll-mt-24"
            >
              <ClusterHeading label="Security & access" description="Everything protecting your money and your identity." />
              <GroupedLinks title="Security" items={securityItems} />
              <TrustedDevicesCard />
            </section>

            <section
              ref={(el) => { clusterRefs.current.notifications = el }}
              data-cluster="notifications"
              className="space-y-6 scroll-mt-24"
            >
              <ClusterHeading label="Notifications & privacy" description="Control what reaches you, and who can reach your data." />
              <GroupedLinks title="Notifications" items={notificationItems} />
              <GroupedLinks title="Privacy" items={privacyItems} />
            </section>

            <section
              ref={(el) => { clusterRefs.current.support = el }}
              data-cluster="support"
              className="space-y-6 scroll-mt-24"
            >
              <ClusterHeading label="Support" description="Answers first, then a real person." />
              <GroupedLinks title="Support" items={supportItems} />
            </section>

            {/* Danger zone — structurally its own region, not a cluster in
                the nav rotation, reached only via the sidebar's separated
                red link (or by scrolling) so it's never one accidental tap
                away from "dark mode". */}
            <section ref={(el) => { dangerRef.current = el }} className="space-y-4 scroll-mt-24">
              <GroupedLinks
                title="Danger zone"
                tone="danger"
                items={[
                  {
                    label: signingOut ? 'Signing out…' : 'Sign out',
                    sub: 'End your session on this device',
                    icon: 'doorExit',
                    action: async () => { if (signingOut) return; setSigningOut(true); await logout(); nav('/', { replace: true }) },
                  },
                  { label: 'Delete account', sub: 'Deactivate, or permanently delete everything', icon: 'trash', action: () => nav('/shared/settings/delete-account') },
                ]}
              />
            </section>

            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="flex items-center gap-2 text-[10px]">
              <Seal size={14} />
              Mboa Trust v1.0.0 · Yaoundé / Brussels / Toronto
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

// ── Delete account ─────────────────────────────────────────────────────────
// Two real, distinct backend actions, not one button with soft copy:
// - Deactivate (PATCH /users/me/deactivate): reversible-by-an-admin soft
//   flip. Nothing is erased — projects, bids, escrow, and contract history
//   stay exactly as they are, since other people still have real business
//   tied to them (funders, contractors, counterparties).
// - Delete everything (DELETE /users/me): a genuine, irreversible hard
//   delete. Everything solely owned/authored by this account is actually
//   removed; the few places their identity appears inside someone ELSE's
//   record (an accepted bid's contract, an escrow payout, a shared
//   conversation) are detached rather than deleted, so this account
//   disappearing can't corrupt a different real user's project or
//   financial history (see userDeletionService.hardDeleteUser on the
//   backend for the exact, documented scope).
type DeleteOption = 'deactivate' | 'delete'

export function DeleteAccountScreen() {
  const nav = useNavigate()
  const { logout } = useApp()
  const { show: showToast } = useToast()
  const [option, setOption] = useState<DeleteOption>('deactivate')
  const [understood, setUnderstood] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)

  const canSubmit = option === 'deactivate' ? understood : understood && confirmText.trim() === 'DELETE'

  const submit = async () => {
    if (!canSubmit || busy) return
    setBusy(true)
    try {
      if (option === 'deactivate') {
        await api.patch('/users/me/deactivate')
      } else {
        await api.delete('/users/me', { data: { confirm: 'DELETE' } })
      }
      await logout()
      nav('/', { replace: true })
    } catch (err) {
      showToast({
        title: option === 'deactivate' ? 'Could not deactivate your account' : 'Could not delete your account',
        description: apiErrorMessage(err, 'Please try again'),
        tone: 'error',
      })
      setBusy(false)
    }
  }

  return (
    <AppShell noNav>
      <Header title="Delete Account" back tone="dark" background="var(--status-error-bg)" />

      <div className="px-5 py-6 space-y-5 sm:mx-auto sm:max-w-md">
        <div className="grid grid-cols-2 gap-2">
          {(['deactivate', 'delete'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => { setOption(opt); setUnderstood(false); setConfirmText('') }}
              className="rounded-xl border p-3 text-left transition-colors"
              style={{
                borderColor: option === opt ? 'var(--status-error-text)' : C.parchmentDark,
                background: option === opt ? 'var(--status-error-bg)' : C.white,
              }}
            >
              <div style={{ fontFamily: FONT.sans, color: option === opt ? 'var(--status-error-text)' : C.ink }} className="text-sm font-semibold">
                {opt === 'deactivate' ? 'Deactivate' : 'Delete everything'}
              </div>
              <div style={{ fontFamily: FONT.mono, color: option === opt ? 'var(--status-error-text)' : C.inkSubtle }} className="text-[10px] uppercase tracking-wider mt-0.5">
                {opt === 'deactivate' ? 'Reversible by an admin' : 'Permanent — cannot be undone'}
              </div>
            </button>
          ))}
        </div>

        {option === 'deactivate' ? (
          <div className="rounded-2xl border p-5 space-y-3" style={{ borderColor: 'var(--status-error-bg)', background: 'var(--status-error-bg)' }}>
            <div className="flex items-center gap-2">
              <Glyph name="trash" size={18} color="var(--status-error-text)" />
              <div style={{ fontFamily: FONT.serif, color: 'var(--status-error-text)' }} className="text-base font-bold">This will deactivate your account</div>
            </div>
            <ul className="space-y-2 text-sm" style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }}>
              <li>• You'll be signed out on this device and every other device immediately.</li>
              <li>• You won't be able to sign back in unless an admin reactivates your account.</li>
              <li>• Your projects, bids, escrow, and contract history stay in the platform's records — other people still have real business tied to them (funders, contractors, counterparties) — so this isn't an erasure of that shared history.</li>
              <li>• You can download a full copy of your own data first from Settings → Download your data.</li>
            </ul>
          </div>
        ) : (
          <div className="rounded-2xl border p-5 space-y-3" style={{ borderColor: 'var(--status-error-bg)', background: 'var(--status-error-bg)' }}>
            <div className="flex items-center gap-2">
              <Glyph name="trash" size={18} color="var(--status-error-text)" />
              <div style={{ fontFamily: FONT.serif, color: 'var(--status-error-text)' }} className="text-base font-bold">This will permanently delete your account</div>
            </div>
            <ul className="space-y-2 text-sm" style={{ fontFamily: FONT.sans, color: 'var(--status-error-text)' }}>
              <li>• This cannot be undone — there is no admin recovery path for this option, unlike deactivating.</li>
              <li>• Everything solely yours is actually erased: your profile, listings, offers, bids, ratings, messages, notifications, and every project you own (with its own escrow, contract, and dispute history).</li>
              <li>• Records shared with someone else — an escrow payout, an accepted bid's contract — are kept intact for their sake (only your identity is removed from them), so this can't corrupt another real person's project or payment history.</li>
              <li>• You can download a full copy of your own data first from Settings → Download your data.</li>
            </ul>
          </div>
        )}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0"
          />
          <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm">
            {option === 'deactivate'
              ? "I understand this will sign me out everywhere and I won't be able to sign back in myself."
              : 'I understand this permanently deletes my account and data, and cannot be undone.'}
          </span>
        </label>

        {option === 'delete' && (
          <div>
            <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="block text-[10px] uppercase tracking-widest mb-2">
              Type DELETE to confirm
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
              style={{ borderColor: C.parchmentDark, fontFamily: FONT.mono, color: C.ink }}
            />
          </div>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit || busy}
          className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--status-error-text)', color: '#fff', fontFamily: FONT.sans }}
        >
          {busy
            ? (option === 'deactivate' ? 'Deactivating…' : 'Deleting…')
            : (option === 'deactivate' ? 'Deactivate my account' : 'Permanently delete my account')}
        </button>
        <button
          onClick={() => nav(-1)}
          className="w-full rounded-xl border py-3 text-sm font-semibold"
          style={{ borderColor: C.parchmentDark, color: C.inkMuted, fontFamily: FONT.sans }}
        >
          Cancel
        </button>
      </div>
    </AppShell>
  )
}

// ── Help / Walkthrough ────────────────────────────────────────────────────────
const SLIDES: { icon: IconName; title: string; body: string; color: string }[] = [
  {
    icon: 'lock',
    title: 'Your money is always protected',
    body: 'When you fund a project or hire a contractor, your money goes into a secure escrow account — not to the recipient. It stays there until work is independently verified.',
    color: C.forest,
  },
  {
    icon: 'camera',
    title: 'Proof before payment',
    body: "Recipients and contractors submit photo, video, and GPS evidence for each milestone. Our on-ground verifiers check the evidence at the project site before anyone can approve a release.",
    color: C.steel,
  },
  {
    icon: 'checkCircle',
    title: 'You approve, then funds release',
    body: "Once a milestone is verified, you review the evidence and decide. If you approve, the milestone payment is released from escrow. If something is wrong, you raise a dispute — and funds stay frozen.",
    color: C.moss,
  },
  {
    icon: 'hardHat',
    title: 'Find verified contractors',
    body: 'Every contractor on the platform has been ID-verified and reviewed. Post a job, receive bids, compare prices and ratings, and award the contract — all in one place.',
    color: C.emeraldDark,
  },
  {
    icon: 'home',
    title: 'Safe land investment',
    body: 'Browse land listings with verified ownership documents, dispute-free certificates, and site inspection reports. No funds move until documents are confirmed clean.',
    color: C.gold,
  },
]

export function HelpScreen() {
  const nav = useNavigate()
  const [slide, setSlide] = useState(0)
  const s = SLIDES[slide]

  return (
    <AppShell noNav>
      <style>{`
        @keyframes mbt-slide-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .mbt-slide-anim { animation: mbt-slide-in 0.35s ease both; }
        @media (prefers-reduced-motion: reduce) { .mbt-slide-anim { animation: none; } }
      `}</style>
      <div className="flex flex-col h-full">
        <Header
          title="How it works"
          back
          action={<button onClick={() => nav('/home')} style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">Skip</button>}
        />

        {/* Progress — a thin ledger-style tick rule reads more like "record
            of where you are" than a generic loading bar. */}
        <div className="flex gap-1 px-6 pt-3 sm:mx-auto sm:max-w-xl sm:w-full" style={{ background: s.color }}>
          {SLIDES.map((_, i) => (
            <div key={i} className="h-[3px] flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.22)' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: i <= slide ? '100%' : '0%', background: C.amber }} />
            </div>
          ))}
        </div>

        {/* Slide */}
        <div className="flex-1 flex flex-col px-6 py-8 sm:mx-auto sm:max-w-xl sm:justify-center" style={{ background: s.color }}>
          <div key={slide} className="mbt-slide-anim">
            <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.55)' }} className="text-[10px] uppercase tracking-widest text-center mb-6">
              Step {slide + 1} of {SLIDES.length}
            </div>
            <div className="flex justify-center mb-10">
              <div className="flex h-20 w-20 items-center justify-center rounded-[28px]" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff' }}>
                <AppIcon name={s.icon} size={40} strokeWidth={1.5} />
              </div>
            </div>
            <h2 style={{ fontFamily: FONT.serif }} className="text-2xl font-bold text-white text-center mb-4 leading-tight">
              {s.title}
            </h2>
            <p style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.75)' }} className="text-sm text-center leading-relaxed">
              {s.body}
            </p>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-10">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                aria-label={`Go to step ${i + 1}`}
                className="rounded-full transition-all"
                style={{ width: i === slide ? 18 : 8, height: 8, background: i === slide ? C.amber : 'rgba(255,255,255,0.3)' }}
              />
            ))}
          </div>
        </div>

        {/* Nav */}
        <div className="px-6 py-6 border-t backdrop-blur-xl flex gap-3 sm:mx-auto sm:max-w-xl sm:w-full" style={{ background: C.glassBg, borderColor: C.glassBorder, boxShadow: C.shadowLg }}>
          {slide > 0 ? (
            <button
              onClick={() => setSlide((s) => s - 1)}
              className="flex-1 py-3 rounded-xl border font-semibold text-sm active:scale-[0.98] transition-transform"
              style={{ borderColor: C.parchmentDark, color: C.ink, fontFamily: FONT.sans }}
            >
              Previous
            </button>
          ) : <div className="flex-1" />}
          <button
            onClick={() => slide < SLIDES.length - 1 ? setSlide((s) => s + 1) : nav('/home')}
            className="flex-1 py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
            style={{ background: C.forest, color: '#fff', fontFamily: FONT.sans }}
          >
            {slide < SLIDES.length - 1 ? 'Next' : "I'm ready"}
          </button>
        </div>
      </div>
    </AppShell>
  )
}

// ── Menu hub (role-aware) ──────────────────────────────────────────────────────
// The 5th primary nav slot. Leads with identity (who you are, at a glance),
// then groups everything else by how often it's actually used: your own
// stats first, communication next, community and tools after that, and the
// platform-administration tier last, set apart rather than mixed into
// personal settings.
//
// New in this pass: a trust ring around the avatar (what the platform is
// actually vouching for), one-tap quick actions for the task a person is
// most likely here to do, a membership tier with visible progress, a
// dedicated-advisor card (the "someone real is watching this" feeling that
// a diaspora-trust product should lead with), and a referral code you can
// copy without leaving the screen.
export function ProfileScreen() {
  const nav = useNavigate()
  const { name, avatarUrl, setAvatarUrl, role, projects, jobs, landListings, contractors, devUserId, unreadNotifications } = useApp()
  const myContractorProfile = contractors.find((c) => c.id === devUserId)
  const { open: openNotifications } = useNotificationsDrawer()
  const { show: showToast } = useToast()
  const uploadAvatarMutation = useUploadAvatarMutation()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const pickAvatar = () => avatarInputRef.current?.click()
  const onAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // lets picking the same file again re-fire onChange
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast({ title: 'Not an image', description: 'Please choose a photo (JPG, PNG, etc).', tone: 'error' })
      return
    }
    try {
      const url = await uploadAvatarMutation.mutateAsync(file)
      setAvatarUrl(url)
      showToast({ title: 'Profile photo updated', tone: 'success' })
    } catch (err) {
      showToast({ title: 'Upload failed', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }
  const { data: kycStatus = 'unverified' } = useMyKycStatusQuery()
  const { data: roleTypes = [] } = useMyRoleTypesQuery(Boolean(devUserId))
  const isVerifier = roleTypes.includes('verifier')
  const isAdmin = roleTypes.includes('admin')
  const kycLabel: Record<KycStatus, string> = { unverified: 'Not verified', pending: 'Under review', verified: 'Verified', rejected: 'Rejected — action needed' }
  const roleLabel: Record<string, string> = {
    funder: 'Diaspora Funder',
    recipient: 'Project Recipient',
    contractor: 'Local Contractor',
    seller: 'Land Seller',
  }

  const roleStats: Record<string, { label: string; value: string; icon: GlyphName }[]> = {
    funder: [
      { label: 'Projects funded', value: String(projects.length), icon: 'coin' },
      { label: 'Active', value: String(projects.filter((p) => p.status === 'active').length), icon: 'sparkles' },
      { label: 'Since', value: '2024', icon: 'calendar' },
    ],
    recipient: [
      { label: 'Projects', value: String(projects.length), icon: 'coin' },
      { label: 'Rating', value: `${projects[0]?.recipientRating.toFixed(1) ?? '—'}`, icon: 'star' },
      { label: 'Since', value: '2024', icon: 'calendar' },
    ],
    contractor: [
      { label: 'Jobs done', value: String(myContractorProfile?.jobs ?? 0), icon: 'coin' },
      { label: 'Rating', value: `${myContractorProfile?.rating.toFixed(1) ?? '—'}`, icon: 'star' },
      { label: 'Open jobs', value: String(jobs.length), icon: 'sparkles' },
    ],
    seller: [
      { label: 'Listings', value: String(landListings.length), icon: 'coin' },
      { label: 'Verified', value: String(landListings.filter((l) => l.verified).length), icon: 'shield' },
      { label: 'Since', value: '2024', icon: 'calendar' },
    ],
  }

  const roleProfileLink: Record<string, { label: string; sub: string; path: string }> = {
    funder: { label: 'Transaction history', sub: 'Every deposit, release and refund', path: '/funder/transactions' },
    recipient: { label: 'My reputation', sub: 'Ratings from funders you\'ve worked with', path: '/recipient/reputation' },
    contractor: { label: 'Contractor profile', sub: 'Certifications, availability & rate card', path: '/contractor/profile' },
    seller: { label: 'My listings', sub: 'Manage everything you have for sale', path: '/land/my-listings' },
  }

  // One-tap access to the task each role opens this app for most often.
  const roleQuickActions: Record<string, { label: string; icon: GlyphName; action: () => void }[]> = {
    funder: [
      { label: 'Fund project', icon: 'coin', action: () => nav('/funder/projects') },
      { label: 'Messages', icon: 'chat', action: () => nav('/messages') },
      { label: 'Refer', icon: 'gift', action: () => nav('/referrals') },
      { label: 'Currency tool', icon: 'swap', action: () => nav('/tools/currency-converter') },
    ],
    recipient: [
      { label: 'Submit proof', icon: 'shield', action: () => nav('/recipient/milestones') },
      { label: 'Messages', icon: 'chat', action: () => nav('/messages') },
      { label: 'Post a job', icon: 'coin', action: () => nav('/jobs/post') },
      { label: 'Refer', icon: 'gift', action: () => nav('/referrals') },
    ],
    contractor: [
      { label: 'Browse jobs', icon: 'coin', action: () => nav('/jobs') },
      { label: 'Messages', icon: 'chat', action: () => nav('/messages') },
      { label: 'My bids', icon: 'shield', action: () => nav('/contractor/bids') },
      { label: 'Refer', icon: 'gift', action: () => nav('/referrals') },
    ],
    seller: [
      { label: 'New listing', icon: 'coin', action: () => nav('/land/new') },
      { label: 'Messages', icon: 'chat', action: () => nav('/messages') },
      { label: 'My listings', icon: 'shield', action: () => nav('/land/my-listings') },
      { label: 'Refer', icon: 'gift', action: () => nav('/referrals') },
    ],
  }

  const key = role ?? 'funder'

  // A quiet, deterministic trust figure — not a vanity metric, a rollup of
  // the two things a counterparty would actually want to know.
  const trustScore = kycStatus === 'verified' ? 92 : kycStatus === 'pending' ? 68 : 40
  const tiers = [
    { name: 'Member', min: 0, perk: 'Full access to fund, hire and list' },
    { name: 'Trusted', min: 50, perk: 'Priority verifier review' },
    { name: 'Founding Circle', min: 85, perk: 'Dedicated advisor & lower fees' },
  ]
  const tierIndex = tiers.reduce((acc, t, i) => (trustScore >= t.min ? i : acc), 0)
  const currentTier = tiers[tierIndex]
  const nextTier = tiers[tierIndex + 1]
  const progressToNext = nextTier ? Math.round(((trustScore - currentTier.min) / (nextTier.min - currentTier.min)) * 100) : 100


  const notifBadge = unreadNotifications > 0
    ? <span className="rounded-full px-2 py-0.5 text-[10px] font-bold flex-shrink-0" style={{ background: C.seal, color: '#fff', fontFamily: FONT.mono }}>{unreadNotifications}</span>
    : undefined

  return (
    <AppShell>
      <Header title="Menu" back tone="dark" background={C.forest}>
        <div className="relative text-center">
          {/* Subtle repeating ring pattern behind the identity block — a
              quiet nod to a ledger's watermark, not a loud decoration. */}
          <svg className="absolute inset-x-0 -top-2 mx-auto pointer-events-none" width="220" height="120" viewBox="0 0 220 120" style={{ opacity: 0.12 }} aria-hidden>
            <circle cx="110" cy="30" r="70" fill="none" stroke="#fff" strokeWidth="1" />
            <circle cx="110" cy="30" r="95" fill="none" stroke="#fff" strokeWidth="1" />
          </svg>

          <div className="relative inline-block mb-3">
            <ProgressRing value={trustScore} size={88} stroke={3} color={C.amber} track="rgba(255,255,255,0.2)">
              <button
                onClick={pickAvatar}
                aria-label="Change profile photo"
                className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden text-white text-3xl font-bold"
                style={{ background: 'rgba(255,255,255,0.2)', fontFamily: FONT.serif }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  name ? name[0] : 'M'
                )}
                {uploadAvatarMutation.isPending && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <Spinner size={20} color="#fff" />
                  </span>
                )}
              </button>
            </ProgressRing>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelected} />
            <button
              onClick={pickAvatar}
              aria-label="Change profile photo"
              className="absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full ring-2"
              style={{ background: C.amber, color: C.forestDark, ringColor: C.forest } as React.CSSProperties}
            >
              <AppIcon name="camera" size={13} />
            </button>
            <div className="absolute -bottom-1 -right-1 rounded-full ring-2" style={{ ringColor: C.forest } as React.CSSProperties}>
              <Seal size={24} />
            </div>
          </div>

          <div style={{ fontFamily: FONT.serif }} className="text-xl font-bold text-white">{name || 'Marie-Claire N.'}</div>
          <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-xs uppercase tracking-wider mt-1">{roleLabel[key]}</div>

          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="rounded-full px-3 py-1 text-[10px] uppercase tracking-wide font-semibold" style={{ background: 'rgba(255,255,255,0.15)', color: C.amber, fontFamily: FONT.mono }}>
              {currentTier.name}
            </span>
            <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONT.mono }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4L3 6L7 2" stroke={C.amber} strokeWidth="1.3" strokeLinecap="round" /></svg>
              Trust score {trustScore}
            </span>
          </div>
        </div>
      </Header>

      <div className="px-5 py-6 space-y-7 sm:mx-auto sm:max-w-3xl">
        {/* Quick actions — the fastest path to the task this role is here
            for, one tap away instead of buried a scroll down. */}
        <div className="-mx-5 px-5 sm:mx-0 sm:px-0">
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Quick actions</div>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {roleQuickActions[key].map(({ label, icon, action }) => (
              <button
                key={label}
                onClick={action}
                className="flex-shrink-0 flex flex-col items-center gap-2 rounded-2xl px-4 py-3 transition-transform active:scale-95"
                style={{ background: C.white, border: `1px solid ${C.parchmentDark}`, boxShadow: C.shadowSm, minWidth: 84 }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: C.parchment, color: C.forest }}>
                  <Glyph name={icon} size={17} />
                </span>
                <span style={{ fontFamily: FONT.sans, color: C.ink }} className="text-[11px] font-medium whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {roleStats[key].map(({ label, value, icon }) => (
            <Card key={label} variant="glass">
              <div className="p-3 text-center">
                <div className="flex justify-center mb-1" style={{ color: C.forest, opacity: 0.7 }}><Glyph name={icon} size={14} /></div>
                <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-lg font-bold">{value}</div>
                <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Membership tier — visible progress toward the next tier, so the
            trust score means something beyond a number. */}
        <div className="rounded-2xl border p-5" style={{ borderColor: C.parchmentDark, boxShadow: C.shadowSm, background: C.white }}>
          <div className="flex items-center justify-between mb-1">
            <div style={{ fontFamily: FONT.serif, color: C.ink }} className="text-sm font-bold">{currentTier.name}</div>
            {nextTier && <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px]">{trustScore} / {nextTier.min} to {nextTier.name}</div>}
          </div>
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs mb-3">{currentTier.perk}</p>
          {nextTier ? (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.parchmentDark }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progressToNext}%`, background: C.amber }} />
            </div>
          ) : (
            <div style={{ fontFamily: FONT.mono, color: C.forest }} className="text-[10px] uppercase tracking-wide">Highest tier reached</div>
          )}
        </div>

        {/* Dedicated advisor — the "a real person has your back" feeling a
            trust product for the diaspora should lead with, not bury. */}
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: C.forest, boxShadow: C.shadowSm }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)', fontFamily: FONT.serif }}>
            <Glyph name="headset" size={20} color="#fff" />
          </div>
          <div className="min-w-0 flex-1">
            <div style={{ fontFamily: FONT.sans, color: '#fff' }} className="text-sm font-semibold">Your dedicated advisor</div>
            <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] mt-0.5">Real support for real decisions</div>
          </div>
          <button
            onClick={() => nav('/messages')}
            className="flex-shrink-0 rounded-lg px-3 py-2 text-xs font-semibold active:scale-95 transition-transform"
            style={{ background: C.amber, color: C.forestDark, fontFamily: FONT.sans }}
          >
            Message
          </button>
        </div>

        <GroupedLinks
          title="Your account"
          items={[
            { label: roleProfileLink[key].label, sub: roleProfileLink[key].sub, action: () => nav(roleProfileLink[key].path), icon: 'coin' },
            { label: 'ID verification (KYC/AML)', sub: kycLabel[kycStatus], action: () => nav('/compliance/kyc'), icon: 'shield' },
            { label: 'Switch role', sub: 'Change or add a primary role', action: () => nav('/role'), icon: 'swap' },
          ]}
        />

        <GroupedLinks
          title="Communication"
          items={[
            { label: 'Messages', sub: 'Chat with recipients, contractors & sellers', action: () => nav('/messages'), icon: 'chat' },
            { label: 'Notifications', sub: unreadNotifications > 0 ? `${unreadNotifications} unread` : 'You\'re all caught up', action: openNotifications, icon: 'bell', right: notifBadge },
            { label: 'Activity log', sub: 'Full audit trail across your account', action: () => nav('/activity'), icon: 'scroll' },
          ]}
        />

        {/* Referral */}
        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Community</div>
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: C.parchmentDark, boxShadow: C.shadowSm }}>
            <button
              onClick={() => nav('/referrals')}
              className="w-full flex items-center justify-between gap-3 px-4 py-4 active:scale-[0.99] transition-transform"
              style={{ borderBottom: `1px solid ${C.parchmentDark}`, background: C.white }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: C.parchment, color: C.forest }}><Glyph name="gift" size={16} /></span>
                <div className="min-w-0 text-left">
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">Refer a friend</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">Get your link, earn rewards for invites</div>
                </div>
              </div>
              <span style={{ fontFamily: FONT.mono, color: C.forest }} className="text-xs font-semibold flex-shrink-0">View →</span>
            </button>
            <GroupedLinks
              title=""
              items={[
                { label: 'Diaspora group dashboard', sub: 'Shared funding across your association', action: () => nav('/groups/dashboard'), icon: 'wallet' },
                { label: 'Group members', sub: 'View & invite members', action: () => nav('/groups/members'), icon: 'globe' },
                { label: 'Public project showcase', sub: 'Browse completed projects — no login', action: () => nav('/showcase'), icon: 'sparkles' },
              ]}
            />
          </div>
        </div>

        <GroupedLinks
          title="Financial tools"
          items={[
            ...(key === 'funder' ? [
              { label: 'Recurring contributions', sub: 'Manage scheduled automatic funding', action: () => nav('/funder/recurring'), icon: 'wallet' as GlyphName },
              { label: 'Project templates', sub: 'Reusable milestone breakdowns', action: () => nav('/funder/templates'), icon: 'fileText' as GlyphName },
              { label: 'Team & permissions', sub: 'Who can fund, approve, or view', action: () => nav('/workspace/team'), icon: 'shield' as GlyphName },
            ] : []),
            ...(key === 'contractor' || key === 'funder' ? [
              { label: 'Manage subscription', sub: key === 'contractor' ? 'Pro Contractor plan — waived per-bid fees' : 'Power Funder plan for diaspora groups', action: () => nav('/account/subscription'), icon: 'sparkles' as GlyphName },
            ] : []),
            { label: 'Currency converter', sub: 'Reference exchange rate & fee calculator', action: () => nav('/tools/currency-converter'), icon: 'swap' },
          ]}
        />

        <div>
          <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Verification</div>
          <GroupedLinks
            title=""
            items={[
              { label: 'Register as verifier', sub: 'Set up a verifier profile', action: () => nav('/verifier/register'), icon: 'shield' },
            ]}
          />
        </div>

        {(isVerifier || isAdmin) && (
          <div>
            <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-2">Platform administration</div>
            <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs mb-2 leading-relaxed">Staff tooling — visible because this account holds a verifier or admin role, not part of every account.</p>
            <GroupedLinks
              title=""
              dashed
              items={[
                ...(isVerifier ? [{ label: 'Verifier dashboard', sub: 'Review verification tasks', action: () => nav('/verifier/dashboard'), icon: 'monitor' as GlyphName }] : []),
                ...(isAdmin ? [
                  { label: 'Admin panel', sub: 'Platform overview & management', action: () => nav('/admin'), icon: 'sliders' as GlyphName },
                  { label: 'Dispute resolution', sub: 'Manage open disputes', action: () => nav('/admin/disputes'), icon: 'scroll' as GlyphName },
                  { label: 'Fraud & dispute analytics', sub: 'Flagged patterns across the platform', action: () => nav('/admin/fraud-analytics'), icon: 'shield' as GlyphName },
                ] : []),
              ]}
            />
          </div>
        )}

        <GroupedLinks
          title="Preferences & support"
          items={[
            { label: 'Settings', sub: 'Appearance, security, linked accounts', action: () => nav('/shared/settings'), icon: 'sliders' },
            { label: 'How Mboa Trust works', sub: 'Walkthrough & FAQ', action: () => nav('/shared/help'), icon: 'lifebuoy' },
          ]}
        />
      </div>
    </AppShell>
  )
}

// ── Subscription management ──────────────────────────────────────────────────
const PLAN_META: Record<PlanType, { name: string; forRole: string; benefit: string }> = {
  pro_contractor: { name: 'Pro Contractor', forRole: 'contractor', benefit: 'Waived per-bid fees on every job you bid for.' },
  power_funder: { name: 'Power Funder', forRole: 'funder', benefit: 'Priority support and tools for diaspora groups pooling funds.' },
}

export function SubscriptionScreen() {
  const { role, phone } = useApp()
  const { show: showToast } = useToast()
  const { data: subscriptions = [], isLoading } = useMySubscriptionsQuery()
  const createSubscription = useCreateSubscriptionMutation()
  const cancelSubscription = useCancelSubscriptionMutation()
  const [method, setMethod] = useState<'momo' | 'om'>('momo')

  const planType: PlanType = role === 'contractor' ? 'pro_contractor' : 'power_funder'
  const meta = PLAN_META[planType]
  const active = subscriptions.find((s) => s.planType === planType && s.status === 'active')
  const price = PLAN_PRICES[planType]

  const subscribe = async () => {
    try {
      await createSubscription.mutateAsync({
        planType,
        paymentProvider: method === 'om' ? 'orange_money' : 'mtn_momo',
        payerPhoneNumber: phone || '+237677234891',
      })
      showToast({ title: `${meta.name} activated`, tone: 'success' })
    } catch (err) {
      showToast({ title: 'Subscription failed', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  const cancel = async () => {
    if (!active) return
    try {
      await cancelSubscription.mutateAsync(active.id)
      showToast({ title: 'Subscription cancelled', tone: 'success' })
    } catch (err) {
      showToast({ title: 'Failed to cancel', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  return (
    <AppShell>
      <Header title="Subscription" back />
      <div className="px-5 py-5 space-y-5 sm:mx-auto sm:max-w-2xl">
        {isLoading ? (
          <p style={{ fontFamily: FONT.sans, color: C.inkSubtle }} className="text-xs">Loading…</p>
        ) : (
          <>
            <div className="rounded-2xl p-5" style={{ background: C.forest }}>
              <div style={{ fontFamily: FONT.mono, color: 'rgba(255,255,255,0.6)' }} className="text-[10px] uppercase tracking-widest">{meta.name}</div>
              <div style={{ fontFamily: FONT.serif, color: '#fff' }} className="text-2xl font-bold mt-1">{price.toLocaleString('en-US')} XAF<span className="text-sm font-normal">/month</span></div>
              <p style={{ fontFamily: FONT.sans, color: 'rgba(255,255,255,0.85)' }} className="text-xs mt-2 leading-relaxed">{meta.benefit}</p>
              {active && (
                <div className="mt-3">
                  <StatusBadge status="active" />
                </div>
              )}
            </div>

            {active ? (
              <div className="space-y-3">
                <Card>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div style={{ fontFamily: FONT.sans }} className="text-sm font-semibold">Renews</div>
                      <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] mt-0.5">
                        {active.renewalDate ? new Date(active.renewalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                  </div>
                </Card>
                <PillButton onClick={cancel} fullWidth variant="secondary" disabled={cancelSubscription.isPending}>
                  {cancelSubscription.isPending ? 'Cancelling…' : 'Cancel subscription'}
                </PillButton>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest block mb-2">Payment method</label>
                  <MomoOmPicker method={method} onChange={setMethod} />
                </div>
                <PillButton onClick={subscribe} fullWidth disabled={createSubscription.isPending}>
                  {createSubscription.isPending ? 'Subscribing…' : `Subscribe — ${price.toLocaleString('en-US')} XAF/month`}
                </PillButton>
              </div>
            )}

            {subscriptions.filter((s) => s.status !== 'active').length > 0 && (
              <div>
                <p style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest mb-3">History</p>
                <div className="space-y-2">
                  {subscriptions.filter((s) => s.status !== 'active').map((s) => (
                    <Card key={s.id}>
                      <div className="p-3 flex items-center justify-between">
                        <span style={{ fontFamily: FONT.sans }} className="text-xs">{PLAN_META[s.planType].name}</span>
                        <StatusBadge status={s.status} />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}