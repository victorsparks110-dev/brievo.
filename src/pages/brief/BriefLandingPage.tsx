import { ArrowRight, FileText, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/page-loader'
import { usePageMeta } from '@/hooks/usePageMeta'
import { briefService } from '@/services'
import { BRIEF_SERVICE_LABELS } from '@/types/brief'
import type { Brief } from '@/types'
import { useEffect, useState } from 'react'

export function BriefLandingPage() {
  usePageMeta('Project brief')
  const { token } = useParams()
  const [brief, setBrief] = useState<Brief | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    void briefService.getBriefByToken(token).then((result) => {
      if (result.success) {
        setBrief(result.data)
      }
      setIsLoading(false)
    })
  }, [token])

  if (isLoading) {
    return <PageLoader label="Loading brief..." />
  }

  if (!brief) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl">This brief is unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The project link may be expired or incorrect.
            </p>
            <Button asChild>
              <Link to="/">Back to BRIEVO</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
              B
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Project brief</p>
              <h1 className="text-2xl font-semibold">BRIEVO</h1>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden border-none shadow-lg">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{brief.companyName}</Badge>
              <Badge variant="outline">{brief.priority} priority</Badge>
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{brief.title}</h2>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">{brief.description}</p>
          </div>

          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Client</p>
                <p className="mt-2 font-medium">{brief.clientName}</p>
                <p className="text-sm text-muted-foreground">{brief.clientEmail}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Project timeline</p>
                <p className="mt-2 font-medium">Due {new Date(brief.deadline).toLocaleDateString()}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected services</p>
                <p className="mt-2 font-medium">{brief.selectedServices.length} areas</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="font-semibold">Included design services</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {brief.selectedServices.map((service) => (
                  <Badge key={service} variant="secondary">
                    {BRIEF_SERVICE_LABELS[service]}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <h3 className="font-semibold">Designer notes</h3>
              </div>
              <p className="text-sm text-muted-foreground">{brief.designerInstructions || 'No extra guidance provided yet.'}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" asChild>
                <Link to="/">Return home</Link>
              </Button>
              <Button asChild>
                <Link to={`/brief/${token}/form`}>
                  Start your response <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
