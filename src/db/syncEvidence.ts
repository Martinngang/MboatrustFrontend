import { getAllQueuedEvidence, updateQueuedEvidence, deleteQueuedEvidence, type QueuedEvidence } from './evidenceQueue'

/**
 * Stands in for `fetch('/api/projects/:id/milestones/:id/evidence', { method: 'POST', body })`.
 * This app has no backend (frontend-only demo — see AGENTS.md), so this simulates
 * the round trip with a delay and an occasional transient failure so the retry
 * path is real. Swap this one function for a real request when a backend exists;
 * nothing else in the queue/sync/UI layer needs to change.
 */
async function mockUploadToServer(_item: QueuedEvidence): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 700))
  if (Math.random() < 0.08) throw new Error('Upload interrupted — connection dropped before the server confirmed receipt.')
}

/**
 * Attempts every pending/failed item in the queue. Marks each `synced` on
 * success (the caller — the React provider — is responsible for applying the
 * synced item to app state and then deleting it; this function never deletes,
 * so a background-sync run that happens with no app open can't lose data the
 * UI hasn't had a chance to reconcile yet).
 */
export async function syncAllQueuedEvidence(): Promise<{ synced: number; failed: number }> {
  const items = (await getAllQueuedEvidence()).filter((i) => i.status === 'pending_sync' || i.status === 'failed')
  let synced = 0
  let failed = 0
  for (const item of items) {
    await updateQueuedEvidence({ ...item, status: 'syncing' })
    try {
      await mockUploadToServer(item)
      await updateQueuedEvidence({ ...item, status: 'synced' })
      synced++
    } catch (err) {
      failed++
      await updateQueuedEvidence({
        ...item,
        status: 'failed',
        syncAttempts: item.syncAttempts + 1,
        lastError: err instanceof Error ? err.message : 'Sync failed',
      })
    }
  }
  return { synced, failed }
}

/** Removes a queue item after the React layer has applied its effect to app state. */
export const clearSyncedEvidence = (id: string) => deleteQueuedEvidence(id)
