import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** Label + control + optional error hint wrapper for form fields. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  required,
  className,
}: {
  label?: string
  htmlFor?: string
  error?: string
  hint?: string
  children: ReactNode
  required?: boolean
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
