/**
 * Central user model for BRIEVO.
 *
 * Authenticated BRIEVO users are designers. External clients are represented
 * by the separate Client record and do not have platform accounts.
 */

export type UserRole = 'designer' | 'support'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  avatar?: string
  createdAt: string
  updatedAt: string
}

/** Credentials submitted during sign up. */
export interface SignUpInput {
  name: string
  email: string
  phone: string
  password: string
}

/** Credentials submitted during login. */
export interface LoginInput {
  email: string
  password: string
}
