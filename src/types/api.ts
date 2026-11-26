/**
 * Shared result/error contract returned by every service function.
 *
 * This gives the UI a consistent way to handle loading / success / error /
 * empty without ever leaking raw backend errors. When the backend is added,
 * services translate backend responses into this shape.
 */

export type ServiceErrorCode =
  | 'NETWORK'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UNKNOWN'
  | 'NOT_IMPLEMENTED'

export interface ServiceError {
  code: ServiceErrorCode
  /** Human-readable message safe to surface in the UI. */
  message: string
  /** Optional field-level validation errors. */
  fields?: Record<string, string>
}

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: ServiceError }

/** Convenience result for operations that succeed without returning data. */
export type ServiceResultVoid = ServiceResult<null>

/** A paginated slice, mirroring a future backend list endpoint. */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
