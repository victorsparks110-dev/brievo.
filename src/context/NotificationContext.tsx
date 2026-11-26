import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppNotification } from '@/types'
import * as notificationService from '@/services/notificationService'
import { useAuth } from './AuthContext'

interface NotificationContextValue {
  notifications: AppNotification[]
  isLoading: boolean
  unreadCount: number
  refresh: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setIsLoading(false)
      return
    }
    const result = await notificationService.getNotifications(user.id)
    if (result.success) {
      setNotifications(result.data)
    }
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const markAsRead = useCallback(async (id: string) => {
    const result = await notificationService.markAsRead(id)
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? result.data : n))
      )
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user) return
    await notificationService.markAllAsRead(user.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [user])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      isLoading,
      unreadCount,
      refresh,
      markAsRead,
      markAllAsRead,
    }),
    [notifications, isLoading, unreadCount, refresh, markAsRead, markAllAsRead]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    )
  }
  return ctx
}
