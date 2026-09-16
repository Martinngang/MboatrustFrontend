import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from './socket'

interface NotificationPayload {
  projectId?: string
  bidId?: string
  conversationId?: string
  [key: string]: unknown
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
      }
      if (payload?.bidId) {
        qc.invalidateQueries({ queryKey: ['bids'] })
      }
      if (payload?.conversationId) {
        qc.invalidateQueries({ queryKey: ['conversations'] })
      }
    }

    const onProjectCreated = () => {
      qc.invalidateQueries({ queryKey: ['jobs'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    }

    socket.on('notification:new', onNotification)
    socket.on('project:created', onProjectCreated)

    return () => {
      socket.off('notification:new', onNotification)
      socket.off('project:created', onProjectCreated)
    }
  }, [userId, qc])
}
