import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Full-page loading indicator used during routing/data loads. */
export function PageLoader({
  label = 'Loading...',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center gap-3 p-6',
        className
      )}
    >
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
