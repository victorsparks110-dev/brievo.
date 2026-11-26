import { format } from 'date-fns'

/** Generate a simple unique id for mock/local records. */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

/** Generate a short, URL-safe token for public brief links. */
export function generateToken(length = 10): string {
  const chars =
    'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const values = new Uint32Array(length)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(values)
  }
  for (let i = 0; i < length; i++) {
    result += chars[values[i] % chars.length]
  }
  return result
}

/** Format an ISO date string for display. */
export function formatDate(iso: string, pattern = 'MMM d, yyyy'): string {
  try {
    return format(new Date(iso), pattern)
  } catch {
    return iso
  }
}

/** Format a date as a relative time (e.g. "3h ago"). */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return format(date, 'MMM d')
}

/** Format a byte count into a human-readable file size. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

/** Extract initials from a name for avatars. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Build a Gmail compose URL that opens the user's Gmail with pre-filled
 * recipient, subject, and body. All values are URL-encoded.
 *
 * @param opts.to      – Recipient email address.
 * @param opts.subject – Email subject line.
 * @param opts.body    – Email body text.
 * @returns The Gmail compose URL string.
 */
export function createGmailComposeUrl(opts: {
  to: string
  subject: string
  body: string
}): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: opts.to,
    su: opts.subject,
    body: opts.body,
  })
  return `https://mail.google.com/mail/?${params.toString()}`
}

/** Visual tone mapped from a status string for badge coloring. */
export function toneFromStatus(status: string): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
} {
  const s = status.toLowerCase()
  if (s.includes('approv') || s.includes('complet')) return { variant: 'default' }
  if (s.includes('cancel')) return { variant: 'destructive' }
  if (s.includes('revision') || s.includes('new')) return { variant: 'secondary' }
  return { variant: 'outline' }
}
