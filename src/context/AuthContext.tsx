import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { LoginInput, ServiceResult, SignUpInput, User } from '@/types'
import * as authService from '@/services/authService'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  login: (input: LoginInput) => Promise<ServiceResult<User>>
  signUp: (input: SignUpInput) => Promise<ServiceResult<User & { trackingToken?: string }>>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  updateProfile: (updates: Partial<Pick<User, 'name' | 'avatar' | 'phone'>>) => Promise<boolean>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const result = await authService.getCurrentUser()
    if (result.success) {
      setUser(result.data)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (input: LoginInput) => {
    setError(null)
    const result = await authService.login(input)
    if (result.success) {
      setUser(result.data)
    }
    return result
  }, [])

  const signUp = useCallback(async (input: SignUpInput): Promise<ServiceResult<User & { trackingToken?: string }>> => {
    setError(null)
    const result = await authService.signUp(input)
    if (!result.success) {
      setError(result.error.message)
    }
    return result
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const updateProfile = useCallback(
    async (updates: Partial<Pick<User, 'name' | 'avatar' | 'phone'>>) => {
      const result = await authService.updateCurrentUser(updates)
      if (result.success) {
        setUser(result.data ?? user)
        return true
      }
      setError(result.error.message)
      return false
    },
    [user]
  )

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      error,
      login,
      signUp,
      logout,
      refresh,
      updateProfile,
      clearError,
    }),
    [user, isLoading, error, login, signUp, logout, refresh, updateProfile, clearError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
