import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { auth } from '../services/auth'
import { AUTH_EVENT, getSession } from '../services/session'
import type { User } from '../types/models'

interface AuthValue {
  user: User | null
  register: typeof auth.register
  signIn: typeof auth.signIn
  signOut: typeof auth.signOut
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getSession()?.user ?? null)

  useEffect(() => {
    const sync = () => setUser(getSession()?.user ?? null)
    window.addEventListener(AUTH_EVENT, sync)
    window.addEventListener('storage', sync) // sign-in/out in another tab
    return () => { window.removeEventListener(AUTH_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])

  return <AuthContext.Provider value={{ user, register: auth.register, signIn: auth.signIn, signOut: auth.signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

/** Sends signed-out visitors to sign in, then brings them back to the page they wanted. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  return children
}
