import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export type NotificationChannelPrefs = { push: boolean; email: boolean }
export type NotificationPrefs = Record<string, NotificationChannelPrefs>

interface BackendPreference {
  userId: string
  prefs: NotificationPrefs
}

export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async (): Promise<NotificationPrefs> => {
      const { data } = await api.get<{ data: BackendPreference }>('/notification-preferences/me')
      return data.data.prefs
    },
    staleTime: 10_000,
  })
}

/** Body is a partial map — {bids: {push: false}} only touches that one
 * category/channel, matching the backend's own partial-merge behavior (see
 * notificationPreferenceController.updateMine). */
export function useUpdateNotificationPreferencesMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPrefs>) => {
      const { data } = await api.put<{ data: BackendPreference }>('/notification-preferences/me', patch)
      return data.data.prefs
    },
    onSuccess: (prefs) => qc.setQueryData(['notificationPreferences'], prefs),
  })
}
