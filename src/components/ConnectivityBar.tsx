import { useOfflineQueue } from '../offlineQueue'
import { C, FONT, STATUS_TONE_VARS } from './MobileLayout'

/**
 * Persistent connection + sync status. Deliberately unobtrusive when there's
 * nothing to report (online, empty queue) — just a small dot — and only grows
 * into a fuller pill with a manual retry when there's something a field worker
 * actually needs to know about (offline, or evidence still waiting to sync).
 */
export function ConnectivityBar() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineQueue()

  // Below `sm` the labels are cut to what the mobile app's
  // ConnectivityIndicator shows (MboaTrustAPP/components/ConnectivityIndicator.tsx):
  // a bare dot while online, and a short word when there's something to
  // report. The phone-width top bar has ~340px for every control; "Online"
  // alone cost 55px of it, and "Offline — will sync automatically" (~200px)
  // would push the avatar off-screen the moment signal drops. The full
  // wording stays for wider screens and for screen readers via aria-label.
  if (isOnline && pendingCount === 0) {
    return (
      <div className="flex items-center gap-1.5 px-1 py-1" role="status" aria-label="Online">
        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_TONE_VARS.success.text }} />
        <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="hidden text-[9px] uppercase tracking-wider sm:inline">Online</span>
      </div>
    )
  }

  // Was 8 hardcoded light-only hex values across the two tones (same bug
  // class as LandFlagBadge's pre-fix history) — routed through
  // STATUS_TONE_VARS so this reflects dark mode instead of ignoring it.
  const tone = isOnline ? STATUS_TONE_VARS.warning : STATUS_TONE_VARS.error
  const label = !isOnline ? 'Offline — will sync automatically' : isSyncing ? 'Syncing…' : `${pendingCount} pending sync`
  const shortLabel = !isOnline ? 'Offline' : isSyncing ? 'Syncing' : `${pendingCount} pending`

  const canRetry = isOnline && pendingCount > 0 && !isSyncing
  const pillClass = 'inline-flex items-center gap-2 rounded-full border px-3 py-1.5'
  const pillStyle = { background: tone.bg, borderColor: tone.text }
  const body = (
    <>
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: tone.text }} />
      <span aria-hidden style={{ fontFamily: FONT.mono, color: tone.text }} className="whitespace-nowrap text-[9px] uppercase tracking-wider">
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
      {/* The separate "Retry sync" link only fits from `sm` up; on a phone the
          whole pill is the retry target instead, as in the mobile app. */}
      {canRetry && (
        <span aria-hidden style={{ fontFamily: FONT.sans, color: tone.text }} className="hidden text-[10px] font-bold underline sm:inline">
          Retry sync
        </span>
      )}
    </>
  )

  return canRetry ? (
    <button onClick={syncNow} aria-label={`${label} — retry now`} className={pillClass} style={pillStyle}>
      {body}
    </button>
  ) : (
    <div role="status" aria-label={label} className={pillClass} style={pillStyle}>
      {body}
    </div>
  )
}
