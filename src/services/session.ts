/** The signed-in user's session. Kept in its own module so both the HTTP client and auth service can use it. */
import { load, remove, save } from '../lib/storage'
import type { AuthSession } from '../types/models'

const SESSION_KEY = 'session'

/** Fired on window whenever the session changes (sign in, sign out, expiry). */
export const AUTH_EVENT = 'projectmentor:auth'

export const getSession = () => load<AuthSession | null>(SESSION_KEY, null)

export function setSession(session: AuthSession | null) {
  if (session) save(SESSION_KEY, session)
  else remove(SESSION_KEY)
  window.dispatchEvent(new Event(AUTH_EVENT))
}
