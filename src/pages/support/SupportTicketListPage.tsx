import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, MessageSquare, Filter } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import * as supportAdminService from '@/services/supportAdminService'

interface Ticket {
  id: string
  userId: string | null
  name: string
  email: string
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

export function SupportTicketListPage() {
  usePageMeta('Support Tickets')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchTickets = async (status?: string) => {
    setLoading(true)
    setError('')
    const result = await supportAdminService.listTickets(
      status === 'all' ? undefined : status
    )
    setLoading(false)
    if (result.success) {
      setTickets(result.data)
    } else {
      setError(result.error.message)
    }
  }

  useEffect(() => {
    void fetchTickets(statusFilter)
  }, [statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Support
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Support Requests</h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="answered">Answered</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
            <p className="text-muted-foreground">No support tickets found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{ticket.subject}</p>
                    <Badge variant={STATUS_VARIANTS[ticket.status] ?? 'outline'}>
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ticket.email} — {formatDate(ticket.createdAt)}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/support/tickets/${ticket.id}`}>
                    <Eye className="mr-1 size-3.5" /> View
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
