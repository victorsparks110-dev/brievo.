import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Loader2 } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/context/ToastContext'

export function NewPasswordForm() {
  usePageMeta('Set New Password')
  const navigate = useNavigate()
  const { toast } = useToast()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in both password fields.',
        variant: 'destructive',
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: window.localStorage.getItem('reset_token') || '',
          newPassword: password,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Password Updated Successfully ✓',
          description: 'Your password has been changed successfully.',
          variant: 'success',
        })
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } else {
        const errorData = await response.json()
        toast({
          title: 'Error',
          description: errorData.message || 'Failed to update password.',
          variant: 'destructive',
        })
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update password. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Support
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Set New Password</h1>
        <p className="mt-1 text-muted-foreground">
          Set a new password for your Brievo account.
        </p>
      </div>

      <Card>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit}
          >
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              minLength={6}
              required
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              minLength={6}
              required
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-md border border-primary-500 py-2 px-4 text-sm font-medium text-primary-foreground hover:bg-primary-600">
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-3.5" />
                  Updating...
                </>
              ) : (
                <span>
                  <CheckCircle className="mr-1 size-3.5 align-middle" /> Set New Password
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>Password must be at least 6 characters.</p>
        <p>Passwords must match to proceed.</p>
      </div>
    </div>
  )
}