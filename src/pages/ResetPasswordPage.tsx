import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePageMeta } from '@/hooks/usePageMeta'
import { AppFooter } from '@/components/layouts/AppFooter'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { authService } from '@/services'

export function ResetPasswordPage() {
  usePageMeta('Reset password')
  const { token } = useParams<{ token: string }>()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldError, setFieldError] = useState<{
    password?: string
    confirm?: string
  }>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    const errors: { password?: string; confirm?: string } = {}
    if (!password) {
      errors.password = 'Password is required.'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.'
    }
    if (!confirm) {
      errors.confirm = 'Please confirm your new password.'
    } else if (password !== confirm) {
      errors.confirm = 'Passwords do not match.'
    }
    setFieldError(errors)

    if (errors.password || errors.confirm) return

    if (!token) {
      setSubmitError('This reset link is invalid. Please request a new one.')
      return
    }

    setSubmitting(true)
    const result = await authService.resetPassword(token, password)
    setSubmitting(false)

    if (result.success) {
      setSuccess(true)
    } else {
      setSubmitError(result.error.message)
    }
  }

  if (success) {
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
                <CardTitle className="text-xl">Password reset successful</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="size-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Your password has been reset. You can now sign in with
                      your new password.
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
              <CardTitle className="text-xl">Reset your password</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose a new password for your account.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldError.password) {
                        setFieldError((prev) => ({ ...prev, password: undefined }))
                      }
                    }}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                  {fieldError.password && (
                    <p className="text-sm text-destructive">{fieldError.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value)
                      if (fieldError.confirm) {
                        setFieldError((prev) => ({ ...prev, confirm: undefined }))
                      }
                    }}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                  {fieldError.confirm && (
                    <p className="text-sm text-destructive">{fieldError.confirm}</p>
                  )}
                </div>
                {submitError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {submitError}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  <KeyRound className="size-4" />{' '}
                  {submitting ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
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
