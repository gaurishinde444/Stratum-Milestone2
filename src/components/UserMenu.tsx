import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!user) return null
  const firstName = user.name.split(' ')[0]

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    setSigningOut(false)
    navigate('/', { replace: true })
  }

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-trigger" aria-haspopup="menu" aria-expanded={open} aria-controls="user-menu-list" onClick={() => setOpen(v => !v)}>
        <span className="avatar" aria-hidden="true">{firstName[0]?.toUpperCase()}</span>
        <span className="user-name">{firstName}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="user-dropdown" id="user-menu-list" role="menu">
          <div className="user-dropdown-head"><strong>{user.name}</strong><span>{user.email}</span></div>
          <Link role="menuitem" to="/onboarding?edit=1" state={{ from: location.pathname }}><UserRound size={15} /> Edit profile</Link>
          <button role="menuitem" type="button" onClick={handleSignOut} disabled={signingOut}><LogOut size={15} /> {signingOut ? 'Signing out…' : 'Sign out'}</button>
        </div>
      )}
    </div>
  )
}
