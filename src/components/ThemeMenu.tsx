import { Moon, Sun } from 'lucide-react'
import { useThemePreference } from '../lib/theme'

/** One-tap light/dark switch, shown beside the profile or public sign-in links. */
export function ThemeToggle() {
  const { preference, choose } = useThemePreference()
  const current: 'dark' | 'light' = preference === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : preference
  const target = current === 'dark' ? 'light' : 'dark'
  const Icon = current === 'dark' ? Sun : Moon
  return <button type="button" className="theme-trigger theme-toggle" aria-label={`Switch to ${target} theme`} title={`Switch to ${target} theme`} aria-pressed={current === 'light'} onClick={() => choose(target)}>
    <Icon size={18} aria-hidden="true" />
  </button>
}

/** Kept as the public-header component name; it now toggles with a single tap. */
export function ThemeMenu() { return <ThemeToggle /> }
