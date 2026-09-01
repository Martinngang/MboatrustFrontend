import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'mboatrust-theme'
const SUNLIGHT_STORAGE_KEY = 'mboatrust-sunlight-mode'

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

interface ThemeContextValue {
  theme: Theme
  isSunlightMode: boolean
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  toggleSunlightMode: () => void
}

const ThemeContext = createContext<ThemeContextValue>({} as ThemeContextValue)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const [isSunlightMode, setIsSunlightMode] = useState<boolean>(() => {
    return localStorage.getItem(SUNLIGHT_STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = isSunlightMode ? 'light' : theme
    if (isSunlightMode) {
      document.documentElement.classList.add('sunlight-mode')
    } else {
      document.documentElement.classList.remove('sunlight-mode')
    }
    localStorage.setItem(STORAGE_KEY, theme)
    localStorage.setItem(SUNLIGHT_STORAGE_KEY, String(isSunlightMode))
  }, [theme, isSunlightMode])

  const setTheme = (t: Theme) => setThemeState(t)
  const toggleTheme = () => setThemeState((t) => (t === 'light' ? 'dark' : 'light'))
  const toggleSunlightMode = () => setIsSunlightMode((prev) => !prev)

  return (
    <ThemeContext.Provider value={{ theme, isSunlightMode, setTheme, toggleTheme, toggleSunlightMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
