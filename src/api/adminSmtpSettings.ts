import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

// The password itself never round-trips to this client — see
// adminSmtpSettingsController.getSettings's own doc comment. `hasPassword`
// is the only signal the form gets, so "leave blank to keep the current
// password" has something real to check against.
export interface SmtpSettings {
  host: string
  port: number
  secure: boolean
  username: string
  fromEmail: string
  fromName: string
  enabled: boolean
  hasPassword: boolean
  source: 'database' | 'env'
  updatedAt: string | null
  updatedBy: { fullName: string; email?: string } | string | null
}

export interface SmtpSettingsInput {
  host: string
  port: number
  secure: boolean
  username: string
  password?: string
  fromEmail: string
  fromName: string
  enabled: boolean
}

export function useSmtpSettingsQuery() {
  return useQuery({
    queryKey: ['adminSmtpSettings'],
    queryFn: async (): Promise<SmtpSettings> => {
      const { data } = await api.get<{ data: SmtpSettings }>('/admin/smtp-settings')
      return data.data
    },
    staleTime: 10_000,
  })
}

export function useUpdateSmtpSettingsMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SmtpSettingsInput) => {
      const { data } = await api.put<{ data: SmtpSettings }>('/admin/smtp-settings', input)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminSmtpSettings'] }),
  })
}

export interface SendTestEmailInput {
  to: string
  // Optional field-by-field overrides — testing unsaved form values before
  // committing them. Omitting all of these tests whatever's already saved.
  host?: string
  port?: number
  secure?: boolean
  username?: string
  password?: string
  fromEmail?: string
  fromName?: string
}

export function useSendTestEmailMutation() {
  return useMutation({
    mutationFn: async (input: SendTestEmailInput) => {
      const { data } = await api.post<{ data: { success: boolean; error: string | null } }>('/admin/smtp-settings/test', input)
      return data.data
    },
  })
}
