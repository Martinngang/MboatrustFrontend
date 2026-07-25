import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { addQueuedEvidence, deleteQueuedEvidence, getAllQueuedEvidence, newQueueId, type QueuedEvidence } from './db/evidenceQueue'
import { syncAllQueuedEvidence } from './db/syncEvidence'
import { useApp } from './context'

const SYNC_TAG = 'sync-evidence'

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

  // Applies any item a sync run (this tab, or a background-sync run that fired
  // while this tab was closed) marked `synced` to real app state, then clears
  // it from the queue. Deletion only ever happens here — never inside the sync
  // functions themselves — so a background run with no app open can't lose an
  // item the UI hasn't had a chance to reconcile yet.
  const reconcileSynced = useCallback(async () => {
    const items = await getAllQueuedEvidence()
    const done = items.filter((i) => i.status === 'synced')
    if (done.length === 0) return
    for (const item of done) {
      submitMilestoneProof(item.projectId, item.milestoneId)
      await deleteQueuedEvidence(item.id)
    }
    await refresh()
  }, [submitMilestoneProof, refresh])

  const syncNow = useCallback(async () => {
    setIsSyncing(true)
    try {
      await syncAllQueuedEvidence()
      await reconcileSynced()
    } finally {
      setIsSyncing(false)
    }
  }, [reconcileSynced])

  // Initial load, and reconcile anything a background-sync run finished while this tab was closed.
  useEffect(() => {
    refresh().then(() => reconcileSynced())
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

  // The service worker posts here after a Background Sync run completes.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'evidence-sync-complete') {
        refresh().then(() => reconcileSynced())
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [refresh, reconcileSynced])

  const enqueue = useCallback(
    async (input: EnqueueEvidenceInput) => {
      const item: QueuedEvidence = { ...input, id: newQueueId(), capturedAt: new Date().toISOString(), status: 'pending_sync', syncAttempts: 0 }
      await addQueuedEvidence(item)
      await refresh()

      if (navigator.onLine) {
        syncNow()
      } else if (backgroundSyncSupported) {
        const reg = await navigator.serviceWorker.ready
        await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(SYNC_TAG)
      }
      return item
    },
    [refresh, syncNow],
  )

  const pendingCount = queue.filter((i) => i.status !== 'synced').length

  return (
    <OfflineQueueContext.Provider value={{ isOnline, queue, pendingCount, isSyncing, backgroundSyncSupported, enqueue, syncNow }}>
      {children}
    </OfflineQueueContext.Provider>
  )
}

export const useOfflineQueue = () => useContext(OfflineQueueContext)
