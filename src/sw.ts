/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { syncAllQueuedEvidence } from './db/syncEvidence'

declare const self: ServiceWorkerGlobalScope

// The Background Sync API isn't part of TypeScript's built-in DOM/webworker
// libs yet (still not universally shipped — no Safari support), so it needs
// its own minimal ambient type here.
interface SyncEvent extends ExtendableEvent {
  readonly tag: string
  readonly lastChance: boolean
}

// Precaches the app shell — replaces the generateSW output from vite-plugin-pwa's
// default strategy. HashRouter means every route is the same document, so this
// (plus the NavigationRoute below) covers the whole app offline.
precacheAndRoute(self.__WB_MANIFEST)

// Every browser navigation — even to a "different" hash route — requests the
// same document, since #/path never leaves the client. This is what lets a
// direct/refreshed load of any route still work with no connection.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

registerRoute(
  ({ url }) => url.origin === 'https://static.figma.com',
  new CacheFirst({
    cacheName: 'brand-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

registerRoute(
  ({ url }) => url.origin === 'https://images.unsplash.com',
  new CacheFirst({
    cacheName: 'project-images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

const EVIDENCE_SYNC_TAG = 'sync-evidence'

// Background Sync: the OS wakes this worker when connectivity returns, even if
// no app tab is open. Not supported in Safari/iOS — the app's manual "Retry
// sync" button (src/offlineQueue.tsx) is the fallback path for those browsers.
self.addEventListener('sync', (event) => {
  const syncEvent = event as SyncEvent
  if (syncEvent.tag !== EVIDENCE_SYNC_TAG) return
  syncEvent.waitUntil(
    syncAllQueuedEvidence().then(async ({ synced, failed }) => {
      if (synced === 0 && failed === 0) return
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) client.postMessage({ type: 'evidence-sync-complete', synced, failed })
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
