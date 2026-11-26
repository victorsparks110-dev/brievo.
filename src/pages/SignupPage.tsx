import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, LifeBuoy } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { usePageMeta } from '@/hooks/usePageMeta'
import { AppFooter } from '@/components/layouts/AppFooter'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export function SignupPage() {
  usePageMeta('Sign up')
  const { signUp, error, clearError } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [phoneError, setPhoneError] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const validatePhone = (value: string): string => {
    const trimmed = value.trim()
    if (!trimmed) return 'Phone number is required.'
    // Accepts international formats: optional +, digits, spaces, hyphens, parentheses
    if (!/^\+?[\d\s\-().]{7,20}$/.test(trimmed)) {
      return 'Enter a valid phone number (e.g. +1 555 000 1234).'
    }
    return ''
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const phoneValidationError = validatePhone(phone)
    if (phoneValidationError) {
      setPhoneError(phoneValidationError)
      return
    }
    setPhoneError('')
    setSubmitting(true)
    clearError()
    const result = await signUp({ name, email, phone: phone.trim(), password })
    setSubmitting(false)
    if (result.success) {
      const trackingToken = result.data?.trackingToken
      if (!trackingToken) {
        clearError()
        window.location.href = '/account-verification-status/missing-token'
        return
      }
      window.location.href = `/account-verification-status/${trackingToken}`
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
              <CardTitle className="text-xl">Create your account</CardTitle>
              <p className="text-sm text-muted-foreground">
                Create your designer workspace.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (phoneError) setPhoneError('')
                    }}
                    placeholder="Enter your phone number"
                  />
                  {phoneError && (
                    <p className="text-sm text-destructive">{phoneError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
                {error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  <UserPlus className="size-4" /> {submitting ? 'Creating...' : 'Create account'}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Log in
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
