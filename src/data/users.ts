import type { User } from '@/types'

/**
 * Mock users for the demo. Passwords are simulated and stored ONLY in this
 * mock data file under a clearly fake `demoPassword` field. A real backend
 * must use secure, server-side authentication — this is not secure.
 */
export interface MockUser extends User {
  /** DEMO ONLY. Never used in production; represents a stored password. */
  demoPassword: string
}

export const mockDesigners: MockUser[] = [
  {
    id: 'user-designer-1',
    name: 'Alex Morgan',
    email: 'designer@demo.com',
    demoPassword: 'demo123',
    role: 'designer',
    avatar: 'AM',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-08-20T12:00:00.000Z',
  },
  {
    id: 'user-designer-2',
    name: 'Riley Chen',
    email: 'designer2@demo.com',
    demoPassword: 'demo123',
    role: 'designer',
    avatar: 'RC',
    createdAt: '2026-02-14T09:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
  },
]

export const mockUsers: MockUser[] = mockDesigners

/**
 * Demo accounts exposed on the login screen for quick access.
 * These are development shortcuts only — not production credentials.
 * 
 * Note: Clients do not need to log in. They access projects through unique public links.
 * Designers use standard email/password authentication.
 */
export const DEMO_ACCOUNTS: Array<{
  label: string
  email: string
  password: string
}> = mockDesigners.map((designer) => ({
  label: designer.name,
  email: designer.email,
  password: designer.demoPassword,
}))
