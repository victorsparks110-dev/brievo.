import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Save } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ProgressSteps } from '@/components/brief/ProgressSteps'
import { ServiceSelector } from '@/components/brief/ServiceSelector'
import { usePageMeta } from '@/hooks/usePageMeta'
import { briefService } from '@/services'
import { getKV, setKV } from '@/services/mockStorage'
import type { Brief, BriefPriority, BriefService } from '@/types'

const steps = ['Project details', 'Goals & audience', 'References', 'Review']

interface BriefDraftState {
  clientName: string
  clientEmail: string
  companyName: string
  title: string
  description: string
  selectedServices: BriefService[]
  deadline: string
  priority: BriefPriority
  projectRequirements: string
  goals: string
  targetAudience: string
  designPreferences: string
  references: string
  additionalInformation: string
  designerInstructions: string
}

const emptyDraft = (): BriefDraftState => ({
  clientName: '',
  clientEmail: '',
  companyName: '',
  title: '',
  description: '',
  selectedServices: [],
  deadline: '',
  priority: 'medium',
  projectRequirements: '',
  goals: '',
  targetAudience: '',
  designPreferences: '',
  references: '',
  additionalInformation: '',
  designerInstructions: '',
})

export function BriefFormPage() {
  usePageMeta('Complete brief')
  const { token } = useParams()
  const navigate = useNavigate()
  const [brief, setBrief] = useState<Brief | null>(null)
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [draft, setDraft] = useState<BriefDraftState>(emptyDraft())

  useEffect(() => {
    if (!token) return
    void briefService.getBriefByToken(token).then((result) => {
      if (result.success) {
        setBrief(result.data)
        const saved = getKV<BriefDraftState>(`brief-draft:${token}`)
        setDraft((current) => ({
          ...current,
          ...saved,
          clientName: saved?.clientName || result.data.clientName,
          clientEmail: saved?.clientEmail || result.data.clientEmail,
          companyName: saved?.companyName || result.data.companyName,
          title: saved?.title || result.data.title,
          description: saved?.description || result.data.description,
          selectedServices: saved?.selectedServices || result.data.selectedServices,
          deadline: saved?.deadline || result.data.deadline,
          priority: saved?.priority || result.data.priority,
          designerInstructions: saved?.designerInstructions || result.data.designerInstructions,
        }))
      }
      setIsLoading(false)
    })
  }, [token])

  useEffect(() => {
    if (!token) return
    setKV(`brief-draft:${token}`, draft)
  }, [draft, token])

  const canContinue = useMemo(() => {
    if (step === 0) {
      return Boolean(
        draft.companyName &&
          draft.title &&
          draft.description &&
          draft.selectedServices.length
      )
    }

    if (step === 1) {
      return Boolean(
        draft.projectRequirements &&
          draft.goals &&
          draft.targetAudience &&
          draft.designPreferences
      )
    }

    if (step === 2) {
      return Boolean(draft.references || draft.additionalInformation || draft.deadline)
    }

    return true
  }, [draft, step])

  const updateField = <K extends keyof BriefDraftState>(key: K, value: BriefDraftState[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading brief…</div>
  }

  if (!brief) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle>Brief not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">This response link does not exist or is invalid.</p>
            <Button asChild>
              <Link to="/">Back home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company / brand name</Label>
                <Input id="companyName" value={draft.companyName} onChange={(e) => updateField('companyName', e.target.value)} placeholder="Bright Bloom Studio" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Project title</Label>
                <Input id="title" value={draft.title} onChange={(e) => updateField('title', e.target.value)} placeholder="Brand refresh for our studio" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Design services</Label>
              <ServiceSelector value={draft.selectedServices} onChange={(next) => updateField('selectedServices', next)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Project overview</Label>
              <Textarea id="description" value={draft.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Tell us what you need and what success looks like." rows={5} />
            </div>
          </div>
        )
      case 1:
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="projectRequirements">Project requirements</Label>
              <Textarea id="projectRequirements" value={draft.projectRequirements} onChange={(e) => updateField('projectRequirements', e.target.value)} rows={4} placeholder="What exactly do you need the design to include?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goals">Business goals</Label>
              <Textarea id="goals" value={draft.goals} onChange={(e) => updateField('goals', e.target.value)} rows={4} placeholder="What outcomes do you want from the design?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target audience</Label>
              <Textarea id="targetAudience" value={draft.targetAudience} onChange={(e) => updateField('targetAudience', e.target.value)} rows={3} placeholder="Who are you trying to reach?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designPreferences">Design preferences</Label>
              <Textarea id="designPreferences" value={draft.designPreferences} onChange={(e) => updateField('designPreferences', e.target.value)} rows={4} placeholder="Describe the look and feel you want." />
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deadline">Target deadline</Label>
                <Input id="deadline" type="date" value={draft.deadline ? new Date(draft.deadline).toISOString().slice(0, 10) : ''} onChange={(e) => updateField('deadline', new Date(e.target.value).toISOString())} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select id="priority" value={draft.priority} onChange={(e) => updateField('priority', e.target.value as BriefPriority)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-focus-ring/30 focus-visible:border-focus-ring">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="references">References / inspiration</Label>
              <Textarea id="references" value={draft.references} onChange={(e) => updateField('references', e.target.value)} rows={4} placeholder="Add links, notes, examples, or mood references." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalInformation">Additional information</Label>
              <Textarea id="additionalInformation" value={draft.additionalInformation} onChange={(e) => updateField('additionalInformation', e.target.value)} rows={4} placeholder="Anything else the designer should know?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designerInstructions">Designer instructions</Label>
              <Textarea id="designerInstructions" value={draft.designerInstructions} onChange={(e) => updateField('designerInstructions', e.target.value)} rows={3} placeholder="Optional brief instructions you want to pass along." />
            </div>
          </div>
        )
      default:
        return (
          <div className="space-y-5">
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <h3 className="font-semibold">Ready to review</h3>
              </div>
              <p className="text-sm text-muted-foreground">Your response will be submitted to {brief.companyName}. Check the details below before sending it.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Company</p>
                <p className="mt-2 font-medium">{draft.companyName}</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Project</p>
                <p className="mt-2 font-medium">{draft.title}</p>
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected services</p>
              <p className="mt-2 text-sm">{draft.selectedServices.length ? draft.selectedServices.map((service) => service).join(', ') : 'None selected'}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
              <p className="mt-2 text-sm text-muted-foreground">{draft.description}</p>
            </div>
          </div>
        )
    }
  }

  const isFinalStep = step === steps.length - 1

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Project brief</p>
            <h1 className="text-2xl font-semibold">Complete your design brief</h1>
          </div>
          <Button variant="outline" asChild>
            <Link to={`/brief/${token}`}>
              <ArrowLeft className="size-4" /> View brief
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <ProgressSteps steps={steps} current={step} />
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-6">
            {renderStep()}
            <div className="flex items-center justify-between gap-3 border-t pt-5">
              <Button variant="ghost" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0}>
                <ArrowLeft className="size-4" /> Back
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setKV(`brief-draft:${token}`, draft)}>
                  <Save className="size-4" /> Save draft
                </Button>
                <Button
                  onClick={() => {
                    if (isFinalStep) {
                      navigate(`/brief/${token}/review`)
                      return
                    }
                    setStep((current) => Math.min(current + 1, steps.length - 1))
                  }}
                  disabled={!canContinue}
                >
                  {isFinalStep ? 'Review brief' : 'Continue'}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
