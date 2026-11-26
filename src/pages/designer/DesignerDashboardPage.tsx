import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleDashed,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Inbox,
  Plus,
  Share2,
  Sparkles,
  Zap,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { formService } from '@/services'
import { getDefaultFormFields, type FormDefinition, type FormResponse, type WorkStatus } from '@/types'
import { WORK_STATUS_LABELS } from '@/types'
import { formatDate, formatRelativeTime, initials } from '@/utils/helpers'

type ResponseWithForm = FormResponse & { formTitle: string; formShareToken?: string }

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

export function DesignerDashboardPage() {
  usePageMeta('Designer dashboard')
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [forms, setForms] = useState<FormDefinition[]>([])
  const [responses, setResponses] = useState<ResponseWithForm[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) return

    void Promise.all([
      formService.getDesignerForms(user.id),
      formService.getDesignerResponses(user.id),
    ]).then(([formsResult, responsesResult]) => {
      if (formsResult.success) setForms(formsResult.data)
      if (responsesResult.success) setResponses(responsesResult.data)
      setLoading(false)
    })
  }, [user])

  const stats = useMemo(() => {
    const totalForms = forms.length
    const publishedForms = forms.filter((f) => f.status === 'published').length
    const totalSubmissions = responses.length
    const awaitingReview = responses.filter((r) => r.status === 'new').length
    const workNew = responses.filter((r) => (r.workStatus ?? 'new') === 'new').length
    const workInProgress = responses.filter((r) => r.workStatus === 'in_progress').length
    const workCompleted = responses.filter((r) => r.workStatus === 'completed').length
    return { totalForms, publishedForms, totalSubmissions, awaitingReview, workNew, workInProgress, workCompleted }
  }, [forms, responses])

  const publishedForms = useMemo(() => {
    return forms.filter((f) => f.status === 'published')
  }, [forms])

  const handleCopyLink = (shareToken: string) => {
    const url = `${window.location.origin}/form/${shareToken}`
    void navigator.clipboard.writeText(url)
    setCopiedToken(shareToken)
    toast({
      title: 'Link copied to clipboard',
      description: 'Send this public intake link directly to your client.',
      variant: 'success',
    })
    setTimeout(() => {
      setCopiedToken(null)
    }, 2500)
  }

  const handleCreateNewForm = async () => {
    if (!user || creating) return
    setCreating(true)
    const result = await formService.createForm({
      designerId: user.id,
      title: 'Information Collection Form',
      description: 'Fill in correct and appropriate information',
      brandName: '',
      status: 'draft',
      fields: getDefaultFormFields(),
    })

    if (result.success) {
      toast({
        title: 'Form created',
        description: 'Customize fields and questions in the Form Builder.',
        variant: 'success',
      })
      navigate(`/designer/forms/${result.data.id}`)
    }
    setCreating(false)
  }

  return (
    <div className="space-y-6">
      {/* Header with Title and Quick Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Information Collection
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] ?? 'Designer'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create intake forms, share public links with clients, and review submissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => void handleCreateNewForm()} disabled={creating}>
            <Plus className="size-4" /> {creating ? 'Creating...' : 'New intake form'}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/designer/forms">
              View all forms <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading workspace…</div>
      ) : (
        <>
          {/* KPI Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  <span>Total forms</span>
                  <FileText className="size-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{stats.totalForms}</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  <span>Published forms</span>
                  <Share2 className="size-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{stats.publishedForms}</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  <span>Total submissions</span>
                  <Inbox className="size-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{stats.totalSubmissions}</CardContent>
            </Card>

            <Card className={stats.awaitingReview > 0 ? 'border-amber-500/40 bg-amber-500/5' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  <span>Awaiting review</span>
                  {stats.awaitingReview > 0 && (
                    <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent
                className={`text-3xl font-bold ${
                  stats.awaitingReview > 0 ? 'text-amber-600 dark:text-amber-400' : ''
                }`}
              >
                {stats.awaitingReview}
              </CardContent>
            </Card>
          </div>

          {/* Work Status Stats */}
          {responses.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    <span>New</span>
                    <CircleDashed className="size-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold">{stats.workNew}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    <span>In Progress</span>
                    <Zap className="size-4 text-blue-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.workInProgress}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                    <span>Completed</span>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.workCompleted}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Shareable Links Banner (if published forms exist) */}
          {publishedForms.length > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Share2 className="size-4 text-primary" />
                  <span>Shareable client intake links</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {publishedForms.map((form) => (
                    <div
                      key={form.id}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{form.title}</p>
                        <p className="truncate text-xs text-muted-foreground font-mono">
                          /form/{form.shareToken}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 px-2.5 text-xs"
                          onClick={() => form.shareToken && handleCopyLink(form.shareToken)}
                        >
                          {copiedToken === form.shareToken ? (
                            <>
                              <Check className="size-3.5 text-emerald-600" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" /> Copy link
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          asChild
                          title="Open public preview"
                        >
                          <Link to={`/form/${form.shareToken}`} target="_blank">
                            <ExternalLink className="size-3.5 text-muted-foreground" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main 2-column Grid: Recent Forms & Recent Responses */}
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            {/* Left: Recent Intake Forms */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Information collection forms</h2>
                  <p className="text-xs text-muted-foreground">Manage your custom intake forms</p>
                </div>
                <Link to="/designer/forms" className="text-sm font-medium text-primary hover:underline">
                  See all forms ({forms.length})
                </Link>
              </div>

              {forms.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <Sparkles className="size-8 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-sm">No intake forms yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        Create your first custom intake form to start collecting client briefs, specs, and files.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => void handleCreateNewForm()}>
                      <Plus className="size-3.5" /> Create first form
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {forms.slice(0, 4).map((form) => {
                    const formResponseCount = responses.filter((r) => r.formId === form.id).length

                    return (
                      <Card key={form.id} className="transition-all hover:border-primary/40">
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="size-4 text-muted-foreground shrink-0" />
                              <h3 className="font-semibold text-base truncate">{form.title}</h3>
                              <Badge
                                variant={form.status === 'published' ? 'default' : 'secondary'}
                                className="text-[10px] h-5"
                              >
                                {form.status === 'published' ? 'Published' : 'Draft'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {form.description || 'No description provided'}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                              <span>{form.fields.length} fields</span>
                              <span>•</span>
                              <span>{formResponseCount} submission{formResponseCount === 1 ? '' : 's'}</span>
                              <span>•</span>
                              <span>Updated {formatDate(form.updatedAt)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                            {form.shareToken && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                onClick={() => handleCopyLink(form.shareToken!)}
                              >
                                {copiedToken === form.shareToken ? (
                                  <Check className="size-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                                <span className="hidden sm:inline">Link</span>
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                              <Link to={`/designer/forms/${form.id}`}>Edit</Link>
                            </Button>
                            {form.shareToken && (
                              <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                                <Link to={`/form/${form.shareToken}`} target="_blank">
                                  Preview
                                </Link>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right: Recent Client Submissions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Recent submissions</h2>
                  <p className="text-xs text-muted-foreground">Latest client responses</p>
                </div>
                <Link
                  to="/designer/responses"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  See all ({responses.length})
                </Link>
              </div>

              {responses.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <Inbox className="size-8 text-muted-foreground/60" />
                    <div>
                      <p className="font-semibold text-sm">No submissions received</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        When clients submit details through your public forms, responses will appear here.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {responses.slice(0, 5).map((resp) => {
                    const clientName =
                      resp.submittedByName || resp.projectInformation?.clientName || 'Client'
                    const company =
                      resp.projectInformation?.companyName || (resp.answers?.company_name as string) || ''

                    return (
                      <div
                        key={resp.id}
                        className="rounded-xl border bg-card p-3.5 transition-all hover:border-primary/40 hover:bg-muted/20"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {initials(clientName)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-sm">{clientName}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {company || resp.submittedByEmail || '—'}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`flex items-center gap-1 text-[10px] shrink-0 ${workStatusBadgeClass(resp.workStatus ?? 'new')}`}
                          >
                            <WorkStatusIcon status={resp.workStatus ?? 'new'} />
                            {WORK_STATUS_LABELS[resp.workStatus ?? 'new']}
                          </Badge>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                          <span className="truncate max-w-[140px] sm:max-w-[180px]">
                            {resp.formTitle}
                          </span>
                          <span className="shrink-0">{formatRelativeTime(resp.submittedAt)}</span>
                        </div>

                        <div className="mt-2">
                          <Button variant="outline" size="sm" className="w-full h-7 text-xs" asChild>
                            <Link to={`/designer/forms/${resp.formId}/responses/${resp.id}`}>
                              <Eye className="size-3.5" /> View submission details
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
