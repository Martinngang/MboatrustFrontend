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

  if (isOnline && pendingCount === 0) {
    return (
      <div className="flex items-center gap-1.5 px-1 py-1">
        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: STATUS_TONE_VARS.success.text }} />
        <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider">Online</span>
      </div>
    )
  }

  // Was 8 hardcoded light-only hex values across the two tones (same bug
  // class as LandFlagBadge's pre-fix history) — routed through
  // STATUS_TONE_VARS so this reflects dark mode instead of ignoring it.
  const tone = isOnline ? STATUS_TONE_VARS.warning : STATUS_TONE_VARS.error
  const label = !isOnline ? 'Offline — will sync automatically' : isSyncing ? 'Syncing…' : `${pendingCount} pending sync`

  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5" style={{ background: tone.bg, borderColor: tone.text }}>
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: tone.text }} />
      <span style={{ fontFamily: FONT.mono, color: tone.text }} className="text-[9px] uppercase tracking-wider">{label}</span>
      {isOnline && pendingCount > 0 && !isSyncing && (
        <button onClick={syncNow} style={{ fontFamily: FONT.sans, color: tone.text }} className="text-[10px] font-bold underline">
          Retry sync
        </button>
      )}
    </div>
  )
}
