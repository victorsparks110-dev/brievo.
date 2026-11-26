import { cn } from '@/lib/utils'

/** Horizontal step indicator with progress, used in the multi-step brief flow. */
export function ProgressSteps({
  steps,
  current,
  className,
}: {
  steps: string[]
  current: number
  className?: string
}) {
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'upcoming'
        return (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                  state === 'done' && 'border-primary bg-primary text-primary-foreground',
                  state === 'active' && 'border-primary text-primary ring-2 ring-primary/20',
                  state === 'upcoming' && 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-xs sm:block',
                  state === 'active' ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-px flex-1 sm:mx-3',
                  i < current ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
