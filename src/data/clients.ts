import type { Client } from '@/types'

/** External client profiles managed by the demo designer. */
export const mockClientsProfiles: Client[] = [
  {
    id: 'client-1',
    designerId: 'user-designer-1',
    name: 'Maya Thompson',
    email: 'maya@brightbloom.com',
    companyName: 'Bright Bloom Studio',
    phone: '+1 555 014 221',
    notes: 'Prefers warm, earthy tones. Brand refresh in progress.',
    createdAt: '2026-03-02T10:00:00.000Z',
    updatedAt: '2026-08-21T12:00:00.000Z',
  },
  {
    id: 'client-2',
    designerId: 'user-designer-1',
    name: 'David Okafor',
    email: 'david@nordica.co',
    companyName: 'Nordica Coffee',
    phone: '+1 555 014 882',
    notes: 'Coffee roastery, values a bold minimal look.',
    createdAt: '2026-04-05T10:00:00.000Z',
    updatedAt: '2026-08-11T12:00:00.000Z',
  },
  {
    id: 'client-3',
    designerId: 'user-designer-1',
    name: 'Sofia Reyes',
    email: 'sofia@movementfitness.com',
    companyName: 'Movement Fitness',
    phone: '+1 555 013 447',
    notes: 'Gym brand; energetic, modern identity.',
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-08-19T12:00:00.000Z',
  },
]
