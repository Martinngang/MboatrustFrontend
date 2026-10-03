import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { getSocket } from './socket'

interface NotificationPayload {
  projectId?: string
  bidId?: string
  conversationId?: string
  [key: string]: unknown
}

/** Everything a dashboard screen renders — the role/admin stat payloads plus
 * the lists the Supplier/Verifier dashboards show beside their tiles.
 * invalidateQueries only refetches queries that are currently mounted, so
 * naming a key whose screen isn't open costs nothing. */
const DASHBOARD_KEYS = [
  ['dashboard'],
  ['platformStats'],
  ['activity'],
  ['materialOrders'],
  ['verificationTasks'],
  ['escrows', 'withdrawable'],
  ['landListings', 'mine'],
]

function refreshDashboards(qc: QueryClient) {
  for (const queryKey of DASHBOARD_KEYS) qc.invalidateQueries({ queryKey })
}

/** Mounted once at the app root (not per-screen) as soon as a real user is
 * known — connects the socket proactively (previously it was only ever
 * lazily created by opening a specific chat thread) and keeps whatever
 * screen is currently open fresh for everything OUTSIDE messaging, which
 * already has its own live-update path (see useConversationRealtime).
 *
 * Deliberately generic rather than a switch on notification `type`: every
 * notificationService.notify()/notifyMany() call on the backend already
 * carries whichever of these ids is relevant in its payload, so a new
 * notification type never needs a matching frontend change here. */
export function useGlobalRealtime(userId: string | null | undefined) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!userId) return
    const socket = getSocket()

    const onNotification = ({ payload }: { payload: NotificationPayload }) => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      if (payload?.projectId) {
        qc.invalidateQueries({ queryKey: ['project', payload.projectId] })
        qc.invalidateQueries({ queryKey: ['projects'] })
        // Staged funding: a fund, release, approval or at-risk acknowledgement on
        // this project changes per-milestone cover, escrow ledgers and contracts.
        for (const key of ['projectFundingSummary', 'escrow', 'transactions', 'contracts', 'contract', 'jobs']) {
          qc.invalidateQueries({ queryKey: [key] })
        }
      }
      if (payload?.bidId) {
        qc.invalidateQueries({ queryKey: ['bids'] })
      }
      if (payload?.conversationId) {
        qc.invalidateQueries({ queryKey: ['conversations'] })
      }
      refreshDashboards(qc)
    }

    const onProjectCreated = () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      // A new tender can become a contractor's "featured tender".
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    }

    // Emitted by the backend (services/dashboardEvents.js) whenever a write
    // could change one of THIS user's dashboard numbers — or any platform
    // number, for admins. Content-free: it only says "refetch".
    const onDashboardChanged = () => refreshDashboards(qc)

    // Events emitted while the socket was down (network blip, laptop sleep,
    // server restart) are never replayed, so a reconnect is itself a reason
    // to refetch. The very first connect is skipped — the screen just loaded.
    let connectedBefore = socket.connected
    const onConnect = () => {
      if (connectedBefore) refreshDashboards(qc)
      connectedBefore = true
    }

    socket.on('notification:new', onNotification)
    socket.on('project:created', onProjectCreated)
    socket.on('dashboard:changed', onDashboardChanged)
    socket.on('connect', onConnect)

    return () => {
      socket.off('notification:new', onNotification)
      socket.off('project:created', onProjectCreated)
      socket.off('dashboard:changed', onDashboardChanged)
      socket.off('connect', onConnect)
    }
  }, [userId, qc])
}
