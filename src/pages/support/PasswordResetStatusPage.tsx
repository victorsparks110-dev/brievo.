import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Clock, Mail, KeyRound } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/context/ToastContext'
import { getPublicTicketStatus } from '@/services/contactService'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting Support Response',
  approved: 'Password Reset Approved',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
}

export function PasswordResetStatusPage() {
  usePageMeta('Password Reset Request')
  const { trackingToken } = useParams<{ trackingToken: string }>()
  const [status, setStatus] = useState<'pending' | 'approved'>('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const { toast } = useToast()

  // Poll the backend every 10 seconds for status update
  useEffect(() => {
    if (!trackingToken) return

    let intervalId: number | null
    let didCancel = false

    const checkStatus = async () => {
      try {
        const result = await getPublicTicketStatus(trackingToken)
        if (didCancel) return

        if (result.success && result.data) {
          setStatus(result.data.status as 'pending' | 'approved')
          setLoading(false)

          if (result.data.status === 'approved') {
            // Stop polling
            if (intervalId) {
              clearInterval(intervalId!)
              intervalId = null
            }
            toast({
              title: 'Password Reset Approved',
              description: 'Your request has been approved. Check your email for the password reset link.',
              variant: 'success',
            })
          }
        } else if (!result.success && result.error) {
          setError(result.error.message)
          setLoading(false)
        }
      } catch (err) {
        if (didCancel) return
        setError('Error checking status. Please try again.')
        setLoading(false)
      }
    }

    // Initial check
    checkStatus()

    // Set up polling interval (10 seconds)
    intervalId = window.setInterval(checkStatus, 10000)

    // Cleanup on unmount
    return () => {
      didCancel = true
      if (intervalId !== null) {
        clearInterval(intervalId)
      }
    }
  }, [trackingToken])

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading status...</div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Back to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Support
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Password Reset</h1>
        <p className="mt-1 text-muted-foreground">
          Your password reset request has been submitted successfully.
        </p>
      </div>

      <div className="bg-muted/5 rounded-md p-6">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <Clock className="size-6 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            Password Reset Request Sent ✓
          </p>
          <p className="text-base font-medium">
            Your request has been successfully sent to Brievo Support.
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Request Status
        </p>
        <Badge variant={STATUS_VARIANTS[status] ?? 'secondary'}>
          {STATUS_LABELS[status] ?? status}
        </Badge>
      </div>

      {status === 'pending' && (
        <div>
          <p className="text-sm text-muted-foreground">
            Please allow up to 2 minutes for confirmation.
          </p>
          <p className="text-sm text-muted-foreground">
            If your request is not confirmed within 2 minutes, kindly contact
            Support.
          </p>
        </div>
      )}

      {status === 'approved' && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
              <KeyRound className="size-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Password Reset Approved
              </p>
              <p className="text-sm text-muted-foreground">
                A password reset link has been sent to your email address. Please check your
                inbox (and spam folder) and click the link to set a new password.
              </p>
              <p className="text-sm text-muted-foreground">
                The reset link will expire after 1 hour.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Link
          to="/login"
          className="flex-1 rounded-md border border-border px-4 py-2 text-center text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          Back to Login
        </Link>
        {status === 'pending' && (
          <a
            href="mailto:support@brievo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-md border border-primary/20 px-4 py-2 text-center text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground">
              <Mail className="mr-1 inline size-3.5" />
              Contact Support
          </a>
        )}
      </div>
    </div>
  )
}