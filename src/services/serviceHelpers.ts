import type { ServiceError, ServiceResult } from '@/types'

/** Simulate network latency so loading states are observable in demo mode. */
export function delay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data }
}

export function fail(error: ServiceError): ServiceResult<never> {
  return { success: false, error }
}

/** Wrap a throwing operation into a predictable ServiceResult. */
export async function run<T>(
  fn: () => Promise<T>,
  message = 'Something went wrong.'
): Promise<ServiceResult<T>> {
  try {
    const data = await fn()
    return ok(data)
  } catch {
    return fail({ code: 'UNKNOWN', message })
  }
}

/** Build a not-found error. */
export function notFound(what = 'Record'): ServiceError {
  return { code: 'NOT_FOUND', message: `${what} not found.` }
}
