import axios from 'axios'
import { firebaseConfigured } from '../firebase'
import { getCurrentIdToken } from './firebaseAuth'

/**
 * Dev-bypass bridge (see devAuth.ts) — used whenever Firebase isn't
 * configured, or as a fallback if a Firebase user somehow has no valid
 * token. Kept even after real auth exists so the app still works without a
 * Firebase project, same "sandbox-first" pattern as the payment services.
 */
let currentDevUserId: string | null = null
export function setDevUserId(id: string | null) {
  currentDevUserId = id
}

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:5000/api/v1'

export const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use(async (config) => {
  const idToken = firebaseConfigured ? await getCurrentIdToken().catch(() => null) : null
  config.headers = config.headers ?? {}
  if (idToken) {
    config.headers.Authorization = `Bearer ${idToken}`
  } else if (currentDevUserId) {
    config.headers['x-dev-user-id'] = currentDevUserId
  }
  return config
})

export interface ApiErrorShape {
  error?: { message?: string }
}

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorShape | undefined
    return body?.error?.message || err.message || fallback
  }
  return fallback
}
