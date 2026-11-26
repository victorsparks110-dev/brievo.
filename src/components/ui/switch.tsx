import * as React from 'react'

import { cn } from '@/lib/utils'

interface SwitchProps extends Omit<React.ComponentProps<'button'>, 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

/** Accessible switch control styled with the app's theme tokens. */
function Switch({
  className,
  checked = false,
  onCheckedChange,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-input bg-muted shadow-xs transition-colors outline-none focus-visible:ring-focus-ring/30 focus-visible:ring-[3px] focus-visible:border-focus-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        className
      )}
      {...props}
    >
      <span
        data-state={checked ? 'checked' : 'unchecked'}
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
          'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5'
        )}
      />
    </button>
  )
}

export { Switch }
