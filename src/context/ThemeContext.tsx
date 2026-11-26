import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'brievo-theme'

type ThemeMode = 'dark' | 'light'

interface ThemeContextValue {
  /** True when Light Mode is enabled. */
  lightMode: boolean
  /** Toggle between Light Mode and the default dark-blue theme. */
  toggleLightMode: () => void
  /** Explicitly set the mode. */
  setLightMode: (enabled: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function readStoredMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => readStoredMode())

  // Apply the class to <html> and persist the choice.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('light', mode === 'light')
    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Ignore storage failures (e.g. private mode) — theme still applies now.
    }
  }, [mode])

  const setLightMode = useCallback((enabled: boolean) => {
    setMode(enabled ? 'light' : 'dark')
  }, [])

  const toggleLightMode = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ lightMode: mode === 'light', toggleLightMode, setLightMode }),
    [mode, toggleLightMode, setLightMode]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
