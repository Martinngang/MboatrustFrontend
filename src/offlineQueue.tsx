import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { addQueuedEvidence, deleteQueuedEvidence, getAllQueuedEvidence, newQueueId, updateQueuedEvidence, type QueuedEvidence } from './db/evidenceQueue'
import { useApp } from './context'

const SYNC_TAG = 'sync-evidence'

/** Queued evidence is stored as data URLs in IndexedDB (see db/evidenceQueue.ts)
 * — converts them back into real Files for upload once we're back online and
 * actually submitting to the backend. */
async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type })
}

async function dataUrlsToFiles(dataUrls: string[], idPrefix: string): Promise<File[]> {
  return Promise.all(dataUrls.map((url, i) => dataUrlToFile(url, `evidence-${idPrefix}-${i}.jpg`)))
}

export interface EnqueueEvidenceInput {
  projectId: string
  projectTitle: string
  milestoneId: string
  milestoneTitle: string
  photos: string[]
  notes: string
  geotag: { lat: number; lng: number; label: string } | null
}

interface OfflineQueueContextValue {
  isOnline: boolean
  queue: QueuedEvidence[]
  pendingCount: number
  isSyncing: boolean
  backgroundSyncSupported: boolean
  enqueue: (input: EnqueueEvidenceInput) => Promise<QueuedEvidence>
  syncNow: () => Promise<void>
}

const OfflineQueueContext = createContext<OfflineQueueContextValue>({} as OfflineQueueContextValue)

const backgroundSyncSupported = 'serviceWorker' in navigator && 'SyncManager' in window

export function OfflineQueueProvider({ children }: { children: ReactNode }) {
  const { submitMilestoneProof } = useApp()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queue, setQueue] = useState<QueuedEvidence[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  const refresh = useCallback(async () => {
    setQueue(await getAllQueuedEvidence())
  }, [])

  // Actually submits every pending/failed item to the real backend, one at a
  // time. A failure on one item is recorded (status flips back to `failed`,
  // with the real error message) without aborting the rest of the queue.
  // Deletion only happens after the real submit call resolves successfully,
  // so a run that gets interrupted (tab closed, network drop mid-loop) can't
  // lose an item — it just stays queued for the next attempt.
  const syncNow = useCallback(async () => {
    const items = (await getAllQueuedEvidence()).filter((i) => i.status === 'pending_sync' || i.status === 'failed')
    if (items.length === 0) return
    setIsSyncing(true)
    try {
      for (const item of items) {
        await updateQueuedEvidence({ ...item, status: 'syncing' })
        await refresh()
        try {
          const files = await dataUrlsToFiles(item.photos, item.id)
          const geotag = item.geotag ? { lat: item.geotag.lat, lng: item.geotag.lng } : null
          await submitMilestoneProof(item.projectId, item.milestoneId, files, geotag, item.notes)
          await deleteQueuedEvidence(item.id)
        } catch (err) {
          await updateQueuedEvidence({
            ...item,
            status: 'failed',
            syncAttempts: item.syncAttempts + 1,
            lastError: err instanceof Error ? err.message : 'Upload failed — will retry.',
          })
        }
      }
    } finally {
      await refresh()
      setIsSyncing(false)
    }
  }, [submitMilestoneProof, refresh])

  // Initial load, and attempt anything still queued from a previous session.
  useEffect(() => {
    refresh().then(() => {
      if (navigator.onLine) syncNow()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true)
      syncNow()
    }
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [syncNow])

  // The service worker posts here when a Background Sync event fires while
  // this tab is open — it can detect connectivity but can't do the real
  // authenticated upload itself, so it defers to us.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'evidence-sync-requested') {
        syncNow()
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [syncNow])

  const enqueue = useCallback(
    async (input: EnqueueEvidenceInput) => {
      const item: QueuedEvidence = { ...input, id: newQueueId(), capturedAt: new Date().toISOString(), status: 'pending_sync', syncAttempts: 0 }
      await addQueuedEvidence(item)
      await refresh()

      if (navigator.onLine) {
        syncNow()
      } else if (backgroundSyncSupported) {
        // The item is already safely queued above regardless of what
        // happens here — this just registers a second, OS-level trigger to
        // wake the app when connectivity returns, on top of the `online`
        // event listener (see below) that already covers the same case.
        // A browser can refuse this for reasons that have nothing to do
        // with whether queuing worked (background sync disabled by policy,
        // engagement heuristics, no permission yet) — letting that reject
        // the whole enqueue() call would leave the caller's UI stuck
        // without ever showing its "saved for sync" confirmation, even
        // though the evidence was never actually at risk.
        try {
          const reg = await navigator.serviceWorker.ready
          await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(SYNC_TAG)
        } catch (err) {
          console.warn('[offlineQueue] background sync registration failed — the online-event listener will still sync when connectivity returns', err)
        }
      }
      return item
    },
    [refresh, syncNow],
  )

  // Nothing ever lingers in the queue with status 'synced' — a successful
  // submit deletes the item immediately (see syncNow above) — so every item
  // still in `queue` counts as pending.
  const pendingCount = queue.length

  return (
    <OfflineQueueContext.Provider value={{ isOnline, queue, pendingCount, isSyncing, backgroundSyncSupported, enqueue, syncNow }}>
      {children}
    </OfflineQueueContext.Provider>
  )
}

export const useOfflineQueue = () => useContext(OfflineQueueContext)
