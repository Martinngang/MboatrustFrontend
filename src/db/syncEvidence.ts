import { getAllQueuedEvidence } from './evidenceQueue'

/**
 * The real upload (multipart evidence POST, with Firebase/dev-bypass auth) can
 * only happen on the main thread — it needs the live auth session from
 * `context.tsx`/`api/client.ts`, which a service worker has no access to. This
 * just answers "is there anything worth waking a client tab up for", so the
 * `sync` handler in `src/sw.ts` can decide whether to notify open clients.
 */
export async function hasQueuedEvidence(): Promise<boolean> {
  const items = await getAllQueuedEvidence()
  return items.some((i) => i.status === 'pending_sync' || i.status === 'failed')
}
