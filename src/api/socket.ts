import { io, type Socket } from 'socket.io-client'
import { API_BASE_URL } from './client'

let socket: Socket | null = null

/** One shared connection for the whole app, matching the backend's setup in
 * server.js (a single Socket.io server, no auth handshake yet — same
 * dev-bypass-era trust model as the REST API's x-dev-user-id header). */
export function getSocket(): Socket {
  if (!socket) {
    const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '')
    socket = io(origin, { autoConnect: true, transports: ['websocket', 'polling'] })
  }
  return socket
}
