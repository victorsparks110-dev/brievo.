import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTicketById } from '@/services/contactService'
import type { ContactMessage } from '@/types'

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

export function DesignerTicketDetailPage() {
  usePageMeta('Support Ticket')
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<ContactMessage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    const load = async (isPoll = false) => {
      if (!isPoll) setLoading(true)
      const result = await getTicketById(id)
      if (!isPoll) setLoading(false)
      if (result.success) {
        setTicket(result.data)
      } else {
        setError(result.error.message)
      }
    }
    void load()
    const interval = setInterval(() => void load(true), 10000)
    return () => clearInterval(interval)
  }, [id])

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading ticket...</div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <Link
          to="/designer/support"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Back to My Support
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
        to="/designer/support"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-3.5" /> Back to My Support
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {formatDate(ticket.createdAt)}
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[ticket.status] ?? 'outline'}>
          {STATUS_LABELS[ticket.status] ?? ticket.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* User message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.message}</p>
            </CardContent>
          </Card>

          {/* Support response (if any) */}
          {ticket.response ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Support Response</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{ticket.response}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Waiting for a response from BRIEVO Support.
              </CardContent>
            </Card>
          )}
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
