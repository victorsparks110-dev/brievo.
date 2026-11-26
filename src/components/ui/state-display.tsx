import { PackageOpen, ShieldAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Consistent empty-state used across list screens. */
export function EmptyState({
  title,
  description,
  icon: Icon = PackageOpen,
  actionLabel,
  onAction,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-background px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

/** Consistent error-state used when a service call fails. */
export function ErrorState({
  message = 'Unable to load. Please try again.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-background px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="size-6 text-destructive" />
      </div>
      <div>
        <p className="font-medium">Something went wrong</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  )
}
