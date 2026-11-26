import { describe, expect, it } from 'vitest'

import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges class names and deduplicates tailwind conflicts', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })

  it('handles conditional and falsy values', () => {
    expect(cn('base', false && 'no', null, undefined, 'keep')).toBe(
      'base keep'
    )
  })
})
