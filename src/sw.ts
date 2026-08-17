/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'
import { hasQueuedEvidence } from './db/syncEvidence'

declare const self: ServiceWorkerGlobalScope

// Same public web config as src/firebase.ts, reused here so a push that
// arrives with no app tab open still shows a real system notification
// instead of silently doing nothing — `getToken()` (see api/push.ts) only
// works at all once this registration exists, since it's what Firebase
// attaches the push subscription to.
if (import.meta.env.VITE_FIREBASE_API_KEY) {
  const firebaseApp = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    messagingSenderId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.split(':')[1],
  })
  const messaging = getMessaging(firebaseApp)
  onBackgroundMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'Mboa Trust'
    self.registration.showNotification(title, {
      body: payload.notification?.body,
      icon: '/icons/icon-192.png',
      data: payload.data,
    })
  })
}

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
// no app tab is open. The actual authenticated upload can only run on the main
// thread (it needs the live Firebase/dev-bypass session), so this just notifies
// any open client tabs to run their real sync — if none are open, the queue
// stays put and gets picked up the next time the app opens or comes online
// (see src/offlineQueue.tsx). Not supported in Safari/iOS — the app's manual
// "Retry sync" button is the fallback path for those browsers.
self.addEventListener('sync', (event) => {
  const syncEvent = event as SyncEvent
  if (syncEvent.tag !== EVIDENCE_SYNC_TAG) return
  syncEvent.waitUntil(
    hasQueuedEvidence().then(async (hasWork) => {
      if (!hasWork) return
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) client.postMessage({ type: 'evidence-sync-requested' })
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
