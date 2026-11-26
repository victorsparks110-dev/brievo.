import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePageMeta } from '@/hooks/usePageMeta'
import { AppFooter } from '@/components/layouts/AppFooter'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { requestPasswordReset } from '@/services/authService'

export function ForgotPasswordPage() {
  usePageMeta('Forgot password')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }

    setSubmitting(true)
    const result = await requestPasswordReset(email.trim())
    setSubmitting(false)

    if (result.success) {
      setSubmitted(true)
    } else {
      setError(result.error.message)
    }
  }

  if (submitted) {
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
              <CardHeader>
                <CardTitle className="text-xl">Password reset request submitted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="size-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      A password reset link has been sent to your mail. Please check your inbox.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      You will receive an email once your request has been processed.
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Didn't receive the email? Please check your Spam or Junk folder.
                    </p>
                  </div>
                  <Button asChild className="mt-2 w-full">
                    <Link to="/login">
                      <ArrowLeft className="size-4" /> Back to Login
                    </Link>
                  </Button>
                </div>
              </CardContent>
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
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
              B
            </span>
            <span className="text-2xl font-bold tracking-tight">BRIEVO</span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Forgot your password?</CardTitle>
<p className="text-sm text-muted-foreground">
Enter your email and we'll submit a password reset request. A reset link will be sent to your email if an account exists.
</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="size-6 text-primary" />
                </div>
                <form onSubmit={(e) => void handleSubmit(e)} className="w-full space-y-4">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (error) setError('')
                      }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                  {error && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground">
                  Or email us at{' '}
                  <a
                    href="mailto:support@brievo.com"
                    className="font-medium text-primary hover:underline"
                  >
                    support@brievo.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <ArrowLeft className="size-3.5" /> Back to Login
            </Link>
          </p>
        </div>
      </div>
      <AppFooter compact />
    </div>
  )
}
