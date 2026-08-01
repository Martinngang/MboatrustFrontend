import { useEffect, useState } from 'react'
import { C, FONT, AppShell, Header } from '../components/MobileLayout'
import { Switch } from '../components/Switch'
import { useToast } from '../components/Toast'

interface PrefRow {
  key: string
  label: string
  sub: string
  defaults: { push: boolean; email: boolean }
}

const ROWS: PrefRow[] = [
  { key: 'milestones', label: 'Milestone updates', sub: 'Submissions, approvals, releases', defaults: { push: true, email: true } },
  { key: 'bids', label: 'New bids & tenders', sub: 'Bids received, tenders matching your trade', defaults: { push: true, email: false } },
  { key: 'disputes', label: 'Disputes & flags', sub: 'Raised disputes, fraud flags, resolutions', defaults: { push: true, email: true } },
  { key: 'messages', label: 'Messages', sub: 'New chat messages from recipients, contractors, sellers', defaults: { push: true, email: false } },
  { key: 'land', label: 'Land verification', sub: 'Listing verified, offers received', defaults: { push: true, email: false } },
  { key: 'marketing', label: 'Platform tips & news', sub: 'Occasional product updates and tips', defaults: { push: false, email: false } },
]

type Prefs = Record<string, { push: boolean; email: boolean }>
const STORAGE_KEY = 'mboatrust-notification-prefs'

function loadPrefs(): Prefs {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (stored) return stored
  } catch { /* ignore */ }
  return Object.fromEntries(ROWS.map((r) => [r.key, r.defaults]))
}

/** Granular per-type, per-channel notification control — replaces the flat
 * on/off toggle Settings used to offer. Self-contained (localStorage) since
 * nothing else in this demo gates actual delivery on these values. */
export function NotificationPreferencesScreen() {
  const { show: showToast } = useToast()
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)) } catch { /* ignore */ }
  }, [prefs])

  const toggle = (key: string, channel: 'push' | 'email') => {
    setPrefs((p) => ({ ...p, [key]: { ...p[key], [channel]: !p[key]?.[channel] } }))
  }

  const disableAllEmail = () => {
    setPrefs((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, email: false }])))
    showToast({ title: 'Email notifications disabled', tone: 'success' })
  }

  return (
    <AppShell>
      <Header title="Notification Preferences" subtitle="Choose push or email, per notification type" back />

      <div className="px-5 py-4 sm:mx-auto sm:max-w-2xl">
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: C.parchmentDark, background: C.white, boxShadow: C.shadowSm }}>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b px-4 py-2.5" style={{ borderColor: C.parchmentDark }}>
            <span />
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Push</span>
            <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[10px] uppercase tracking-widest">Email</span>
          </div>
          {ROWS.map((r, i) => {
            const p = prefs[r.key] ?? r.defaults
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
