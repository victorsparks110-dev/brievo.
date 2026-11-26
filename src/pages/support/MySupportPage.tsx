import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getMessagesByUser } from '@/services/contactService'

interface Ticket {
  id: string
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
  })
}

export function MySupportPage() {
  usePageMeta('My Support Requests')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async (isPoll = false) => {
      if (!isPoll) setLoading(true)
      const result = await getMessagesByUser('')
      if (!isPoll) setLoading(false)
      if (result.success) {
        setTickets(result.data as unknown as Ticket[])
      } else {
        setError(result.error.message)
      }
    }
    void load()
    const interval = setInterval(() => void load(true), 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Support
        </p>
        <h1 className="text-3xl font-bold tracking-tight">My Support Requests</h1>
        <p className="mt-1 text-muted-foreground">
          View your submitted support requests and responses from the BRIEVO team.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              You haven&apos;t submitted any support requests yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => {
            const isSignup = ticket.subject === 'Account Verification Request'
            return (
              <Card key={ticket.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/designer/support/${ticket.id}`}
                      className="text-base font-semibold text-primary hover:underline"
                    >
                      {isSignup ? ticket.message : ticket.subject}
                    </Link>
                    <Badge variant={STATUS_VARIANTS[ticket.status] ?? 'outline'}>
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isSignup && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                        Your message
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.message}</p>
                    </div>
                  )}

                  {ticket.response ? (
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                        Support response
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {ticket.response}
                      </p>
                    </div>
                  ) : (
                    !isSignup && (
                      <p className="text-sm text-muted-foreground italic">
                        Waiting for a response from BRIEVO Support.
                      </p>
                    )
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created: {formatDate(ticket.createdAt)}</span>
                      {ticket.updatedAt !== ticket.createdAt && (
                        <span>Updated: {formatDate(ticket.updatedAt)}</span>
                      )}
                    </div>
                    <Link
                      to={`/designer/support/${ticket.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View Details
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
