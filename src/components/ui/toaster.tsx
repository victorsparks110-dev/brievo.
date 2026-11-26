import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'

/** Local render of the toast queue (no external library dependency). */
export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon =
          t.variant === 'destructive'
            ? XCircle
            : t.variant === 'success'
              ? CheckCircle2
              : Info
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-lg',
              t.variant === 'destructive'
                ? 'border-destructive/30'
                : t.variant === 'success'
                  ? 'border-primary/30'
                  : 'border-border'
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 size-5 shrink-0',
                t.variant === 'destructive'
                  ? 'text-destructive'
                  : t.variant === 'success'
                    ? 'text-primary'
                    : 'text-muted-foreground'
              )}
            />
            <div className="flex-1">
              {t.title && <p className="text-sm font-medium">{t.title}</p>}
              {t.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
