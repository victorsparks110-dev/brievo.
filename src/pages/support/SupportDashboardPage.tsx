import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Clock, CheckCircle, ArrowRight, UserCheck, KeyRound } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import * as supportAdminService from '@/services/supportAdminService'

interface Ticket {
  id: string
  status: string
}

interface PendingDesigner {
  id: string
}

interface PasswordResetTicket {
  id: string
  status: string
}

export function SupportDashboardPage() {
  usePageMeta('Support Dashboard')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [pendingDesigners, setPendingDesigners] = useState<PendingDesigner[]>([])
  const [passwordResets, setPasswordResets] = useState<PasswordResetTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [ticketResult, designerResult, resetResult] = await Promise.all([
        supportAdminService.listTickets(),
        supportAdminService.listPendingDesigners(),
        supportAdminService.listPasswordResetRequests(),
      ])
      setLoading(false)
      if (ticketResult.success) {
        setTickets(ticketResult.data)
      }
      if (designerResult.success) {
        setPendingDesigners(designerResult.data)
      }
      if (resetResult.success) {
        setPasswordResets(resetResult.data)
      }
    }
    void load()
  }, [])

  const total = tickets.length
  const pending = tickets.filter((t) => t.status === 'new').length
  const answered = tickets.filter((t) => t.status === 'answered').length
  const resolved = tickets.filter((t) => t.status === 'resolved').length

  const newResets = passwordResets.filter((r) => r.status === 'new').length

  const stats = [
    { label: 'Total Tickets', value: total, icon: MessageSquare },
    { label: 'Pending', value: pending, icon: Clock },
    { label: 'Answered', value: answered, icon: CheckCircle },
    { label: 'Resolved', value: resolved, icon: CheckCircle },
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Support
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Support Dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loading ? '—' : stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <p className="font-medium">View all support tickets</p>
              <p className="text-sm text-muted-foreground">
                Browse, filter, and respond to user support requests.
              </p>
            </div>
            <Button asChild>
              <Link to="/support/tickets">
                View Tickets <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <UserCheck className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Pending Designers</p>
                <p className="text-sm text-muted-foreground">
                  {loading
                    ? 'Loading...'
                    : pendingDesigners.length === 0
                      ? 'No pending approvals'
                      : `${pendingDesigners.length} awaiting approval`}
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/support/pending-designers">
                Review <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <KeyRound className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Password Resets</p>
                <p className="text-sm text-muted-foreground">
                  {loading
                    ? 'Loading...'
                    : newResets === 0
                      ? 'No pending requests'
                      : `${newResets} pending request(s)`}
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/support/password-reset">
                Manage <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
