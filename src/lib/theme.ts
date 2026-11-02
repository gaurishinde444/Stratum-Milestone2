import { useEffect, useState } from 'react'
import { load, save } from './storage'

export type ThemePreference = 'dark' | 'light' | 'system'
type Theme = 'dark' | 'light'

/** Stored as `projectmentor:theme`; index.html reads the same key before first paint to avoid a flash. */
const THEME_KEY = 'theme'
const META_COLORS: Record<Theme, string> = { dark: '#0B0D12', light: '#F7F6F2' }
const media = () => window.matchMedia('(prefers-color-scheme: light)')

export const getThemePreference = (): ThemePreference => {
  const saved = load<ThemePreference | null>(THEME_KEY, null)
  return saved === 'light' || saved === 'system' ? saved : 'dark'
}
const resolve = (pref: ThemePreference): Theme => pref === 'system' ? (media().matches ? 'light' : 'dark') : pref

function applyTheme(pref: ThemePreference) {
  const theme = resolve(pref)
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[theme])
}

/** The saved theme preference and a setter; "system" follows the device's light/dark setting live. */
export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>(getThemePreference)

  useEffect(() => {
    applyTheme(preference)
    if (preference !== 'system') return
    const onChange = () => applyTheme('system')
    const m = media()
    m.addEventListener('change', onChange)
    return () => m.removeEventListener('change', onChange)
  }, [preference])

  const choose = (next: ThemePreference) => { save(THEME_KEY, next); applyTheme(next); setPreference(next) }
  return { preference, choose }
}
