import { Check } from 'lucide-react'
import type { BriefService } from '@/types'
import { BRIEF_SERVICE_LABELS } from '@/types/brief'
import { cn } from '@/lib/utils'

/** All design services a client can select from. */
export const ALL_SERVICES: BriefService[] = [
  'logo_design',
  'brand_identity',
  'social_media',
  'flyer_poster',
  'business_card',
  'packaging',
  'other',
]

/** Multi-select card grid for choosing design services. */
export function ServiceSelector({
  value,
  onChange,
}: {
  value: BriefService[]
  onChange: (next: BriefService[]) => void
}) {
  const toggle = (service: BriefService) => {
    onChange(
      value.includes(service)
        ? value.filter((s) => s !== service)
        : [...value, service]
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ALL_SERVICES.map((service) => {
        const selected = value.includes(service)
        return (
          <button
            key={service}
            type="button"
            onClick={() => toggle(service)}
            className={cn(
              'flex items-center justify-between rounded-xl border px-4 py-4 text-left transition-colors',
              selected
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'hover:bg-muted/60'
            )}
          >
            <span className="text-sm font-medium">
              {BRIEF_SERVICE_LABELS[service]}
            </span>
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-md border',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'
              )}
            >
              {selected && <Check className="size-3.5" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
