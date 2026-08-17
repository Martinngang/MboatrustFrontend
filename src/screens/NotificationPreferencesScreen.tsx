import { C, FONT, AppShell, Header } from '../components/MobileLayout'
import { Switch } from '../components/Switch'
import { useToast } from '../components/Toast'
import { apiErrorMessage } from '../api/client'
import { useNotificationPreferencesQuery, useUpdateNotificationPreferencesMutation, type NotificationChannelPrefs } from '../api/notificationPreferences'

interface PrefRow {
  key: string
  label: string
  sub: string
  defaults: NotificationChannelPrefs
}

// Same six categories the backend defines (utils/notificationCategories.js)
// — kept in sync deliberately so every category here is real and settable.
const ROWS: PrefRow[] = [
  { key: 'milestones', label: 'Milestone updates', sub: 'Submissions, approvals, releases', defaults: { push: true, email: true } },
  { key: 'bids', label: 'New bids & tenders', sub: 'Bids received, tenders matching your trade', defaults: { push: true, email: false } },
  { key: 'disputes', label: 'Disputes & flags', sub: 'Raised disputes, fraud flags, resolutions', defaults: { push: true, email: true } },
  { key: 'messages', label: 'Messages', sub: 'New chat messages from recipients, contractors, sellers', defaults: { push: true, email: false } },
  { key: 'land', label: 'Land verification', sub: 'Listing verified, offers received', defaults: { push: true, email: false } },
  { key: 'marketing', label: 'Platform tips & news', sub: 'Occasional product updates and tips', defaults: { push: false, email: false } },
]

/** Granular per-type, per-channel notification control, backed by the real
 * NotificationPreference document — replaces the old localStorage-only
 * version nothing else actually read. */
export function NotificationPreferencesScreen() {
  const { show: showToast } = useToast()
  const { data: prefs } = useNotificationPreferencesQuery()
  const updatePrefs = useUpdateNotificationPreferencesMutation()

  const toggle = async (key: string, channel: 'push' | 'email') => {
    const current = prefs?.[key] ?? ROWS.find((r) => r.key === key)!.defaults
    try {
      await updatePrefs.mutateAsync({ [key]: { ...current, [channel]: !current[channel] } })
    } catch (err) {
      showToast({ title: 'Failed to update preference', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  const disableAllEmail = async () => {
    const patch = Object.fromEntries(ROWS.map((r) => [r.key, { ...(prefs?.[r.key] ?? r.defaults), email: false }]))
    try {
      await updatePrefs.mutateAsync(patch)
      showToast({ title: 'Email notifications disabled', tone: 'success' })
    } catch (err) {
      showToast({ title: 'Failed to update preferences', description: apiErrorMessage(err, 'Please try again'), tone: 'error' })
    }
  }

  return (
    <AppShell>
      <Header title="Notification Preferences" subtitle="Choose push or email, per notification type" back />

      <div className="px-5 py-4 sm:mx-auto sm:max-w-2xl">
        <p style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mb-4 text-xs leading-relaxed">
          Push preferences take effect immediately. Email preferences are saved here for when email delivery goes live — no email is sent yet.
        </p>
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: C.parchmentDark, background: C.white, boxShadow: C.shadowSm }}>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b px-4 py-2.5" style={{ borderColor: C.parchmentDark }}>
            <span />
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Push</span>
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Email</span>
          </div>
          {ROWS.map((r, i) => {
            const p = prefs?.[r.key] ?? r.defaults
            return (
              <div
                key={r.key}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < ROWS.length - 1 ? `1px solid ${C.parchmentDark}` : 'none' }}
              >
                <div className="min-w-0">
                  <div style={{ fontFamily: FONT.sans, color: C.ink }} className="text-sm font-medium">{r.label}</div>
                  <div style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="mt-0.5 text-[10px]">{r.sub}</div>
                </div>
                <Switch checked={p.push} onChange={() => toggle(r.key, 'push')} />
                <Switch checked={p.email} onChange={() => toggle(r.key, 'email')} />
              </div>
            )
          })}
        </div>

        <button onClick={disableAllEmail} style={{ fontFamily: FONT.sans, color: C.inkMuted }} className="mt-4 text-xs font-semibold">
          Turn off all email notifications
        </button>
      </div>
    </AppShell>
  )
}
