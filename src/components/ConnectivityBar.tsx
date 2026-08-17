import { useOfflineQueue } from '../offlineQueue'
import { C, FONT } from './MobileLayout'

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
        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: '#22C55E' }} />
        <span style={{ fontFamily: FONT.mono, color: C.inkSubtle }} className="text-[9px] uppercase tracking-wider">Online</span>
      </div>
    )
  }

  const tone = isOnline ? { bg: '#FFF7E6', border: '#F5DCA0', dot: '#E8A020', text: '#92400E' } : { bg: '#FEF2F2', border: '#FECACA', dot: '#DC2626', text: '#991B1B' }
  const label = !isOnline ? 'Offline — will sync automatically' : isSyncing ? 'Syncing…' : `${pendingCount} pending sync`

  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5" style={{ background: tone.bg, borderColor: tone.border }}>
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: tone.dot }} />
      <span style={{ fontFamily: FONT.mono, color: tone.text }} className="text-[9px] uppercase tracking-wider">{label}</span>
      {isOnline && pendingCount > 0 && !isSyncing && (
        <button onClick={syncNow} style={{ fontFamily: FONT.sans, color: tone.text }} className="text-[10px] font-bold underline">
          Retry sync
        </button>
      )}
    </div>
  )
}
