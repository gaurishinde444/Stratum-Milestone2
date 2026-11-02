import { getSession, setSession } from './session'

const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
export const isDemoMode = !BASE_URL

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) { super(message) }
}

/** JSON fetch against the backend. Sends the session token and signs the user out if it has expired. */
export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSession()?.token
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
    })
  } catch {
    throw new ApiError(`Could not reach the backend at ${BASE_URL}. Keep the backend running, then check ${BASE_URL}/health. If that page loads, restart Vite so it reloads VITE_API_BASE_URL.`)
  }
  if (response.status === 401 && token) {
    setSession(null)
    throw new ApiError('Your session has expired. Please sign in again.', 401)
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new ApiError(body?.message ?? `Request failed (${response.status})`, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
