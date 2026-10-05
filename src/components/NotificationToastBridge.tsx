import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context'
import { getSocket } from '../api/socket'
import { toastContentFor } from '../api/notifications'
import { toast } from './Toast'

interface RealtimeNotification {
  id?: string
  type: string
  payload?: Record<string, unknown>
}

/** Turns every real-time notification the backend pushes into an immediate
 * toast — the notification center stays the permanent record, this is the
 * instant feedback layer on top of it. Mounted once inside ToastProvider +
 * the router. Wording comes from the same catalog the notification center
 * renders from, so the two never disagree.
 *
 * Dedupe: keyed on the notification id, so a replayed socket event (or React
 * dev double-mount) can never toast the same notification twice. Two
 * deliberate suppressions avoid telling people what they are already looking
 * at: a new_message for the conversation that is currently open, and the
 * verification_assigned a verifier receives about the invitation they are in
 * the middle of accepting (that screen already confirms it). */
export function NotificationToastBridge() {
  const { devUserId } = useApp()
  const nav = useNavigate()

  useEffect(() => {
    if (!devUserId) return
    const socket = getSocket()
    const seen = new Set<string>()

    const onNotification = ({ id, type, payload = {} }: RealtimeNotification) => {
      const key = id ?? `${type}:${JSON.stringify(payload)}`
      if (seen.has(key)) return
      seen.add(key)

      const hash = window.location.hash
      if (type === 'new_message' && typeof payload.conversationId === 'string' && hash.includes(payload.conversationId)) return
      if (type === 'verification_assigned' && hash.includes('verifier-invite')) return

      const content = toastContentFor(type, payload)
      toast.show({
        title: content.title,
        description: content.description || undefined,
        tone: content.tone,
        dedupeKey: `notification:${key}`,
        // Errors and warnings deserve a little longer to be read.
        duration: content.tone === 'error' ? 6500 : content.tone === 'warning' ? 5500 : undefined,
        action: content.path ? { label: 'View', onClick: () => nav(content.path!) } : undefined,
      })
    }

    socket.on('notification:new', onNotification)
    return () => {
      socket.off('notification:new', onNotification)
    }
  }, [devUserId, nav])

  return null
}
