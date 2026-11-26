import { useCallback, useEffect, useState } from 'react'

/**
 * A small async-data hook that models the core UI states:
 *   loading | success (data) | error
 *
 * Pass a `load` function that returns a ServiceResult; the hook resolves it
 * into `data`, `status`, and `error` so pages can render skeletons, success
 * content, error messages, or empty states without repeating boilerplate.
 */
export function useAsyncData<T>(
  load: () => Promise<
    { success: true; data: T } | { success: false; error: { message: string } }
  >,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setStatus('loading')
    setError(null)
    let active = true
    load().then((result) => {
      if (!active) return
      if (result.success) {
        setData(result.data)
        setStatus('success')
      } else {
        setStatus('error')
        setError(result.error.message)
      }
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { data, status, error, reload }
}
