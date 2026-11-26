import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  ArrowLeft,
  CheckCheck,
  CheckCircle2,
  CircleDashed,
  Clock,
  Download,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { useToast } from '@/context/ToastContext'
import { formService } from '@/services'
import { getToken } from '@/services/apiClient'
import type { FormDefinition, FormField, FormResponse, WorkStatus } from '@/types'
import { WORK_STATUS_LABELS } from '@/types'
import { createGmailComposeUrl, formatDate } from '@/utils/helpers'

// ── Work status helpers ────────────────────────────────────────────────────

const WORK_STATUS_NEXT: Partial<Record<WorkStatus, WorkStatus>> = {
  new: 'in_progress',
  in_progress: 'completed',
}

const WORK_STATUS_BUTTON_LABELS: Partial<Record<WorkStatus, string>> = {
  new: 'Start Work',
  in_progress: 'Mark as Completed',
}

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive'

const workStatusBadgeVariant = (status: WorkStatus): BadgeVariant => {
  switch (status) {
    case 'completed':   return 'default'
    case 'in_progress': return 'secondary'
    default:            return 'outline'
  }
}

const workStatusBadgeClass = (status: WorkStatus): string => {
  switch (status) {
    case 'completed':    return 'bg-emerald-500/15 text-emerald-700 border-emerald-400/30 dark:text-emerald-400'
    case 'in_progress':  return 'bg-blue-500/15 text-blue-700 border-blue-400/30 dark:text-blue-400'
    default:             return 'bg-muted text-muted-foreground'
  }
}

const WorkStatusIcon = ({ status }: { status: WorkStatus }) => {
  switch (status) {
    case 'completed':    return <CheckCircle2 className="size-4 text-emerald-600" />
    case 'in_progress':  return <Zap className="size-4 text-blue-600" />
    default:             return <CircleDashed className="size-4 text-muted-foreground" />
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function DesignerFormResponsePage() {
  usePageMeta('Form response')
  const { formId, responseId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [form, setForm] = useState<FormDefinition | null>(null)
  const [response, setResponse] = useState<FormResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [subject, setSubject] = useState("We've Received Your Information")
  const [message, setMessage] = useState('')

  const handleDownloadFile = async (file: { fileName: string; url: string; dataUrl?: string; gridFsFileId?: string | null }) => {
    // 1. Try server-side download via GridFS (files uploaded through the new system)
    if (file.gridFsFileId) {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
        const token = getToken()
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const response = await fetch(`${API_BASE_URL}/api/forms/files/${file.gridFsFileId}`, { headers })
        if (response.ok) {
          const blob = await response.blob()
          const objectUrl = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = objectUrl
          link.download = file.fileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(objectUrl)
          return
        }
      } catch {
        // Fall through to next method
      }
    }

    // 2. Fall back to dataUrl stored in the response metadata
    if (file.dataUrl) {
      const link = document.createElement('a')
      link.href = file.dataUrl
      link.download = file.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    // 3. Fall back to URL (real backend storage)
    if (file.url) {
      window.open(file.url, '_blank', 'noopener,noreferrer')
      return
    }

    // 4. No data available
    toast({
      title: 'Download unavailable',
      description: 'File data was not stored. The client may need to re-submit the form.',
      variant: 'destructive',
    })
  }

  useEffect(() => {
    if (!responseId) return

    void Promise.all([
      formService.getResponseById(responseId),
      formId ? formService.getFormById(formId) : Promise.resolve({ success: false, data: null }),
    ]).then(([responseResult, formResult]) => {
      if (responseResult.success) {
        setResponse(responseResult.data)
        const name = responseResult.data.submittedByName || 'Client'
        const designerName = user?.name || 'Designer'
        setSubject("We've Received Your Information")
        setMessage(
          `Hello ${name},\n\nThank you for submitting your project information. I have received your submission.\n\n\n${designerName}`
        )
      }
      if (formResult.success && formResult.data) {
        setForm(formResult.data)
      }
      setLoading(false)
    })
  }, [formId, responseId])

  const handleReview = async () => {
    if (!responseId) return
    const result = await formService.markResponseReviewed(responseId)
    if (result.success) {
      setResponse(result.data)
      toast({
        title: 'Response marked reviewed',
        description: 'The client submission status has been updated to reviewed.',
        variant: 'success',
      })
    }
  }

  const [confirmationErrors, setConfirmationErrors] = useState<{ to?: string; subject?: string; message?: string }>({})

  const validateConfirmationForm = (): boolean => {
    const errors: { to?: string; subject?: string; message?: string } = {}
    const toEmail = response?.submittedByEmail?.trim()
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      errors.to = 'A valid recipient email is required.'
    }
    if (!subject.trim()) {
      errors.subject = 'Subject is required.'
    }
    if (!message.trim()) {
      errors.message = 'Message is required.'
    }
    setConfirmationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSendConfirmation = async () => {
    if (!validateConfirmationForm()) return
    if (!response?.submittedByEmail || !responseId) return
    const gmailUrl = createGmailComposeUrl({
      to: response.submittedByEmail,
      subject,
      body: message,
    })
    window.open(gmailUrl, '_blank', 'noopener,noreferrer')

    // Record the confirmation action on the backend
    const result = await formService.sendConfirmationEmail(responseId, subject, message)
    if (result.success && result.data) {
      setResponse(result.data)
      toast({
        title: 'Confirmation recorded',
        description: 'The confirmation email action has been recorded.',
        variant: 'success',
      })
    }
  }

  const handleAdvanceStatus = async (next: WorkStatus) => {
    if (!responseId || !response) return

    // Completion requires confirmation dialog
    if (next === 'completed') {
      setShowCompleteDialog(true)
      return
    }

    setUpdating(true)
    const result = await formService.updateWorkStatus(responseId, next)
    setUpdating(false)
    if (result.success) {
      setResponse(result.data)
      toast({
        title: `Status updated to "${WORK_STATUS_LABELS[next]}"`,
        description: 'Work progress status has been saved.',
        variant: 'success',
      })
    }
  }

  const handleConfirmComplete = async () => {
    if (!responseId) return
    setUpdating(true)
    const result = await formService.updateWorkStatus(responseId, 'completed')
    setUpdating(false)
    setShowCompleteDialog(false)
    if (result.success) {
      setResponse(result.data)
      toast({
        title: 'Work marked as Completed 🎉',
        description: 'This client project has been marked as completed.',
        variant: 'success',
      })
    }
  }

  if (loading || !response) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading response…
      </div>
    )
  }

  const workStatus: WorkStatus = response.workStatus ?? 'new'
  const nextStatus = WORK_STATUS_NEXT[workStatus]
  const nextLabel = nextStatus ? WORK_STATUS_BUTTON_LABELS[workStatus] : null

  // Format answer for a field
  const getFieldValue = (field: FormField) => {
    const rawVal = response.answers[field.id]
    const otherVal = response.answers[`${field.id}_other`]

    if (field.type === 'amount') {
      const num = Number(rawVal || response.projectInformation?.amount || 0)
      const cur = field.currency || response.projectInformation?.currency || 'NGN (₦)'
      return num > 0 ? `${cur} ${num.toLocaleString()}` : '—'
    }

    if (field.type === 'color') {
      const colText = rawVal || response.projectInformation?.preferredColors || ''
      const hex = response.projectInformation?.preferredColorHex || ''
      if (colText === 'No preference' || response.projectInformation?.noColorPreference) {
        return 'No specific color preference'
      }
      return (
        <div className="flex items-center gap-2">
          {hex && hex !== '#000000' && (
            <span
              className="inline-block size-4 rounded-full border shadow-xs"
              style={{ backgroundColor: hex }}
            />
          )}
          <span>{colText || hex || '—'}</span>
        </div>
      )
    }

    if (field.type === 'file_upload' || field.type === 'image_upload') {
      const matchedFiles = response.uploadedFiles.filter(
        (f) =>
          f.fieldId === field.id ||
          (field.id === 'project_files' && f.category === 'project') ||
          (field.id === 'brand_assets' && f.category === 'brand_asset') ||
          (field.id === 'reference_files' && f.category === 'reference')
      )
      if (matchedFiles.length === 0) return <span className="text-muted-foreground">No files uploaded</span>
      return (
        <div className="space-y-1.5 pt-1">
          {matchedFiles.map((file, i) => (
            <div
              key={`${file.fileName}-${i}`}
              className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm shadow-xs hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                <Paperclip className="size-4 text-primary shrink-0" />
                <span className="font-medium truncate">{file.fileName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs">
                  {file.category}
                </Badge>
                <button
                  type="button"
                  onClick={() => handleDownloadFile(file)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Download file"
                >
                  <Download className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (Array.isArray(rawVal)) {
      const displayList = [...rawVal]
      if (otherVal) {
        displayList.push(`Other (${otherVal})`)
      }
      return displayList.length > 0 ? displayList.join(', ') : '—'
    }

    if (rawVal === 'Other' && otherVal) {
      return `Other: ${otherVal}`
    }

    if (rawVal !== undefined && rawVal !== null && String(rawVal).trim()) {
      return String(rawVal)
    }

    // Fallbacks from structured projectInformation
    if (field.id === 'client_name') return response.projectInformation?.clientName || response.submittedByName
    if (field.id === 'client_email') return response.projectInformation?.clientEmail || response.submittedByEmail
    if (field.id === 'client_phone') return response.projectInformation?.clientPhone || '—'
    if (field.id === 'company_name') return response.projectInformation?.companyName || '—'
    if (field.id === 'project_type') {
      const pts = response.projectInformation?.projectTypes || []
      const opt = response.projectInformation?.otherProjectType
      return pts.length > 0 ? (opt ? `${pts.join(', ')} (${opt})` : pts.join(', ')) : '—'
    }
    if (field.id === 'project_description') return response.projectInformation?.description || '—'
    if (field.id === 'project_goal') {
      const pg = response.projectInformation?.projectGoal
      const opg = response.projectInformation?.otherProjectGoal
      return pg ? (opg ? `${pg}: ${opg}` : pg) : '—'
    }
    if (field.id === 'target_audience') return response.projectInformation?.targetAudience || '—'
    if (field.id === 'project_deadline') {
      return response.projectInformation?.noSpecificDeadline
        ? 'No specific deadline'
        : response.projectInformation?.deadline || '—'
    }
    if (field.id === 'project_content') return response.projectInformation?.content || '—'
    if (field.id === 'project_usage') {
      const pu = response.projectInformation?.projectUsage || []
      const opu = response.projectInformation?.otherProjectUsage
      return pu.length > 0 ? (opu ? `${pu.join(', ')} (${opu})` : pu.join(', ')) : '—'
    }
    if (field.id === 'additional_notes') return response.projectInformation?.additionalNotes || '—'

    return '—'
  }

  // Find any answers not represented in form.fields
  const mappedFieldIds = new Set((form?.fields ?? []).map((f) => f.id))
  const unmappedAnswers = Object.entries(response.answers).filter(
    ([key]) =>
      !mappedFieldIds.has(key) &&
      !key.endsWith('_other') &&
      ![
        'clientName',
        'clientEmail',
        'clientPhone',
        'companyName',
        'projectTypes',
        'otherProjectType',
        'projectDescription',
        'agreedProjectAmount',
        'currency',
        'projectGoal',
        'otherProjectGoal',
        'targetAudience',
        'deadline',
        'noSpecificDeadline',
        'content',
        'preferredColors',
        'preferredColorHex',
        'noColorPreference',
        'projectUsage',
        'otherProjectUsage',
      ].includes(key)
  )

  return (
    <>
      {/* Completion Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this work as completed?</AlertDialogTitle>
            <AlertDialogDescription>
              Once marked as completed, this response will be identified as completed. The completion
              date will be recorded and the submission will remain accessible for your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmComplete()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="size-4 mr-2" />
              Mark as Completed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(formId ? `/designer/forms/${formId}` : '/designer/forms')}
              aria-label="Back to form"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Form Submission
                </p>
                {/* Email/review status badge */}
                <Badge
                  variant={
                    response.status === 'confirmed'
                      ? 'default'
                      : response.status === 'reviewed'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {response.status === 'confirmed'
                    ? 'Confirmation sent'
                    : response.status === 'reviewed'
                    ? 'Reviewed'
                    : 'New'}
                </Badge>
                {/* Work status badge */}
                <Badge
                  variant={workStatusBadgeVariant(workStatus)}
                  className={`flex items-center gap-1 ${workStatusBadgeClass(workStatus)}`}
                >
                  <WorkStatusIcon status={workStatus} />
                  {WORK_STATUS_LABELS[workStatus]}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {response.submittedByName}
              </h1>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={response.status === 'reviewed' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => void handleReview()}
            >
              <ShieldCheck className="size-4" />
              {response.status === 'reviewed' ? 'Reviewed' : 'Mark as Reviewed'}
            </Button>

            {/* Work progress advance button */}
            {nextLabel && nextStatus && (
              <Button
                size="sm"
                disabled={updating}
                variant={nextStatus === 'completed' ? 'default' : 'default'}
                className={
                  nextStatus === 'completed'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : ''
                }
                onClick={() => void handleAdvanceStatus(nextStatus)}
              >
                {updating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : nextStatus === 'completed' ? (
                  <CheckCircle2 className="size-4" />
                ) : nextStatus === 'in_progress' ? (
                  <Zap className="size-4" />
                ) : (
                  <Clock className="size-4" />
                )}
                {nextLabel}
              </Button>
            )}
          </div>
        </div>

        {/* Completed banner */}
        {workStatus === 'completed' && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-5 py-4">
            <CheckCircle2 className="size-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                Work Completed
              </p>
              {response.completedAt && (
                <p className="text-sm text-emerald-600/80 dark:text-emerald-400/70">
                  Completed on {formatDate(response.completedAt)}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          {/* Main Response Data */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="size-5 text-primary" /> Submitted Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {form?.fields && form.fields.length > 0 ? (
                  form.fields.map((field, index) => (
                    <div key={field.id} className="rounded-lg border bg-muted/20 p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Field {index + 1}: {field.label}
                        </p>
                        {field.required && (
                          <Badge variant="outline" className="text-[10px]">
                            Required
                          </Badge>
                        )}
                      </div>
                      <div className="font-medium text-foreground text-sm whitespace-pre-wrap leading-relaxed">
                        {getFieldValue(field)}
                      </div>
                    </div>
                  ))
                ) : (
                  /* Fallback if form definition is not loaded */
                  <>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Client Contact
                      </p>
                      <p className="mt-1 font-medium">{response.projectInformation.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {response.projectInformation.clientEmail} · {response.projectInformation.clientPhone}
                      </p>
                      {response.projectInformation.companyName && (
                        <p className="text-sm text-muted-foreground">
                          {response.projectInformation.companyName}
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Project Type
                      </p>
                      <p className="mt-1 font-medium">
                        {response.projectInformation.projectTypes.join(', ') || '—'}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Project Description
                      </p>
                      <p className="mt-1 whitespace-pre-wrap font-medium">
                        {response.projectInformation.description}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Agreed Amount
                      </p>
                      <p className="mt-1 font-medium">
                        {response.projectInformation.currency}{' '}
                        {response.projectInformation.amount.toLocaleString()}
                      </p>
                    </div>
                  </>
                )}

                {/* Extra / Unmapped Answers */}
                {unmappedAnswers.length > 0 && (
                  <div className="pt-4 space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                      Additional Answers
                    </h3>
                    {unmappedAnswers.map(([key, value]) => (
                      <div key={key} className="rounded-lg border p-3.5 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="font-medium text-sm">
                          {Array.isArray(value) ? value.join(', ') : String(value ?? '—')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Uploaded Files Section */}
                {response.uploadedFiles && response.uploadedFiles.length > 0 && (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4 mt-4">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Paperclip className="size-4 text-primary" /> All Attached Files (
                      {response.uploadedFiles.length})
                    </div>
                    <div className="grid gap-2">
                      {response.uploadedFiles.map((file, idx) => (
                        <div
                          key={`${file.fileName}-${idx}`}
                          className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            <Paperclip className="size-4 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{file.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs uppercase shrink-0">
                              {file.category}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(file)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              title="Download file"
                            >
                              <Download className="size-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Work Status Card */}
            <Card className={workStatus === 'completed' ? 'border-emerald-500/30' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <WorkStatusIcon status={workStatus} />
                  Work Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status progress pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['new', 'in_progress', 'completed'] as WorkStatus[]).map(
                    (s, idx, arr) => {
                      const statuses = arr
                      const currentIdx = statuses.indexOf(workStatus)
                      const isActive = s === workStatus
                      const isPast = statuses.indexOf(s) < currentIdx
                      return (
                        <div key={s} className="flex items-center gap-1.5">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                              isActive
                                ? workStatusBadgeClass(workStatus) + ' border-current'
                                : isPast
                                ? 'bg-muted/60 text-muted-foreground border-border line-through'
                                : 'bg-muted/30 text-muted-foreground/50 border-border/50'
                            }`}
                          >
                            {WORK_STATUS_LABELS[s]}
                          </span>
                          {idx < arr.length - 1 && (
                            <span className="text-muted-foreground/40 text-xs">→</span>
                          )}
                        </div>
                      )
                    }
                  )}
                </div>

                {/* Next action button inside the card */}
                {nextLabel && nextStatus && (
                  <Button
                    className={`w-full ${
                      nextStatus === 'completed'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : ''
                    }`}
                    disabled={updating}
                    onClick={() => void handleAdvanceStatus(nextStatus)}
                  >
                    {updating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : nextStatus === 'completed' ? (
                      <CheckCircle2 className="size-4" />
                    ) : nextStatus === 'in_progress' ? (
                      <Zap className="size-4" />
                    ) : (
                      <Clock className="size-4" />
                    )}
                    {nextLabel}
                  </Button>
                )}

                {workStatus === 'completed' && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>This work has been completed</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submission Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Submission Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex justify-between border-b pb-2">
                  <span>Submitted by:</span>
                  <span className="font-medium text-foreground">{response.submittedByName}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Email:</span>
                  <span className="font-medium text-foreground">{response.submittedByEmail}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Received:</span>
                  <span className="font-medium text-foreground">
                    {formatDate(response.submittedAt)}
                  </span>
                </div>
                {response.reviewedAt && (
                  <div className="flex justify-between border-b pb-2">
                    <span>Reviewed at:</span>
                    <span className="font-medium text-foreground">
                      {formatDate(response.reviewedAt)}
                    </span>
                  </div>
                )}
                {response.completedAt && (
                  <div className="flex justify-between border-b pb-2">
                    <span>Completed at:</span>
                    <span className="font-medium text-emerald-600">
                      {formatDate(response.completedAt)}
                    </span>
                  </div>
                )}
                {response.confirmationSentAt && (
                  <div className="flex justify-between pb-1">
                    <span>Confirmation sent:</span>
                    <span className="font-medium text-foreground">
                      {formatDate(response.confirmationSentAt)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Email Confirmation Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="size-4 text-primary" /> Send Confirmation Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">To</Label>
                  <Input value={response.submittedByEmail} readOnly className="bg-muted/50 text-xs" />
                  {confirmationErrors.to && (
                    <p className="text-xs text-destructive">{confirmationErrors.to}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Subject
                  </Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  {confirmationErrors.subject && (
                    <p className="text-xs text-destructive">{confirmationErrors.subject}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Message
                  </Label>
                  <Textarea
                    rows={8}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="text-xs leading-relaxed"
                  />
                  {confirmationErrors.message && (
                    <p className="text-xs text-destructive">{confirmationErrors.message}</p>
                  )}
                </div>
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={handleSendConfirmation}
                >
                  <Mail className="size-4" /> Open Gmail &amp; Send
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Opens Gmail with a pre-filled email. Review and send from your Gmail account.
                </p>
              </CardContent>
            </Card>

            {response.status === 'confirmed' && (
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="flex items-center gap-2 py-4 text-sm text-emerald-600 font-medium">
                  <CheckCheck className="size-5" /> Confirmation email logged successfully
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
