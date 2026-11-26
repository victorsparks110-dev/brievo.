import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, LifeBuoy, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { usePageMeta } from '@/hooks/usePageMeta'
import { AppFooter } from '@/components/layouts/AppFooter'
import { ThemeToggle } from '@/components/theme/ThemeToggle'


interface LocationState {
  from?: string
}

export function LoginPage() {
  usePageMeta('Log in')
  const { login, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [unverified, setUnverified] = useState(false)
  const [loginError, setLoginError] = useState('')

  const defaultHome = (role?: string) => (role === 'support' ? '/support' : '/designer')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    clearError()
    setUnverified(false)
    setLoginError('')
    const result = await login({ email, password })
    setSubmitting(false)
    if (result.success) {
      const from = (location.state as LocationState | null)?.from ?? defaultHome(result.data.role)
      navigate(from, { replace: true })
    } else if (result.error.code === 'FORBIDDEN') {
      setUnverified(true)
    } else {
      setLoginError(result.error.message)
    }
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
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <p className="text-sm text-muted-foreground">
                Log in to your workspace.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                {loginError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {loginError}
                  </p>
                )}
                {unverified && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm dark:border-amber-800 dark:bg-amber-950">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-300">
                          Account not yet verified
                        </p>
                        <p className="mt-1 text-amber-700 dark:text-amber-400">
                          Your account needs to be verified before you can log in.
                          Please contact BRIEVO Support and we&apos;ll get you set up right away.
                        </p>
                        <Link
                          to={`/contact?subject=${encodeURIComponent('Account Verification Request')}&message=${encodeURIComponent(`Hello BRIEVO Support,\n\nI recently created a BRIEVO account and need help verifying my account so I can log in.\n\nRegistered email: ${email}\n\nPlease assist me with the verification process.\nThank you.`)}&email=${encodeURIComponent(email)}`}
                          className="mt-2 inline-flex items-center gap-1 font-medium text-amber-800 hover:underline dark:text-amber-300"
                        >
                          <LifeBuoy className="size-3.5" /> Contact Support
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  <LogIn className="size-4" /> {submitting ? 'Logging in...' : 'Log in'}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
              <p className="text-sm text-muted-foreground">
                No account?{' '}
                <Link to="/signup" className="font-medium text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
            <div className="pb-6 pt-0 text-center">
              <Link
                to="/contact"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <LifeBuoy className="size-3.5" /> Contact us
              </Link>
            </div>
          </Card>
        </div>
      </div>
      <AppFooter compact />
    </div>
  )
}
