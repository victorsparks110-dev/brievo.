import { PencilLine, Send } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/page-loader'
import { usePageMeta } from '@/hooks/usePageMeta'
import { briefService } from '@/services'
import { getKV, removeKV } from '@/services/mockStorage'
import { BRIEF_SERVICE_LABELS } from '@/types/brief'
import type { Brief, BriefResponse } from '@/types'

interface BriefDraftState {
  companyName: string
  title: string
  description: string
  selectedServices: string[]
  deadline: string
  priority: string
  projectRequirements: string
  goals: string
  targetAudience: string
  designPreferences: string
  references: string
  additionalInformation: string
}

export function BriefReviewPage() {
  usePageMeta('Review brief')
  const { token } = useParams()
  const navigate = useNavigate()
  const [brief, setBrief] = useState<Brief | null>(null)
  const [draft, setDraft] = useState<BriefDraftState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return

    void briefService.getBriefByToken(token).then((briefResult) => {
      if (briefResult.success) {
        setBrief(briefResult.data)
      }

      const saved = getKV<BriefDraftState>(`brief-draft:${token}`)
      setDraft(saved)
      setIsLoading(false)
    })
  }, [token])

  const summary = useMemo(() => {
    if (!draft) return []
    return [
      { label: 'Company', value: draft.companyName },
      { label: 'Project', value: draft.title },
      { label: 'Timeline', value: draft.deadline ? new Date(draft.deadline).toLocaleDateString() : 'Not set' },
      { label: 'Priority', value: draft.priority },
    ]
  }, [draft])

  const handleSubmit = async () => {
    if (!brief || !draft || !token) return

    setSubmitting(true)
    const response: Omit<BriefResponse, 'id' | 'briefId' | 'submittedAt'> = {
      businessInformation: draft.description || brief.description,
      projectRequirements: draft.projectRequirements,
      goals: draft.goals,
      targetAudience: draft.targetAudience,
      designPreferences: draft.designPreferences,
      references: draft.references,
      additionalInformation: draft.additionalInformation,
    }

    const result = await briefService.submitBrief(brief.id, response)
    setSubmitting(false)

    if (result.success) {
      removeKV(`brief-draft:${token}`)
      navigate(`/brief/${token}/success`)
    }
  }

  if (isLoading || !draft) {
    return <PageLoader label="Preparing review..." />
  }

  if (!brief) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle>Unable to review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">The brief could not be loaded.</p>
            <Button asChild>
              <Link to="/">Back home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Review</p>
            <h1 className="text-2xl font-semibold">Check your brief before submitting</h1>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/brief/${token}/form`}>
              <PencilLine className="size-4" /> Edit
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{brief.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {summary.map((item) => (
                <div key={item.label} className="rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-2 font-medium">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected services</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {brief.selectedServices.map((service) => (
                  <Badge key={service} variant="secondary">
                    {BRIEF_SERVICE_LABELS[service]}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Project overview</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{draft.description || brief.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Project requirements</p>
                <p className="mt-2 text-sm text-muted-foreground">{draft.projectRequirements}</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Business goals</p>
                <p className="mt-2 text-sm text-muted-foreground">{draft.goals}</p>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Design preferences</p>
              <p className="mt-2 text-sm text-muted-foreground">{draft.designPreferences}</p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">References</p>
              <p className="mt-2 text-sm text-muted-foreground">{draft.references || 'No references shared yet.'}</p>
            </div>

            <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:justify-end">
              <Button variant="outline" asChild>
                <Link to={`/brief/${token}/form`}>Back to form</Link>
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit brief'}
                <Send className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
