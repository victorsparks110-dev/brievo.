import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle, Clock, Circle, Info, Loader2 } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useToast } from '@/context/ToastContext'
import { getPublicTicketStatus } from '@/services/contactService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { AppFooter } from '@/components/layouts/AppFooter'

interface Step {
  key: string
  label: string
  completed: boolean
  active: boolean
}

function getSteps(status: 'pending' | 'approved'): Step[] {
  return [
    { key: 'submitted', label: 'Request Submitted', completed: true, active: false },
    {
      key: 'review',
      label: 'Under Review',
      completed: status === 'approved',
      active: status === 'pending',
    },
    {
      key: 'approved',
      label: 'Account Approved',
      completed: status === 'approved',
      active: false,
    },
  ]
}

export function AccountVerificationStatusPage() {
  usePageMeta('Account Verification Request')
  const { trackingToken } = useParams<{ trackingToken: string }>()
  const [status, setStatus] = useState<'pending' | 'approved'>('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const { toast } = useToast()

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
            if (intervalId) {
              clearInterval(intervalId!)
              intervalId = null
            }
            toast({
              title: 'Account Approved',
              description: 'Your Brievo account has been approved successfully.',
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

    checkStatus()
    intervalId = window.setInterval(checkStatus, 10000)

    return () => {
      didCancel = true
      if (intervalId !== null) {
        clearInterval(intervalId)
      }
    }
  }, [trackingToken])

  const steps = getSteps(status)

  if (loading) {
    return (
      <div className="relative flex min-h-screen flex-col bg-muted/40">
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-md text-center">
            <div className="mb-6 flex items-center justify-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
                B
              </span>
              <span className="text-2xl font-bold tracking-tight">BRIEVO</span>
            </div>
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-10">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading status...</p>
              </CardContent>
            </Card>
          </div>
        </div>
        <AppFooter compact />
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative flex min-h-screen flex-col bg-muted/40">
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center justify-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
                B
              </span>
              <span className="text-2xl font-bold tracking-tight">BRIEVO</span>
            </div>
            <Card>
              <CardContent className="space-y-4 py-6">
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">Back to Login</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
        <AppFooter compact />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-muted/40">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
              B
            </span>
            <span className="text-2xl font-bold tracking-tight">BRIEVO</span>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Account Verification</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {status === 'pending' ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <Clock className="size-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Awaiting Support Approval
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your account has been created successfully and is currently awaiting approval from the Brievo support team.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle className="size-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Account Approved
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your Brievo account has been approved. You can now log in.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {steps.map((step) => (
                  <div key={step.key} className="flex items-center gap-3">
                    {step.completed ? (
                      <CheckCircle className="size-5 shrink-0 text-primary" />
                    ) : step.active ? (
                      <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-muted-foreground/40" />
                    )}
                    <span
                      className={`text-sm ${
                        step.active
                          ? 'font-medium text-foreground'
                          : step.completed
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              {status === 'pending' && (
                <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Approval is normally completed shortly. If your request is not confirmed within 2 minutes, kindly contact support.
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              {status === 'approved' ? (
                <Button asChild className="w-full">
                  <Link to="/login">Go to Login</Link>
                </Button>
              ) : (
                <>
<a
                  href="mailto:support@brievo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
                >
                  Contact Support
                </a>
                  <Button asChild variant="ghost" className="w-full">
                    <Link to="/login">Back to Login</Link>
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>

      <AppFooter compact />
    </div>
  )
}
