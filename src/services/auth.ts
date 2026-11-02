/**
 * Account registration, sign-in and sign-out.
 *
 * Demo mode keeps accounts in this browser's localStorage with salted SHA-256 password hashes.
 * That is NOT real security — anyone with access to the device can read the data — so it exists
 * only to demo the flow. With VITE_API_BASE_URL set, the backend owns accounts and issues tokens.
 */
import { load, newId, save } from '../lib/storage'
import type { AuthSession, User } from '../types/models'
import { ApiError, http, isDemoMode } from './http'
import { setSession } from './session'

export interface RegisterInput { name: string; email: string; password: string }
export interface SignInInput { email: string; password: string }

interface DemoAccount extends User { salt: string; passwordHash: string }

const ACCOUNTS_KEY = 'demo-accounts'
const readAccounts = () => load<DemoAccount[]>(ACCOUNTS_KEY, [])
const normaliseEmail = (email: string) => email.trim().toLowerCase()
const toUser = ({ id, name, email, createdAt }: DemoAccount): User => ({ id, name, email, createdAt })

async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  if (!globalThis.crypto?.subtle) throw new ApiError('Secure sign-in needs HTTPS or localhost. Open the app via http://localhost.')
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

export const auth = {
  async register(input: RegisterInput): Promise<User> {
    const email = normaliseEmail(input.email)
    if (!isDemoMode) {
      const session = await http<AuthSession>('/auth/register', { method: 'POST', body: JSON.stringify({ ...input, email }) })
      setSession(session)
      return session.user
    }
    const accounts = readAccounts()
    if (accounts.some(a => a.email === email)) throw new ApiError('An account with this email already exists.', 409)
    const salt = newId('salt')
    const account: DemoAccount = { id: newId('usr'), name: input.name.trim(), email, createdAt: new Date().toISOString(), salt, passwordHash: await hashPassword(input.password, salt) }
    save(ACCOUNTS_KEY, [...accounts, account])
    setSession({ user: toUser(account), token: newId('demo') })
    return toUser(account)
  },

  async signIn(input: SignInInput): Promise<User> {
    const email = normaliseEmail(input.email)
    if (!isDemoMode) {
      const session = await http<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: input.password }) })
      setSession(session)
      return session.user
    }
    const account = readAccounts().find(a => a.email === email)
    // Same message for unknown email and wrong password, so the form doesn't reveal which accounts exist.
    if (!account || account.passwordHash !== await hashPassword(input.password, account.salt)) throw new ApiError('Email or password is incorrect.', 401)
    setSession({ user: toUser(account), token: newId('demo') })
    return toUser(account)
  },

  /**
   * Forgot password: sets a new password for the account with this email.
   * NOTE: by design choice there is no check that the person owns the email (no emailed link
   * or code), so anyone who knows a student's email can change their password. Acceptable for
   * the classroom demo only; see docs/ARCHITECTURE.md §4 before using this for real accounts.
   */
  async resetPasswordByEmail(rawEmail: string, password: string): Promise<void> {
    const email = normaliseEmail(rawEmail)
    if (!isDemoMode) {
      await http<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, password }) })
      return
    }
    const accounts = readAccounts()
    const account = accounts.find(a => a.email === email)
    if (!account) throw new ApiError('No account found with this email.', 404)
    const salt = newId('salt')
    const passwordHash = await hashPassword(password, salt)
    save(ACCOUNTS_KEY, accounts.map(a => a.id === account.id ? { ...a, salt, passwordHash } : a))
  },

  async signOut(): Promise<void> {
    if (!isDemoMode) await http<void>('/auth/logout', { method: 'POST' }).catch(() => undefined)
    setSession(null)
  },
}
