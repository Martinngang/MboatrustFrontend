// Plain IndexedDB access — no React, no bundler-specific imports — so this
// module can be shared verbatim between the main app thread and the service
// worker (src/sw.ts), which is what lets Background Sync durably read/write
// the same queue the UI shows.

export type QueueStatus = 'pending_sync' | 'syncing' | 'synced' | 'failed'

export interface QueuedEvidence {
  id: string
  projectId: string
  projectTitle: string
  milestoneId: string
  milestoneTitle: string
  photos: string[] // data URLs — safe to store offline, no network needed to render
  notes: string
  geotag: { lat: number; lng: number; label: string } | null
  capturedAt: string // ISO timestamp, set at capture time (not sync time)
  status: QueueStatus
  syncAttempts: number
  lastError?: string
}

const DB_NAME = 'mboatrust-offline'
const DB_VERSION = 1
const STORE = 'evidence-queue'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const store = tx.objectStore(STORE)
        const req = run(store)
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const addQueuedEvidence = (item: QueuedEvidence) => withStore<void>('readwrite', (s) => s.add(item))
export const updateQueuedEvidence = (item: QueuedEvidence) => withStore<void>('readwrite', (s) => s.put(item))
export const deleteQueuedEvidence = (id: string) => withStore<void>('readwrite', (s) => s.delete(id))
export const getAllQueuedEvidence = () => withStore<QueuedEvidence[]>('readonly', (s) => s.getAll())

export function newQueueId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
