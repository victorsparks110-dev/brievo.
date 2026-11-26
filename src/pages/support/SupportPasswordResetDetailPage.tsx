import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  Copy,
  Check,
  KeyRound,
  Mail,
  Send,
  User,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useToast } from '@/context/ToastContext'
import { createGmailComposeUrl, formatDate } from '@/utils/helpers'
import {
  getPasswordResetRequest,
  generateResetLink,
  type PasswordResetTicket,
} from '@/services/supportAdminService'

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  in_progress: 'In Progress',
  reset_link_generated: 'Reset Link Generated',
  replied: 'Replied',
  resolved: 'Resolved',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  reset_link_generated: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  replied: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  resolved: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
}

function getDefaultMessage(userName: string, resetUrl: string): string {
  return `Hello ${userName},

We received your request to reset your Brievo account password.

Please use the password reset link below to create a new password:

${resetUrl}

This link will expire after 1 hour.

Regards,
Brievo Support`
}

export function SupportPasswordResetDetailPage() {
  usePageMeta('Password Reset Request')
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()

  const [ticket, setTicket] = useState<PasswordResetTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [resetUrl, setResetUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [emailMessage, setEmailMessage] = useState('')
  const [emailSubject, setEmailSubject] = useState('BRIEVO Password Reset')

  useEffect(() => {
    if (!id) return
    void loadTicket()
  }, [id])

  async function loadTicket() {
    setLoading(true)
    const result = await getPasswordResetRequest(id!)
    if (result.success) {
      setTicket(result.data)
    } else {
      toast({ title: 'Error', description: result.error.message })
    }
    setLoading(false)
  }

  async function handleGenerateLink() {
    if (!id) return
    setGenerating(true)
    const result = await generateResetLink(id)
    setGenerating(false)

    if (result.success) {
      setTicket(result.data.ticket)
      setResetUrl(result.data.resetUrl)
      setEmailMessage(getDefaultMessage(ticket?.name || 'User', result.data.resetUrl))
      toast({ title: 'Reset link generated', description: 'The reset link is ready to send.' })
    } else {
      toast({ title: 'Error', description: result.error.message })
    }
  }

  function handleSendEmail() {
    if (!ticket || !emailMessage.trim()) return
    const gmailUrl = createGmailComposeUrl({
      to: ticket.email,
      subject: emailSubject,
      body: emailMessage,
    })
    window.open(gmailUrl, '_blank', 'noopener,noreferrer')
  }

  function handleCopyLink() {
    if (!resetUrl) return
    navigator.clipboard.writeText(resetUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Password reset request not found.</p>
        <Button asChild variant="outline">
          <Link to="/support/password-reset">
            <ArrowLeft className="mr-2 size-4" />
            Back to List
          </Link>
        </Button>
      </div>
    )
  }

  const linkAlreadyGenerated = ticket.hasResetLink || ticket.resetLinkGeneratedAt

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Password Reset Request</h1>
          <p className="text-sm text-muted-foreground">
            Manage this password reset request.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/support/password-reset">
            <ArrowLeft className="mr-2 size-4" />
            Back to List
          </Link>
        </Button>
      </div>

      {/* Request Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <span className="font-medium">{ticket.name}</span>
            <Badge className={STATUS_COLORS[ticket.status] || ''}>
              {STATUS_LABELS[ticket.status] || ticket.status}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Email: {ticket.email}</p>
            <p>Subject: {ticket.subject}</p>
            <p className="flex items-center gap-1 mt-1">
              <Clock className="size-3" />
              Submitted: {formatDate(ticket.createdAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Generate Reset Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <KeyRound className="size-5" />
            Generate Reset Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {resetUrl ? (
            <div className="space-y-3">
              <Label>Password Reset Link</Label>
              <div className="flex items-center gap-2">
                <Input value={resetUrl} readOnly className="font-mono text-sm" />
                <Button size="sm" variant="outline" onClick={handleCopyLink}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Copy this link and include it in the email below, or use the default message.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {linkAlreadyGenerated
                  ? 'A reset link has been generated previously. Generate a new one to invalidate the old link.'
                  : 'Generate a secure one-time password reset link for this user.'}
              </p>
              <Button onClick={() => void handleGenerateLink()} disabled={generating}>
                <KeyRound className="mr-2 size-4" />
                {generating
                  ? 'Generating...'
                  : linkAlreadyGenerated
                    ? 'Generate New Link'
                    : 'Generate Reset Link'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Composer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="size-5" />
            Send Reset Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!resetUrl ? (
            <p className="text-sm text-muted-foreground">
              Generate a reset link first before composing the email.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>To</Label>
                <Input value={ticket.email} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={14}
                  className="font-mono text-sm"
                />
              </div>
              <Button
                onClick={handleSendEmail}
                disabled={!emailMessage.trim()}
              >
                <Send className="mr-2 size-4" />
                Send Email
              </Button>
              <p className="text-xs text-muted-foreground">
                Opens Gmail with a pre-filled email. Review and send from your Gmail account.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
