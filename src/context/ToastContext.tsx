import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant: 'default' | 'success' | 'destructive'
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (toast: Omit<Toast, 'id' | 'variant'> & { variant?: Toast['variant'] }) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

let toastCount = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (input: Omit<Toast, 'id' | 'variant'> & { variant?: Toast['variant'] }) => {
      const id = `toast-${Date.now()}-${toastCount++}`
      setToasts((prev) => [
        ...prev,
        { id, variant: 'default', ...input },
      ])
      window.setTimeout(() => dismiss(id), 5000)
    },
    [dismiss]
  )

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, toast, dismiss }),
    [toasts, toast, dismiss]
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
