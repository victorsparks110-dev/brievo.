import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, CheckCircle } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import * as supportAdminService from '@/services/supportAdminService'

interface Ticket {
  id: string
  userId: string | null
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: string
  response: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Pending',
  in_progress: 'In Progress',
  answered: 'Answered',
  resolved: 'Resolved',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new: 'outline',
  in_progress: 'secondary',
  answered: 'default',
  resolved: 'secondary',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SupportTicketDetailPage() {
  usePageMeta('Support Ticket')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [replySuccess, setReplySuccess] = useState(false)
  const [replyEmailSent, setReplyEmailSent] = useState<boolean | null>(null)
  const [replyError, setReplyError] = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      const result = await supportAdminService.getTicket(id)
      setLoading(false)
      if (result.success) {
        setTicket(result.data)
        // Redirect password-reset requests to the dedicated page
        if (result.data.type === 'password_reset') {
          navigate(`/support/password-reset/${id}`, { replace: true })
          return
        }
      } else {
        setError(result.error.message)
      }
    }
    void load()
  }, [id])

  const handleReply = async () => {
    if (!id || !replyText.trim()) return
    setReplying(true)
    setReplyError('')
    setReplySuccess(false)
    setReplyEmailSent(null)
    const result = await supportAdminService.replyToTicket(id, replyText.trim())
    setReplying(false)
    if (result.success) {
      setTicket(result.data)
      setReplyText('')
      setReplySuccess(true)
      setReplyEmailSent(result.data.emailSent ?? null)
    } else {
      setReplyError(result.error.message)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return
    setStatusUpdating(true)
    const result = await supportAdminService.updateTicketStatus(id, newStatus)
    setStatusUpdating(false)
    if (result.success) {
      setTicket(result.data)
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading ticket...</div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <Link
          to="/support/tickets"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Back to Tickets
        </Link>
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error || 'Ticket not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/support/tickets"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-3.5" /> Back to Tickets
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {formatDate(ticket.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANTS[ticket.status] ?? 'outline'}>
            {STATUS_LABELS[ticket.status] ?? ticket.status}
          </Badge>
          <Select
            value={ticket.status}
            onValueChange={handleStatusChange}
            disabled={statusUpdating}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="answered">Answered</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* User info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Email:</span>{' '}
                <span className="font-medium">{ticket.email}</span>
                <span className="ml-2 text-xs text-muted-foreground">(notifications sent here)</span>
              </p>
              <p>
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="font-medium">{ticket.name}</span>
              </p>
              {ticket.phone && (
                <p>
                  <span className="text-muted-foreground">Phone:</span>{' '}
                  <span className="font-medium">{ticket.phone}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* User message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.message}</p>
            </CardContent>
          </Card>

          {/* Support response (if any) */}
          {ticket.response && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Support Response</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{ticket.response}</p>
              </CardContent>
            </Card>
          )}

          {/* Reply form */}
          <Card>
              <CardHeader>
                <CardTitle className="text-base">Reply to User</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reply">Response</Label>
                  <Textarea
                    id="reply"
                    value={replyText}
                    onChange={(e) => {
                      setReplyText(e.target.value)
                      if (replyError) setReplyError('')
                      if (replySuccess) {
                        setReplySuccess(false)
                        setReplyEmailSent(null)
                      }
                    }}
                    placeholder="Write your response to the user..."
                    rows={5}
                  />
                </div>
                {replyError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {replyError}
                  </p>
                )}
                {replySuccess && (
                  <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
                    {replyEmailSent === true
                      ? 'Response sent successfully. Email notification delivered.'
                      : replyEmailSent === false
                        ? 'Response saved, but the email notification could not be sent.'
                        : 'Response sent successfully. Status updated to Answered.'}
                  </p>
                )}
                <Button
                  onClick={() => void handleReply()}
                  disabled={replying || !replyText.trim()}
                  className="gap-2"
                >
                  <Send className="size-4" />
                  {replying ? 'Sending...' : 'Send Response'}
                </Button>
              </CardContent>
            </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-6 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Status
                </p>
                <p className="mt-1">{STATUS_LABELS[ticket.status] ?? ticket.status}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Created
                </p>
                <p className="mt-1">{formatDate(ticket.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Last Updated
                </p>
                <p className="mt-1">{formatDate(ticket.updatedAt)}</p>
              </div>
              {ticket.response && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Replied
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle className="size-3.5" /> Yes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
