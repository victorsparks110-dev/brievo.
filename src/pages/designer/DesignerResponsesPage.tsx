import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  CircleDashed,
  Eye,
  FileText,
  Inbox,
  Search,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useAuth } from '@/context/AuthContext'
import { formService } from '@/services'
import type { FormResponse, WorkStatus } from '@/types'
import { WORK_STATUS_LABELS } from '@/types'
import { formatDate, formatRelativeTime, initials } from '@/utils/helpers'

type ResponseWithForm = FormResponse & { formTitle: string; formShareToken?: string }

type WorkStatusFilter = 'all' | 'new' | 'in_progress' | 'completed'

const workStatusBadgeClass = (status: WorkStatus): string => {
  switch (status) {
    case 'completed':    return 'bg-emerald-500/15 text-emerald-700 border-emerald-400/30 dark:text-emerald-400'
    case 'in_progress':  return 'bg-blue-500/15 text-blue-700 border-blue-400/30 dark:text-blue-400'
    default:             return 'bg-muted text-muted-foreground'
  }
}

const WorkStatusIcon = ({ status }: { status: WorkStatus }) => {
  switch (status) {
    case 'completed':    return <CheckCircle2 className="size-3.5 text-emerald-600" />
    case 'in_progress':  return <Zap className="size-3.5 text-blue-600" />
    default:             return <CircleDashed className="size-3.5 text-muted-foreground" />
  }
}

export function DesignerResponsesPage() {
  usePageMeta('Form Responses')
  const { user } = useAuth()
  const [responses, setResponses] = useState<ResponseWithForm[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'reviewed' | 'confirmed'>('all')
  const [workStatusFilter, setWorkStatusFilter] = useState<WorkStatusFilter>('all')

  useEffect(() => {
    if (!user) return

    void formService.getDesignerResponses(user.id).then((result) => {
      if (result.success) {
        setResponses(result.data)
      }
      setLoading(false)
    })
  }, [user])

  const stats = useMemo(() => {
    const total = responses.length
    const unreviewed = responses.filter((r) => r.status === 'new').length
    const reviewed = responses.filter((r) => r.status === 'reviewed').length
    const confirmed = responses.filter((r) => r.status === 'confirmed').length
    const workNew = responses.filter((r) => (r.workStatus ?? 'new') === 'new').length
    const workInProgress = responses.filter((r) => r.workStatus === 'in_progress').length
    const workCompleted = responses.filter((r) => r.workStatus === 'completed').length
    return { total, unreviewed, reviewed, confirmed, workNew, workInProgress, workCompleted }
  }, [responses])

  const filteredResponses = useMemo(() => {
    return responses.filter((resp) => {
      const matchesStatus =
        statusFilter === 'all' ? true : resp.status === statusFilter

      const matchesWorkStatus =
        workStatusFilter === 'all' ? true : (resp.workStatus ?? 'new') === workStatusFilter

      const q = searchQuery.toLowerCase().trim()
      if (!q) return matchesStatus && matchesWorkStatus

      const name = (resp.submittedByName || resp.projectInformation?.clientName || '').toLowerCase()
      const email = (resp.submittedByEmail || resp.projectInformation?.clientEmail || '').toLowerCase()
      const rawCompany = resp.projectInformation?.companyName || (typeof resp.answers?.company_name === 'string' ? resp.answers.company_name : '') || ''
      const company = String(rawCompany).toLowerCase()
      const formTitle = (resp.formTitle || '').toLowerCase()

      const matchesSearch =
        name.includes(q) ||
        email.includes(q) ||
        company.includes(q) ||
        formTitle.includes(q)

      return matchesStatus && matchesWorkStatus && matchesSearch
    })
  }, [responses, statusFilter, workStatusFilter, searchQuery])

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading submissions…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Submissions</p>
          <h1 className="text-3xl font-bold tracking-tight">Client form responses</h1>
        </div>
        <Button variant="outline" asChild>
          <Link to="/designer/forms">
            <FileText className="size-4" /> Manage forms
          </Link>
        </Button>
      </div>

      {/* Summary KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">
              Total submissions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{stats.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium flex items-center justify-between">
              <span>Awaiting review</span>
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {stats.unreviewed}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Reviewed</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{stats.reviewed}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium">Confirmed</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-primary">{stats.confirmed}</CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="sm:flex sm:items-center sm:justify-between sm:gap-4 space-y-3 sm:space-y-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by client name, email, company, or form..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All ({stats.total})
              </Button>
              <Button
                variant={statusFilter === 'new' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('new')}
              >
                New ({stats.unreviewed})
              </Button>
              <Button
                variant={statusFilter === 'reviewed' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('reviewed')}
              >
                Reviewed ({stats.reviewed})
              </Button>
              <Button
                variant={statusFilter === 'confirmed' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('confirmed')}
              >
                Confirmed ({stats.confirmed})
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-t pt-3">
            <span className="text-xs font-medium text-muted-foreground mr-1">Work status:</span>
            {(
              [
                ['all', 'All'],
                ['new', 'New'],
                ['in_progress', 'In Progress'],
                ['completed', 'Completed'],
              ] as [WorkStatusFilter, string][]
            ).map(([value, label]) => (
              <Button
                key={value}
                variant={workStatusFilter === value ? 'default' : 'ghost'}
                size="sm"
                className={
                  workStatusFilter === value && value !== 'all'
                    ? 'bg-foreground text-background hover:bg-foreground'
                    : ''
                }
                onClick={() => setWorkStatusFilter(value)}
              >
                {label} (
                  {value === 'all'
                    ? stats.total
                    : value === 'new'
                    ? stats.workNew
                    : value === 'in_progress'
                    ? stats.workInProgress
                    : stats.workCompleted}
                )
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Response Cards List */}
      {filteredResponses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Inbox className="size-10 text-muted-foreground/60" />
            <div>
              <p className="font-semibold text-base">No responses found</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {searchQuery || statusFilter !== 'all' || workStatusFilter !== 'all'
                  ? 'Try clearing your search query or switching filters.'
                  : 'Share public links from your intake forms with clients to start receiving submissions.'}
              </p>
            </div>
            {searchQuery || statusFilter !== 'all' || workStatusFilter !== 'all' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                  setWorkStatusFilter('all')
                }}
              >
                Reset filters
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/designer/forms">View forms to share</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredResponses.map((resp) => {
            const clientName = resp.submittedByName || resp.projectInformation?.clientName || 'Client'
            const clientEmail = resp.submittedByEmail || resp.projectInformation?.clientEmail || '—'
            const company = resp.projectInformation?.companyName || (resp.answers?.company_name as string) || ''
            const projectTypes = resp.projectInformation?.projectTypes ?? []
            const budget = resp.projectInformation?.amount
            const currency = resp.projectInformation?.currency || 'NGN (₦)'

            return (
              <Card key={resp.id} className="transition-all hover:border-primary/50 hover:shadow-sm">
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials(clientName)}
                      </div>
                      <h2 className="text-lg font-semibold">{clientName}</h2>
                      {company && (
                        <span className="text-xs font-medium text-muted-foreground border-l pl-2.5">
                          {company}
                        </span>
                      )}
                      <Badge
                        variant={
                          resp.status === 'confirmed'
                            ? 'default'
                            : resp.status === 'reviewed'
                            ? 'secondary'
                            : 'outline'
                        }
                        className={
                          resp.status === 'new'
                            ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            : ''
                        }
                      >
                        {resp.status === 'new' ? 'New Submission' : resp.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`flex items-center gap-1 ${workStatusBadgeClass(resp.workStatus ?? 'new')}`}
                      >
                        <WorkStatusIcon status={resp.workStatus ?? 'new'} />
                        {(resp.workStatus ?? 'new') === 'new'
                          ? 'work: New'
                          : `work: ${WORK_STATUS_LABELS[resp.workStatus ?? 'new']}`}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="size-3.5" />
                        Form: <span className="font-medium text-foreground">{resp.formTitle}</span>
                      </span>
                      <span>•</span>
                      <span>{clientEmail}</span>
                      <span>•</span>
                      <span>Submitted {formatDate(resp.submittedAt)} ({formatRelativeTime(resp.submittedAt)})</span>
                    </div>

                    {(projectTypes.length > 0 || (budget && budget > 0)) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        {projectTypes.map((pt) => (
                          <span
                            key={pt}
                            className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground font-medium"
                          >
                            {pt}
                          </span>
                        ))}
                        {budget && budget > 0 ? (
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary font-semibold">
                            {currency} {budget.toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button asChild>
                      <Link to={`/designer/forms/${resp.formId}/responses/${resp.id}`}>
                        <Eye className="size-4" /> View full submission
                      </Link>
                    </Button>
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
