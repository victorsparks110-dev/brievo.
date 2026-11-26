import type { ServiceError, ServiceErrorCode, ServiceResult } from '@/types'

/**
 * Minimal HTTP client for the BRIEVO backend.
 *
 * Keeps the backend base URL, bearer-token persistence, and response/error
 * translation in one place so service modules never touch fetch directly.
 * Errors are always translated into the app-wide ServiceError shape — raw
 * network/server details are never surfaced to the UI.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const TOKEN_KEY = 'brievo:token'

export function getToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) {
      window.sessionStorage.setItem(TOKEN_KEY, token)
    } else {
      window.sessionStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    /* ignore storage failures */
  }
}

/** Optional field-level validation errors the backend may return. */
interface BackendErrorBody {
  success?: boolean
  message?: string
  fields?: Record<string, string>
}

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.'

function toServiceError(status: number, body: BackendErrorBody | null): ServiceError {
  let code: ServiceErrorCode
  if (status === 400) code = 'VALIDATION'
  else if (status === 401) code = 'UNAUTHORIZED'
  else if (status === 403) code = 'FORBIDDEN'
  else if (status === 409) code = 'CONFLICT'
  else if (status === 429) code = 'RATE_LIMITED'
  else if (status >= 500) code = 'UNKNOWN'
  else code = 'UNKNOWN'

  return {
    code,
    message: body?.message || FALLBACK_MESSAGE,
    fields: body?.fields,
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Attach the stored bearer token when true. */
  auth?: boolean
  /** When true, body is FormData — skip JSON.stringify and don't set Content-Type. */
  isFormData?: boolean
}

/**
 * Perform a request against the backend and normalize the outcome into a
 * ServiceResult. On success, `data` is the full parsed JSON body so callers
 * can pick out the fields they need (e.g. `data.user`, `data.token`).
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ServiceResult<T>> {
  const { method = 'GET', body, auth = false, isFormData = false } = options
  const token = auth ? getToken() : null

  const headers: Record<string, string> = {}
  // Don't set Content-Type for FormData — browser sets it with correct boundary
  if (!isFormData && body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? (isFormData ? body as FormData : JSON.stringify(body)) : undefined,
    })
  } catch {
    return {
      success: false,
      error: {
        code: 'NETWORK',
        message:
          'Unable to reach the server. Check your connection and try again.',
      },
    }
  }

  let data: BackendErrorBody | T | null = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (response.ok) {
    return { success: true, data: (data as T) ?? ({} as T) }
  }

  return {
    success: false,
    error: toServiceError(response.status, data as BackendErrorBody | null),
  }
}
