import type {
  LoginInput,
  ServiceResult,
  SignUpInput,
  User,
} from '@/types'
import type { MockUser } from '@/data/users'
import {
  getCollection,
} from './mockStorage'
import { DEMO_ACCOUNTS, mockDesigners } from '@/data/users'
import { fail, ok } from './serviceHelpers'
import { apiRequest, getToken, setToken } from './apiClient'

/**
 * Authentication service.
 *
 * Connects to the real BRIEVO backend (MongoDB-backed) for login, signup,
 * session restore, and logout. The public API mirrors the backend contract so
 * the UI never touches HTTP directly and the design stays unchanged.
 *
 * Some demo-only helpers (getUserById, updateCurrentUser, demo account lists)
 * still read mock local data so the rest of the demo app keeps working.
 */

interface BackendUser {
  id: string
  name: string
  email: string
  phone?: string
  role: 'designer' | 'support'
  createdAt?: string
}

/** Map a backend user payload to the frontend User model. */
function mapBackendUser(backend: BackendUser): User {
  const createdAt = backend.createdAt ?? new Date().toISOString()
  return {
    id: backend.id,
    name: backend.name,
    email: backend.email,
    phone: backend.phone,
    role: backend.role,
    createdAt,
    updatedAt: createdAt,
  }
}

function toUserRecord(mock: MockUser): User {
  const { demoPassword: _demoPassword, ...user } = mock
  return user
}

/** Authenticate against the backend and persist the returned JWT. */
export async function login(
  input: LoginInput
): Promise<ServiceResult<User>> {
  // Backend login: { success, data: { user, token } }
  const result = await apiRequest<{
    success: boolean
    data: { user: BackendUser; token: string }
  }>('/api/auth/login', { method: 'POST', body: input })
  if (!result.success) return result
  setToken(result.data.data.token)
  return ok(mapBackendUser(result.data.data.user))
}

/**
 * Register a new account through the backend. The user must verify their
 * email before they can log in — so signup does NOT automatically log in.
 *
 * On success the caller should redirect to the verify-email page.
 */
export async function signUp(
  input: SignUpInput
): Promise<ServiceResult<User & { trackingToken?: string }>> {
  // Backend signup: { success, message, user, trackingToken }
  const result = await apiRequest<{
    success: boolean
    message: string
    user: BackendUser
    trackingToken?: string
  }>('/api/auth/signup', {
    method: 'POST',
    body: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      password: input.password,
    },
  })
  if (!result.success) return result as ServiceResult<User & { trackingToken?: string }>
  return ok({ ...mapBackendUser(result.data.user), trackingToken: result.data.trackingToken })
}

/** Clear the stored session token. */
export async function logout(): Promise<ServiceResult<null>> {
  setToken(null)
  return ok(null)
}

/**
 * Restore the current user on refresh / initial load using the stored token.
 * Returns null when no (valid) session exists.
 */
export async function getCurrentUser(): Promise<ServiceResult<User | null>> {
  if (!getToken()) return ok(null)
  // Backend /me: { success, user }
  const result = await apiRequest<{
    success: boolean
    user: BackendUser
  }>('/api/auth/me', { auth: true })
  if (!result.success) {
    // Invalid/expired token should not leave a broken session behind.
    if (result.error.code === 'UNAUTHORIZED') setToken(null)
    return ok(null)
  }
  return ok(mapBackendUser(result.data.user))
}

/**
 * Request a password reset link for the given email.
 *
 * Sends the email to POST /api/auth/forgot-password. The backend generates
 * a secure reset token, stores its hash, and emails the reset link. The
 * response is always generic to prevent account enumeration.
 */
export async function requestPasswordReset(
  email: string
): Promise<ServiceResult<null>> {
  const result = await apiRequest<{ success: boolean; message: string }>(
    '/api/auth/forgot-password',
    { method: 'POST', body: { email } }
  )
  if (!result.success) return result as ServiceResult<null>
  return ok(null)
}

/**
 * Reset the password using a backend-issued reset token.
 *
 * Sends the token and new password to POST /api/auth/reset-password.
 * The backend validates the token, hashes the new password, saves it,
 * and invalidates the reset token (single-use).
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<ServiceResult<null>> {
  const result = await apiRequest<{ success: boolean; message: string }>(
    '/api/auth/reset-password',
    { method: 'POST', body: { token, newPassword } }
  )
  if (!result.success) return result as ServiceResult<null>
  return ok(null)
}

export async function isAuthenticated(): Promise<boolean> {
  const result = await getCurrentUser()
  return result.success && result.data !== null
}

/** Verify a user's email address with a 6-digit code. */
export async function verifyEmail(
  email: string,
  verificationCode: string
): Promise<ServiceResult<null>> {
  const result = await apiRequest<{ success: boolean; message: string }>(
    '/api/auth/verify-email',
    { method: 'POST', body: { email, verificationCode } }
  )
  if (!result.success) return result as ServiceResult<null>
  return ok(null)
}

/** Resend a verification code for an unverified account. */
export async function resendVerification(
  email: string
): Promise<ServiceResult<null>> {
  const result = await apiRequest<{ success: boolean; message: string }>(
    '/api/auth/resend-verification',
    { method: 'POST', body: { email } }
  )
  if (!result.success) return result as ServiceResult<null>
  return ok(null)
}

/** Get an existing user by id (used in other services to resolve owners). */
export function getUserById(id: string): User | null {
  const users = getCollection('users')
  const found = users.find((u) => u.id === id)
  return found ? toUserRecord(found) : null
}

export function getDemoAccounts(): Array<{
  label: string
  email: string
}> {
  return DEMO_ACCOUNTS.map((a) => ({ label: a.label, email: a.email }))
}

/** List seeded designer accounts (for demo login UI). */
export function listDemoDesigners(): Array<{ name: string; email: string }> {
  return mockDesigners.map((d) => ({ name: d.name, email: d.email }))
}

/** Update the current user's profile/settings via the backend. */
export async function updateCurrentUser(
  updates: Partial<Pick<User, 'name' | 'avatar' | 'phone'>>
): Promise<ServiceResult<User | null>> {
  // Only send allowed fields to the backend (name, phone).
  // Avatar is not supported by the backend yet.
  const body: Record<string, unknown> = {}
  if (updates.name !== undefined) body.name = updates.name
  if (updates.phone !== undefined) body.phone = updates.phone

  if (Object.keys(body).length === 0) {
    return ok(null)
  }

  const result = await apiRequest<{
    success: boolean
    user: BackendUser
  }>('/api/auth/me', { method: 'PATCH', body, auth: true })

  if (!result.success) {
    // If unauthorized, clear the token.
    if (result.error.code === 'UNAUTHORIZED') setToken(null)
    return fail(result.error)
  }

  return ok(mapBackendUser(result.data.user))
}
