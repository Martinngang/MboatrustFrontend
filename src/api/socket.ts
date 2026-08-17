import { io, type Socket } from 'socket.io-client'
import { API_BASE_URL, getDevUserId } from './client'
import { firebaseConfigured } from '../firebase'
import { getCurrentIdToken } from './firebaseAuth'

let socket: Socket | null = null

/** One shared connection for the whole app. Sends the same credential the
 * REST API's request interceptor attaches (see client.ts) via the handshake
 * `auth` payload, so the server can resolve a real user before allowing a
 * `conversation:join` — mirrors server.js's `io.use` middleware. Passed as a
 * function (not a plain object) so it's re-evaluated on every reconnect,
 * since the Firebase token can expire or the dev user can change between
 * connections. */
export function getSocket(): Socket {
  if (!socket) {
    const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '')
    socket = io(origin, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      auth: (cb) => {
        ;(async () => {
          const token = firebaseConfigured ? await getCurrentIdToken().catch(() => null) : null
          cb(token ? { token } : { devUserId: getDevUserId() })
        })()
      },
    })
  }
  return socket
}
