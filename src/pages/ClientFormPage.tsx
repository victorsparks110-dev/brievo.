import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Moon, Paperclip, Send, Sun, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useTheme } from '@/context/ThemeContext'
import { formService } from '@/services'
import {
  getDefaultFormFields,
  type FormDefinition,
  type FormField,
  type FormResponse,
  type ProjectGoal,
  type ProjectInformation,
  type ProjectType,
  type ProjectUsage,
  type UploadedFormFile,
} from '@/types'

export function ClientFormPage() {
  usePageMeta('Client Project Intake Form')
  const { token } = useParams()
  const navigate = useNavigate()
  const { lightMode, setLightMode } = useTheme()

  const [form, setForm] = useState<FormDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [response, setResponse] = useState<FormResponse | null>(null)
  const [validationError, setValidationError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Form answer state stored by field.id
  const [answers, setAnswers] = useState<Record<string, any>>({})
  // Other specifications stored by field.id + '_other'
  const [otherSpecs, setOtherSpecs] = useState<Record<string, string>>({})
  // Files stored by field.id
  const [uploadedFieldFiles, setUploadedFieldFiles] = useState<Record<string, File[]>>({})
  // Optional color hex state
  const [colorHexMap, setColorHexMap] = useState<Record<string, string>>({})
  const [noColorMap, setNoColorMap] = useState<Record<string, boolean>>({})
  // Date no-deadline toggles
  const [noDeadlineMap, setNoDeadlineMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!token) return
    void formService.getFormByShareToken(token).then((result) => {
      if (result.success) {
        const loadedForm = result.data
        if (!loadedForm.fields || loadedForm.fields.length === 0) {
          loadedForm.fields = getDefaultFormFields()
        }
        setForm(loadedForm)
      }
      setLoading(false)
    })
  }, [token])

  const updateAnswer = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }))
    setValidationError('')
  }

  const updateOtherSpec = (fieldId: string, value: string) => {
    setOtherSpecs((prev) => ({ ...prev, [fieldId]: value }))
    setValidationError('')
  }

  const handleFileUpload = (fieldId: string, files: FileList | null, allowMultiple = true) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    setUploadedFieldFiles((prev) => ({
      ...prev,
      [fieldId]: allowMultiple ? [...(prev[fieldId] ?? []), ...fileArray] : fileArray,
    }))
    setValidationError('')
  }

  const removeUploadedFile = (fieldId: string, index: number) => {
    setUploadedFieldFiles((prev) => ({
      ...prev,
      [fieldId]: (prev[fieldId] ?? []).filter((_, i) => i !== index),
    }))
  }

  const renderFieldInput = (field: FormField) => {
    const value = answers[field.id]
    const otherVal = otherSpecs[field.id] ?? ''

    switch (field.type) {
      case 'long_text':
        return (
          <Textarea
            id={field.id}
            rows={5}
            value={value ?? ''}
            onChange={(e) => updateAnswer(field.id, e.target.value)}
            placeholder={field.placeholder || 'Type your detailed response here...'}
            className="w-full text-sm leading-relaxed rounded-xl h-auto min-h-[120px]"
          />
        )

      case 'checkbox': {
        const currentSelections: string[] = Array.isArray(value) ? value : []
        const hasOtherSelected = currentSelections.includes('Other')

        return (
          <div className="space-y-3">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {(field.options ?? []).map((option) => {
                const isSelected = currentSelections.includes(option.value)
                return (
                  <label
                    key={option.id}
                    onClick={() => {
                      const next = isSelected
                        ? currentSelections.filter((v) => v !== option.value)
                        : [...currentSelections, option.value]
                      updateAnswer(field.id, next)
                    }}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-sm transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/[0.06] text-foreground font-semibold shadow-sm shadow-primary/5'
                        : 'border-muted-foreground/15 bg-background hover:border-muted-foreground/30 hover:bg-muted/20 text-muted-foreground'
                    }`}
                  >
                    <div className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/30 bg-background'
                    }`}>
                      {isSelected && (
                        <svg className="size-3" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span>{option.label}</span>
                  </label>
                )
              })}
            </div>

            {(field.allowOther || hasOtherSelected) && hasOtherSelected && (
              <div className="space-y-1.5 pt-1 pl-1">
                <Label htmlFor={`${field.id}_other`} className="text-xs font-semibold">
                  Please specify <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`${field.id}_other`}
                  value={otherVal}
                  onChange={(e) => updateOtherSpec(field.id, e.target.value)}
                  placeholder={field.otherPlaceholder || 'Please describe your selection'}
                  className="h-11 rounded-xl"
                />
              </div>
            )}
          </div>
        )
      }

      case 'multiple_choice':
      case 'dropdown': {
        const options = field.options ?? []
        const selectedVal = String(value ?? '')
        const isOther = selectedVal === 'Other'

        return (
          <div className="space-y-3">
            <Select value={selectedVal} onValueChange={(val) => updateAnswer(field.id, val)}>
              <SelectTrigger id={field.id} className="w-full h-11 rounded-xl">
                <SelectValue placeholder={field.placeholder || 'Choose an option...'} />
              </SelectTrigger>
              <SelectContent className="max-h-72 rounded-xl">
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.value} className="rounded-lg">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(field.allowOther || isOther) && isOther && (
              <div className="space-y-1.5 pt-1 pl-1">
                <Label htmlFor={`${field.id}_other`} className="text-xs font-semibold">
                  Please specify <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`${field.id}_other`}
                  value={otherVal}
                  onChange={(e) => updateOtherSpec(field.id, e.target.value)}
                  placeholder={field.otherPlaceholder || 'Please describe your selection'}
                  className="h-11 rounded-xl"
                />
              </div>
            )}
          </div>
        )
      }

      case 'yes_no': {
        const selectedVal = String(value ?? '')
        return (
          <div className="flex gap-3">
            {['Yes', 'No'].map((choice) => {
              const isSelected = selectedVal === choice
              return (
                <Button
                  key={choice}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => updateAnswer(field.id, choice)}
                  className={`flex-1 py-3.5 rounded-xl text-sm font-semibold ${
                    isSelected ? 'shadow-sm shadow-primary/10' : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                  }`}
                >
                  {choice}
                </Button>
              )
            })}
          </div>
        )
      }

      case 'date': {
        const isNoDeadline = !!noDeadlineMap[field.id]
        return (
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Input
                id={field.id}
                type="date"
                value={value ?? ''}
                disabled={isNoDeadline}
                onChange={(e) => updateAnswer(field.id, e.target.value)}
                className="flex-1 h-11 rounded-xl"
              />
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium shrink-0">
                <Checkbox
                  checked={isNoDeadline}
                  onCheckedChange={(checked) => {
                    setNoDeadlineMap((prev) => ({ ...prev, [field.id]: !!checked }))
                    if (checked) {
                      updateAnswer(field.id, '')
                    }
                  }}
                />
                <span>No specific date</span>
              </label>
            </div>
          </div>
        )
      }

      case 'amount': {
        const cur = field.currency || 'NGN (₦)'
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-11 items-center justify-center rounded-xl border border-muted-foreground/15 bg-muted/30 px-3.5 text-sm font-semibold text-muted-foreground shrink-0">
              {cur}
            </div>
            <Input
              id={field.id}
              type="number"
              min="0"
              step="any"
              value={value ?? ''}
              onChange={(e) => updateAnswer(field.id, e.target.value)}
              placeholder={field.placeholder || '150000'}
              className="flex-1 h-11 rounded-xl text-base font-medium"
            />
          </div>
        )
      }

      case 'color': {
        const noPref = !!noColorMap[field.id]
        const hex = colorHexMap[field.id] ?? '#1E3A8A'

        return (
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={noPref}
                onCheckedChange={(checked) => {
                  setNoColorMap((prev) => ({ ...prev, [field.id]: !!checked }))
                  if (checked) updateAnswer(field.id, 'No preference')
                  else updateAnswer(field.id, '')
                }}
              />
              <span className="font-medium">No specific color preference</span>
            </label>

            {!noPref && (
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Input
                  id={field.id}
                  value={value === 'No preference' ? '' : value ?? ''}
                  onChange={(e) => updateAnswer(field.id, e.target.value)}
                  placeholder={field.placeholder || 'e.g. Navy blue, gold accents, earthy tones'}
                  className="flex-1 h-11 rounded-xl"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    type="color"
                    value={hex}
                    onChange={(e) => {
                      setColorHexMap((prev) => ({ ...prev, [field.id]: e.target.value }))
                      if (!value || value === 'No preference') {
                        updateAnswer(field.id, e.target.value)
                      }
                    }}
                    className="h-11 w-16 cursor-pointer p-1 rounded-xl"
                    aria-label="Color Picker"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{hex}</span>
                </div>
              </div>
            )}
          </div>
        )
      }

      case 'file_upload':
      case 'image_upload': {
        const files = uploadedFieldFiles[field.id] ?? []
        const isMultiple = field.allowMultiple ?? true

        return (
          <div className="space-y-3">
            <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 p-8 text-center hover:bg-muted/30 hover:border-muted-foreground/30 transition-all cursor-pointer group">
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors">
                <Upload className="size-6 text-primary/60" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Click to browse or drop {field.type === 'image_upload' ? 'images' : 'files'} here
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {isMultiple ? 'Upload one or multiple files' : 'Upload a single file'}
              </p>
              <input
                id={field.id}
                type="file"
                multiple={isMultiple}
                accept={field.type === 'image_upload' ? 'image/*' : undefined}
                onChange={(e) => handleFileUpload(field.id, e.target.files, isMultiple)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Selected Files ({files.length})
                </p>
                {files.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between rounded-xl border border-muted-foreground/10 bg-background px-4 py-3 text-sm shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Paperclip className="size-4 text-primary shrink-0" />
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:bg-destructive/10 rounded-lg"
                      onClick={() => removeUploadedFile(field.id, idx)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      default:
        return (
          <Input
            id={field.id}
            type={
              field.type === 'email'
                ? 'email'
                : field.type === 'phone'
                ? 'tel'
                : field.type === 'number'
                ? 'number'
                : field.type === 'url'
                ? 'url'
                : 'text'
            }
            value={value ?? ''}
            onChange={(e) => updateAnswer(field.id, e.target.value)}
            placeholder={field.placeholder || 'Your response...'}
            className="w-full text-sm h-11 rounded-xl"
          />
        )
    }
  }

  const handleSubmit = async () => {
    if (!form) return
    setValidationError('')

    // Validate required fields
    for (const field of form.fields) {
      if (field.required) {
        if (field.type === 'file_upload' || field.type === 'image_upload') {
          const files = uploadedFieldFiles[field.id] ?? []
          if (files.length === 0) {
            setValidationError(`Please upload required file(s) for "${field.label}".`)
            return
          }
        } else if (field.type === 'checkbox') {
          const val = answers[field.id]
          if (!Array.isArray(val) || val.length === 0) {
            setValidationError(`Please select at least one option for "${field.label}".`)
            return
          }
          if (val.includes('Other') && !(otherSpecs[field.id] ?? '').trim()) {
            setValidationError(`Please specify your "Other" selection for "${field.label}".`)
            return
          }
        } else if (field.type === 'multiple_choice' || field.type === 'dropdown') {
          const val = answers[field.id]
          if (!val || !String(val).trim()) {
            setValidationError(`Please make a selection for "${field.label}".`)
            return
          }
          if (val === 'Other' && !(otherSpecs[field.id] ?? '').trim()) {
            setValidationError(`Please specify your "Other" selection for "${field.label}".`)
            return
          }
        } else if (field.type === 'amount') {
          const val = Number(answers[field.id])
          if (!answers[field.id] || isNaN(val) || val <= 0) {
            setValidationError(`Please enter a valid amount for "${field.label}".`)
            return
          }
        } else if (field.type === 'date') {
          const isNoDeadline = !!noDeadlineMap[field.id]
          if (!isNoDeadline && !answers[field.id]) {
            setValidationError(`Please select a date or check "No specific date" for "${field.label}".`)
            return
          }
        } else {
          const val = answers[field.id]
          if (!val || !String(val).trim()) {
            setValidationError(`Please fill in the required question: "${field.label}".`)
            return
          }
        }
      } else {
        // Even if optional, if "Other" was checked/selected, check if otherSpec is required
        if (field.type === 'checkbox') {
          const val = answers[field.id]
          if (Array.isArray(val) && val.includes('Other') && !(otherSpecs[field.id] ?? '').trim()) {
            setValidationError(`Please specify your "Other" selection for "${field.label}".`)
            return
          }
        }
        if (field.type === 'multiple_choice' || field.type === 'dropdown') {
          const val = answers[field.id]
          if (val === 'Other' && !(otherSpecs[field.id] ?? '').trim()) {
            setValidationError(`Please specify your "Other" selection for "${field.label}".`)
            return
          }
        }
      }
    }

    setSubmitting(true)

    // Build comprehensive answers map
    const submittedAnswers: Record<string, any> = { ...answers }
    Object.entries(otherSpecs).forEach(([fieldId, specVal]) => {
      if (specVal) {
        submittedAnswers[`${fieldId}_other`] = specVal
      }
    })

    // Extract submitted files metadata
    const allUploadedFormFiles: UploadedFormFile[] = []
    for (const [fieldId, files] of Object.entries(uploadedFieldFiles)) {
      let category: 'project' | 'brand_asset' | 'reference' = 'project'
      if (fieldId === 'brand_assets' || fieldId.includes('brand')) category = 'brand_asset'
      else if (fieldId === 'reference_files' || fieldId.includes('reference'))
        category = 'reference'

      for (const file of files) {
        allUploadedFormFiles.push({
          fieldId,
          category,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          url: '',
        })
      }
    }

    // Build standard ProjectInformation structure for backwards compatibility
    const clientName =
      String(
        answers.client_name ||
          answers.clientName ||
          answers['field_client_name'] ||
          answers['Full Name'] ||
          Object.values(answers)[0] ||
          'Client'
      ).trim()

    const clientEmail =
      String(
        answers.client_email ||
          answers.clientEmail ||
          answers['field_client_email'] ||
          answers['Email Address'] ||
          'client@example.com'
      ).trim()

    const clientPhone = String(
      answers.client_phone || answers.clientPhone || answers['Phone Number'] || ''
    ).trim()

    const companyName = String(
      answers.company_name || answers.companyName || answers['Company / Business Name'] || ''
    ).trim()

    const projectTypes: ProjectType[] = Array.isArray(answers.project_type)
      ? answers.project_type
      : answers.project_type
      ? [answers.project_type]
      : []

    const otherProjectType = otherSpecs.project_type || answers.other_project_type || ''

    const description = String(
      answers.project_description ||
        answers.description ||
        answers['Full Project Description'] ||
        ''
    ).trim()

    const projectGoal = (answers.project_goal || '') as ProjectGoal | ''
    const otherProjectGoal = otherSpecs.project_goal || answers.other_project_goal || ''
    const targetAudience = String(answers.target_audience || '').trim()
    const deadline = answers.project_deadline || answers.deadline || ''
    const noSpecificDeadline = !!noDeadlineMap.project_deadline || !!noDeadlineMap.deadline
    const content = String(answers.project_content || answers.content || '').trim()
    const preferredColors = String(answers.preferred_colors || answers.preferredColors || '').trim()
    const preferredColorHex = colorHexMap.preferred_colors || '#000000'
    const noColorPreference = !!noColorMap.preferred_colors
    const projectUsage: ProjectUsage[] = Array.isArray(answers.project_usage)
      ? answers.project_usage
      : answers.project_usage
      ? [answers.project_usage]
      : []
    const otherProjectUsage = otherSpecs.project_usage || answers.other_project_usage || ''

    const amount = Number(answers.agreed_amount || answers.amount || 0)
    const currency =
      form.fields.find((f) => f.id === 'agreed_amount' || f.type === 'amount')?.currency ||
      'NGN (₦)'

    const projectFiles = allUploadedFormFiles.filter((f) => f.category === 'project')
    const brandAssets = allUploadedFormFiles.filter((f) => f.category === 'brand_asset')
    const referenceFiles = allUploadedFormFiles.filter((f) => f.category === 'reference')
    const additionalNotes = String(answers.additional_notes || '').trim()

    const projectInformation: ProjectInformation = {
      clientName,
      clientEmail,
      clientPhone,
      companyName,
      projectTypes,
      otherProjectType,
      description,
      projectGoal,
      otherProjectGoal,
      targetAudience,
      deadline,
      noSpecificDeadline,
      content,
      preferredColors,
      preferredColorHex,
      noColorPreference,
      projectUsage,
      otherProjectUsage,
      amount,
      currency,
      projectFiles,
      brandAssets,
      referenceFiles,
      referenceNotes: '',
      additionalNotes,
    }

    const submitResult = await formService.submitFormResponse({
      formId: form.id,
      submittedByName: clientName,
      submittedByEmail: clientEmail,
      answers: submittedAnswers,
      projectInformation,
      uploadedFiles: allUploadedFormFiles,
    }, uploadedFieldFiles)

    setSubmitting(false)

    if (submitResult.success) {
      setResponse(submitResult.data)
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Surface specific backend error messages (e.g. rate limit, validation)
      const errorMsg = submitResult.error?.message
      if (errorMsg) {
        setValidationError(errorMsg)
      } else {
        setValidationError('An error occurred while submitting your form. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 px-4">
        <div className="text-center space-y-4">
          <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Loading form…</p>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-muted-foreground/10 bg-card p-10 text-center shadow-lg space-y-5">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted/50">
            <X className="size-7 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">Form Link Not Found</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This information collection form link may be expired, archived, or invalid. Please
              reach out to your designer for an updated link.
            </p>
          </div>
          <Button onClick={() => navigate('/')} variant="outline" className="rounded-xl">
            Return to BRIEVO
          </Button>
        </div>
      </div>
    )
  }

  if (submitted && response) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-emerald-500/20 bg-card p-10 text-center shadow-lg space-y-6">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 ring-8 ring-emerald-500/5">
            <CheckCircle2 className="size-9 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Information Received!</h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Thank you, <span className="font-semibold text-foreground">{response.submittedByName}</span>.
              Your project details and files have been securely submitted to your designer.
            </p>
          </div>
          <div className="w-full rounded-xl border border-muted-foreground/10 bg-muted/20 p-5 text-left text-sm space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Submission Summary
            </p>
            <p className="font-semibold text-foreground">{form.title}</p>
            <p className="text-xs text-muted-foreground">
              Submitted email: {response.submittedByEmail}
            </p>
            {response.uploadedFiles.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Attached files: {response.uploadedFiles.length} item(s)
              </p>
            )}
          </div>
          <Button onClick={() => navigate('/')} className="rounded-xl px-8">
            Done
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-br from-muted/40 via-background to-muted/30 px-4 py-10 sm:py-16">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header Card */}
        <div className="space-y-6">
          {/* Theme Toggle */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setLightMode(!lightMode)}
              className="flex items-center gap-2 rounded-full border border-muted-foreground/15 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-all hover:bg-muted/50 hover:text-foreground"
              aria-label={lightMode ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {lightMode ? (
                <>
                  <Moon className="size-3.5" />
                  <span>Dark</span>
                </>
              ) : (
                <>
                  <Sun className="size-3.5" />
                  <span>Light</span>
                </>
              )}
            </button>
          </div>

          {(form.brandName ?? '').trim() && (
            <div className="text-center">
              <p className="inline-block text-sm font-bold uppercase tracking-[0.25em] text-primary">
                {form.brandName}
              </p>
            </div>
          )}
          <div className="text-center space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">
              Project Information Form
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {form.title}
            </h1>
            {form.description && (
              <p className="mx-auto max-w-xl text-sm sm:text-base text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {form.description}
              </p>
            )}
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-muted-foreground/10 bg-card shadow-lg shadow-primary/[0.03]">
          {/* Form Body */}
          <div className="divide-y divide-muted-foreground/10">
            {form.fields.map((field, index) => (
              <div
                key={field.id}
                className="px-6 py-7 sm:px-8 sm:py-8"
              >
                <div className="space-y-3">
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {index + 1}
                        </span>
                        <Label htmlFor={field.id} className="text-[15px] font-semibold leading-snug text-foreground">
                          {field.label}
                        </Label>
                        {field.required ? (
                          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                            Required
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground/60">
                            Optional
                          </span>
                        )}
                      </div>
                      {field.description && (
                        <p className="pl-[34px] text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
                          {field.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="pl-[34px]">
                    {renderFieldInput(field)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Validation Error Alert */}
          {validationError && (
            <div className="mx-6 sm:mx-8 mb-6 sm:mb-8">
              <div
                role="alert"
                className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm font-medium text-destructive animate-in fade-in-50"
              >
                {validationError}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="px-6 pb-8 sm:px-8 sm:pb-10">
            <div className="rounded-xl bg-muted/30 p-6 sm:p-8">
              <div className="space-y-2 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Review your information and submit when ready.
                </p>
                <Button
                  type="button"
                  className="w-full py-6 text-[15px] font-bold shadow-lg shadow-primary/20 gap-2 rounded-xl"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Submitting responses…
                    </>
                  ) : (
                    <>
                      <Send className="size-5" /> Submit Project Information
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground/50">
          Powered by BRIEVO
        </p>
      </div>
    </div>
  )
}
