import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { formService } from '@/services'
import { getDefaultFormFields, type FormDefinition, type FormResponse } from '@/types'
import { formatDate } from '@/utils/helpers'

export function DesignerFormsPage() {
  usePageMeta('Forms')
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [forms, setForms] = useState<FormDefinition[]>([])
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [formToDelete, setFormToDelete] = useState<FormDefinition | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    const published = forms.filter((form) => form.status === 'published').length
    const drafts = forms.filter((form) => form.status === 'draft').length
    const totalSubmissions = responses.length
    return { total: forms.length, published, drafts, totalSubmissions }
  }, [forms, responses])

  const handleCopyLink = (shareToken: string) => {
    const url = `${window.location.origin}/form/${shareToken}`
    void navigator.clipboard.writeText(url)
    setCopiedToken(shareToken)
    toast({
      title: 'Share link copied',
      description: 'Public link copied to clipboard. Share it with your client.',
      variant: 'success',
    })
    setTimeout(() => {
      setCopiedToken(null)
    }, 2500)
  }

  const handleCreate = async () => {
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
        description: 'Ready to customize in the Form Builder.',
        variant: 'success',
      })
      navigate(`/designer/forms/${result.data.id}`)
    }
    setCreating(false)
  }

  const handleConfirmDelete = async () => {
    if (!formToDelete || deleting) return
    setDeleting(true)
    const result = await formService.deleteForm(formToDelete.id)
    if (result.success) {
      setForms((prev) => prev.filter((f) => f.id !== formToDelete.id))
      toast({
        title: 'Form deleted',
        description: 'The form has been permanently removed.',
        variant: 'success',
      })
    } else {
      toast({
        title: 'Could not delete form',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    }
    setFormToDelete(null)
    setDeleting(false)
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading forms…</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Forms</p>
          <h1 className="text-3xl font-bold tracking-tight">Information collection forms</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Design customizable intake questionnaires, generate shareable links, and collect client submissions.
          </p>
        </div>
        <Button onClick={() => void handleCreate()} disabled={creating}>
          <Plus className="size-4" /> {creating ? 'Creating...' : 'New intake form'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total forms</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{stats.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-primary">{stats.published}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{stats.drafts}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total submissions</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{stats.totalSubmissions}</CardContent>
        </Card>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Sparkles className="size-8 text-muted-foreground" />
            <div>
              <p className="font-semibold text-base">No intake forms yet</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Create your first intake form to collect requirements, brand assets, and custom question answers from clients.
              </p>
            </div>
            <Button onClick={() => void handleCreate()} size="sm">
              <Plus className="size-4" /> Create first form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => {
            const formResponses = responses.filter((r) => r.formId === form.id)
            const responseCount = formResponses.length
            const newCount = formResponses.filter((r) => r.status === 'new').length

            return (
              <Card key={form.id} className="transition-all hover:border-primary/40">
                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <h2 className="text-xl font-semibold truncate">{form.title}</h2>
                      <Badge
                        variant={form.status === 'published' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {form.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                      {newCount > 0 && (
                        <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                          {newCount} new submission{newCount === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                    {(form.brandName ?? '').trim() && (
                      <p className="text-xs font-semibold text-primary">
                        {form.brandName}
                      </p>
                    )}
                    <p className="max-w-2xl text-sm text-muted-foreground line-clamp-2">
                      {form.description || 'No description provided'}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span>{form.fields.length} fields configured</span>
                      <span>•</span>
                      <span>{responseCount} total submission{responseCount === 1 ? '' : 's'}</span>
                      <span>•</span>
                      <span>Updated {formatDate(form.updatedAt)}</span>
                      {form.status === 'published' && form.shareToken && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-primary/80">/form/{form.shareToken}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0">
                    {form.status === 'published' && form.shareToken && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleCopyLink(form.shareToken!)}
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
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/designer/forms/${form.id}`}>
                        Edit builder
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive hover:border-destructive/40"
                      onClick={() => setFormToDelete(form)}
                    >
                      <Trash2 className="size-3.5" /> Delete
                    </Button>
                    {form.status === 'published' && form.shareToken && (
                      <Button variant="ghost" size="sm" asChild title="Preview public form">
                        <Link to={`/form/${form.shareToken}`} target="_blank">
                          <ExternalLink className="size-3.5" /> Preview
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

      <AlertDialog
        open={formToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setFormToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this form?</AlertDialogTitle>
            <AlertDialogDescription>
              “{formToDelete?.title ?? 'This form'}” will be permanently removed. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => setFormToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={() => void handleConfirmDelete()}
            >
              {deleting ? 'Deleting...' : 'Delete Form'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
