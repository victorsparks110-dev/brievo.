import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, CheckCircle2, Mail, Send } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { usePageMeta } from '@/hooks/usePageMeta'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as contactService from '@/services/contactService'

// ─── Validation ────────────────────────────────────────────────────────────

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
}

function validate(fields: {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}): FormErrors {
  const errors: FormErrors = {}

  if (!fields.name.trim()) errors.name = 'Your name is required.'
  if (!fields.email.trim()) {
    errors.email = 'Your email address is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (fields.phone.trim() && !/^\+?[\d\s\-().]{7,20}$/.test(fields.phone.trim())) {
    errors.phone = 'Enter a valid phone number (e.g. +1 555 000 1234).'
  }
  if (!fields.subject.trim()) errors.subject = 'Please enter a subject.'
  if (!fields.message.trim()) {
    errors.message = 'Please write a message before sending.'
  } else if (fields.message.trim().length < 10) {
    errors.message = 'Your message is a bit short — please add more detail.'
  }

  return errors
}

// ─── Component ─────────────────────────────────────────────────────────────

export function DesignerContactPage() {
  usePageMeta('Contact us')
  const { user } = useAuth()
  const isAuthenticated = !!user
  const [searchParams] = useSearchParams()

  // Auto-scroll to the form and focus the first relevant empty field once the
  // page is shown — so users (including those arriving via navigation from
  // Login/Signup/Footer) land straight on the form without manual scrolling.
  const formRef = useRef<HTMLFormElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)

  // Pre-fill with authenticated user's profile data when available,
  // otherwise fall back to URL query param (e.g. from signup/forgot-password).
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState<string>(user?.email ?? searchParams.get('email') ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [subject, setSubject] = useState(searchParams.get('subject') ?? '')
  const [message, setMessage] = useState(searchParams.get('message') ?? '')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Detect prefilled request context from URL query params.
  const prefilledSubject = searchParams.get('subject') ?? ''
  const isVerificationRequest = prefilledSubject === 'Account Verification Request'
  const isPasswordResetRequest = prefilledSubject === 'Password Reset Request'
  const hasPrefill = isVerificationRequest || isPasswordResetRequest

  useEffect(() => {
    // Let the router commit the DOM before scrolling/focusing, so users who
    // arrive via navigation (Login/Signup/Footer) land straight on the form.
    const id = window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

      // Focus the first empty, editable field that makes sense to fill next.
      const field =
        (!isAuthenticated && !name.trim() && nameRef.current) ||
        (!isAuthenticated && !email.trim() && emailRef.current) ||
        (!subject.trim() && subjectRef.current) ||
        null
      if (field) {
        field.focus({ preventScroll: true })
      }
    }, 150)

    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validate({ name, email, phone, subject, message })
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})

    setSubmitting(true)
    const result = await contactService.submitMessage({
      // For logged-in users the ID is attached so the message can be traced;
      // public visitors submit without a userId.
      userId: user?.id,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      subject: subject.trim(),
      message: message.trim(),
    })
    setSubmitting(false)

    if (result.success) {
      setSubmitted(true)
    }
  }

  const handleSendAnother = () => {
    setSubject('')
    setMessage('')
    setErrors({})
    setSubmitted(false)
  }

  // ─── Success state ───────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Support</p>
          <h1 className="text-3xl font-bold tracking-tight">Contact us</h1>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-12">
            <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="size-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Message sent</h2>
                <p className="text-muted-foreground">
                  Thanks for contacting us. Your message has been sent
                  successfully, and we'll get back to you as soon as possible.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button onClick={handleSendAnother} variant="outline">
                  Send another message
                </Button>
                <Button asChild>
                  <Link to={isAuthenticated ? '/designer' : '/'}>
                    {isAuthenticated ? 'Back to dashboard' : 'Back to home'}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Form ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Support</p>
        <h1 className="text-3xl font-bold tracking-tight">Contact us</h1>
        <p className="mt-1 text-muted-foreground">
          Have a question, suggestion, or need help? Send us a message and
          we'll get back to you.
        </p>
      </div>

      {/* Prefilled-request notice */}
      {hasPrefill && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <CheckCircle className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="text-sm">
            {isVerificationRequest ? (
              <>
                <p className="font-medium text-foreground">
                  Your account verification request is ready
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  We&apos;ve prepared the request using your registered email. You
                  can simply click <strong>Send to Support</strong> below. You
                  don&apos;t need to make any changes.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">
                  Your password reset request is ready
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  We&apos;ve prepared the request for you. Enter your registered
                  email where indicated, then click{' '}
                  <strong>Send to Support</strong>.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form card (2/3 width on large screens) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-4" />
              Send a message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              ref={formRef}
              onSubmit={(e) => void handleSubmit(e)}
              noValidate
              className="scroll-mt-24 space-y-5"
            >

              {/* Name — pre-filled when logged in, otherwise editable */}
              <div className="space-y-2">
                <Label htmlFor="contact-name">Your name</Label>
                <Input
                  id="contact-name"
                  ref={nameRef}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name) setErrors((p) => ({ ...p, name: undefined }))
                  }}
                  placeholder="Your full name"
                  aria-describedby={errors.name ? 'contact-name-error' : undefined}
                />
                {errors.name && (
                  <p id="contact-name-error" className="text-sm text-destructive">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email — pre-filled from the user's profile when logged in, editable for all users */}
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email address</Label>
                <Input
                  id="contact-email"
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                  }}
                  placeholder="you@example.com"
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                />
                {errors.email && (
                  <p id="contact-email-error" className="text-sm text-destructive">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Phone — shown for logged-in users without a saved phone, or always for public visitors */}
              {(!isAuthenticated || !user?.phone) && (
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone number (optional)</Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }))
                    }}
                    placeholder="+1 555 000 1234"
                    aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
                  />
                  {errors.phone && (
                    <p id="contact-phone-error" className="text-sm text-destructive">
                      {errors.phone}
                    </p>
                  )}
                </div>
              )}

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject</Label>
                <Input
                  id="contact-subject"
                  ref={subjectRef}
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value)
                    if (errors.subject) setErrors((p) => ({ ...p, subject: undefined }))
                  }}
                  placeholder="What can we help you with?"
                  aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                />
                {errors.subject && (
                  <p id="contact-subject-error" className="text-sm text-destructive">
                    {errors.subject}
                  </p>
                )}
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="contact-message">Message</Label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                    if (errors.message) setErrors((p) => ({ ...p, message: undefined }))
                  }}
                  placeholder="Tell us how we can help..."
                  rows={6}
                  aria-describedby={errors.message ? 'contact-message-error' : undefined}
                  className="flex w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/30 focus-visible:border-focus-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {errors.message && (
                  <p id="contact-message-error" className="text-sm text-destructive">
                    {errors.message}
                  </p>
                )}
              </div>

              {/* Phone note (for logged-in users whose profile has one) */}
              {isAuthenticated && user?.phone && (
                <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  Your saved phone number ({user.phone}) will be included with
                  this message automatically.
                </p>
              )}

              <Button type="submit" disabled={submitting} className="gap-2">
                <Send className="size-4" />
                {submitting ? 'Sending...' : 'Send to Support'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info sidebar (1/3 width on large screens) */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Get in touch</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Our team at BRIEVO is happy to help with questions,
                  feedback, or support requests.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Response time
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We respond within 24 hours.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  What you can ask about
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• Account or profile questions</li>
                  <li>• Form builder support</li>
                  <li>• Feature requests</li>
                  <li>• Bug reports</li>
                  <li>• General enquiries</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}