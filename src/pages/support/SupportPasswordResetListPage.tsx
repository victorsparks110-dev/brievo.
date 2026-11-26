import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock, Eye, KeyRound, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePageMeta } from '@/hooks/usePageMeta'
import { formatDate } from '@/utils/helpers'
import {
  listPasswordResetRequests,
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

export function SupportPasswordResetListPage() {
  usePageMeta('Password Reset Requests')
  const [requests, setRequests] = useState<PasswordResetTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    void loadRequests()
  }, [statusFilter])

  async function loadRequests() {
    setLoading(true)
    const result = await listPasswordResetRequests(
      statusFilter === 'all' ? undefined : statusFilter
    )
    if (result.success) {
      setRequests(result.data)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Password Reset Requests</h1>
          <p className="text-sm text-muted-foreground">
            Manage password reset requests from users.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/support">
            <ArrowLeft className="mr-2 size-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="reset_link_generated">Reset Link Generated</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {loading ? 'Loading...' : `${requests.length} request(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No password reset requests found.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{req.name}</span>
                      <Badge className={STATUS_COLORS[req.status] || ''}>
                        {STATUS_LABELS[req.status] || req.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{req.email}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDate(req.createdAt)}
                      </span>
                      {req.hasResetLink && (
                        <span className="flex items-center gap-1 text-purple-600">
                          <KeyRound className="size-3" />
                          Link generated
                        </span>
                      )}
                      {req.repliedAt && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Mail className="size-3" />
                          Replied
                        </span>
                      )}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/support/password-reset/${req.id}`}>
                      <Eye className="mr-1 size-3.5" />
                      View
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
