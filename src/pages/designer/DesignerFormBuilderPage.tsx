import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit2,
  Eye,
  FileText,
  GripVertical,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { formService } from '@/services'
import {
  getDefaultFormFields,
  type FormDefinition,
  type FormField,
  type FormFieldType,
  type FormResponse,
} from '@/types'

const CURRENCY_OPTIONS = [
  'NGN (₦)',
  'USD ($)',
  'GBP (£)',
  'EUR (€)',
  'CAD ($)',
  'AUD ($)',
  'ZAR (R)',
  'GHS (GH₵)',
  'KES (KSh)',
]

const FIELD_TYPES: Array<{ value: FormFieldType; label: string; description: string }> = [
  { value: 'short_text', label: 'Short Text', description: 'Single-line text input' },
  { value: 'long_text', label: 'Long Text', description: 'Multi-line paragraph text' },
  { value: 'email', label: 'Email Address', description: 'Email format validation' },
  { value: 'phone', label: 'Phone Number', description: 'Telephone format input' },
  { value: 'amount', label: 'Amount / Currency', description: 'Monetary price or budget' },
  { value: 'multiple_choice', label: 'Multiple Choice', description: 'Single select from options' },
  { value: 'checkbox', label: 'Checkbox / Multi-Select', description: 'Select multiple options' },
  { value: 'dropdown', label: 'Dropdown Select', description: 'Dropdown menu of choices' },
  { value: 'yes_no', label: 'Yes / No', description: 'Simple binary choice' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'number', label: 'Number', description: 'Numeric count or value' },
  { value: 'url', label: 'Website / URL', description: 'Web link format' },
  { value: 'file_upload', label: 'File Upload', description: 'Upload documents or archives' },
  { value: 'image_upload', label: 'Image Upload', description: 'Upload pictures or graphics' },
  { value: 'color', label: 'Color Preference', description: 'Color picker & palette notes' },
  { value: 'custom', label: 'Custom / Other', description: 'Custom styled question' },
]

const getFieldTypeBadgeLabel = (type: FormFieldType): string => {
  const match = FIELD_TYPES.find((entry) => entry.value === type)
  return match ? match.label : type
}

const createCustomField = (index: number, type: FormFieldType = 'short_text'): FormField => {
  const id = `field_custom_${Date.now()}_${index + 1}`
  const base: FormField = {
    id,
    type,
    label: `Custom Question ${index + 1}`,
    required: false,
    placeholder: 'Type your answer here',
    section: 'custom',
  }

  if (type === 'multiple_choice' || type === 'checkbox' || type === 'dropdown') {
    base.options = [
      { id: `${id}_opt_1`, label: 'Option 1', value: 'Option 1' },
      { id: `${id}_opt_2`, label: 'Option 2', value: 'Option 2' },
    ]
    base.allowOther = true
    base.otherPlaceholder = 'Please specify'
  } else if (type === 'amount') {
    base.currency = 'NGN (₦)'
    base.placeholder = '150000'
  } else if (type === 'file_upload' || type === 'image_upload') {
    base.allowMultiple = true
  }

  return base
}

export function DesignerFormBuilderPage() {
  usePageMeta('Form builder')
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [form, setForm] = useState<FormDefinition | null>(null)
  const [responses, setResponses] = useState<FormResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')
  const [expandedFieldIds, setExpandedFieldIds] = useState<Record<string, boolean>>({})
  const [selectedTypeToAdd, setSelectedTypeToAdd] = useState<FormFieldType>('short_text')
  const [sectionFilter, setSectionFilter] = useState<'all' | 'core' | 'custom'>('all')
  const [brandNameError, setBrandNameError] = useState('')

  useEffect(() => {
    if (!user || !id) return

    void Promise.all([
      formService.getFormById(id),
      formService.getFormResponses(id),
    ]).then(([formResult, responsesResult]) => {
      if (formResult.success) {
        const loadedForm = formResult.data
        // If loaded form had 0 or few fields, ensure default core fields exist
        if (!loadedForm.fields || loadedForm.fields.length === 0) {
          loadedForm.fields = getDefaultFormFields()
        }
        setForm(loadedForm)
      } else {
        navigate('/designer/forms')
      }
      if (responsesResult.success) {
        setResponses(responsesResult.data)
      }
      setLoading(false)
    })
  }, [id, navigate, user])

  const shareUrl = useMemo(() => {
    if (!form || !form.shareToken) return ''
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/form/${form.shareToken}`
  }, [form])

  const toggleExpand = (fieldId: string) => {
    setExpandedFieldIds((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }))
  }

  const expandAll = () => {
    if (!form) return
    const allExpanded: Record<string, boolean> = {}
    form.fields.forEach((field) => {
      allExpanded[field.id] = true
    })
    setExpandedFieldIds(allExpanded)
  }

  const collapseAll = () => {
    setExpandedFieldIds({})
  }

  const updateForm = (updates: Partial<FormDefinition>) => {
    if (updates.brandName !== undefined) {
      setBrandNameError('')
    }
    setForm((current) =>
      current ? { ...current, ...updates, updatedAt: new Date().toISOString() } : current
    )
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setForm((current) => {
      if (!current) return current
      return {
        ...current,
        fields: current.fields.map((field) =>
          field.id === fieldId ? { ...field, ...updates } : field
        ),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const changeFieldType = (fieldId: string, newType: FormFieldType) => {
    setForm((current) => {
      if (!current) return current
      return {
        ...current,
        fields: current.fields.map((field) => {
          if (field.id !== fieldId) return field
          const updated: FormField = { ...field, type: newType }
          if (
            (newType === 'multiple_choice' || newType === 'checkbox' || newType === 'dropdown') &&
            (!field.options || field.options.length === 0)
          ) {
            updated.options = [
              { id: `${field.id}_opt_1`, label: 'Option 1', value: 'Option 1' },
              { id: `${field.id}_opt_2`, label: 'Option 2', value: 'Option 2' },
            ]
            updated.allowOther = true
            updated.otherPlaceholder = 'Please specify'
          }
          if (newType === 'amount' && !field.currency) {
            updated.currency = 'NGN (₦)'
          }
          return updated
        }),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const addField = (type: FormFieldType = selectedTypeToAdd) => {
    setForm((current) => {
      if (!current) return current
      const newField = createCustomField(current.fields.length, type)
      // Automatically expand new field
      setExpandedFieldIds((prev) => ({ ...prev, [newField.id]: true }))
      return {
        ...current,
        fields: [...current.fields, newField],
        updatedAt: new Date().toISOString(),
      }
    })
    toast({
      title: 'Field added',
      description: `New ${getFieldTypeBadgeLabel(type)} question added to your form.`,
      variant: 'success',
    })
  }

  const removeField = (fieldId: string) => {
    setForm((current) => {
      if (!current) return current
      return {
        ...current,
        fields: current.fields.filter((field) => field.id !== fieldId),
        updatedAt: new Date().toISOString(),
      }
    })
    toast({
      title: 'Field deleted',
      description: 'The field was removed from the form.',
      variant: 'default',
    })
  }

  const moveField = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      if (!current) return current
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= current.fields.length) return current
      const next = [...current.fields]
      const [item] = next.splice(index, 1)
      next.splice(targetIndex, 0, item)
      return { ...current, fields: next, updatedAt: new Date().toISOString() }
    })
  }

  const addOption = (fieldId: string) => {
    setForm((current) => {
      if (!current) return current
      return {
        ...current,
        fields: current.fields.map((field) => {
          if (field.id !== fieldId) return field
          const currentOptions = field.options ?? []
          const nextIndex = currentOptions.length + 1
          const nextLabel = `Option ${nextIndex}`
          return {
            ...field,
            options: [
              ...currentOptions,
              {
                id: `${field.id}_opt_${Date.now()}_${nextIndex}`,
                label: nextLabel,
                value: nextLabel,
              },
            ],
          }
        }),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const updateOption = (fieldId: string, optionId: string, label: string) => {
    setForm((current) => {
      if (!current) return current
      return {
        ...current,
        fields: current.fields.map((field) => {
          if (field.id !== fieldId) return field
          return {
            ...field,
            options: (field.options ?? []).map((option) =>
              option.id === optionId ? { ...option, label, value: label } : option
            ),
          }
        }),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const removeOption = (fieldId: string, optionId: string) => {
    setForm((current) => {
      if (!current) return current
      return {
        ...current,
        fields: current.fields.map((field) => {
          if (field.id !== fieldId || !field.options) return field
          return {
            ...field,
            options: field.options.filter((option) => option.id !== optionId),
          }
        }),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const moveOption = (fieldId: string, optionIndex: number, direction: -1 | 1) => {
    setForm((current) => {
      if (!current) return current
      return {
        ...current,
        fields: current.fields.map((field) => {
          if (field.id !== fieldId || !field.options) return field
          const targetIndex = optionIndex + direction
          if (targetIndex < 0 || targetIndex >= field.options.length) return field
          const nextOptions = [...field.options]
          const [moved] = nextOptions.splice(optionIndex, 1)
          nextOptions.splice(targetIndex, 0, moved)
          return { ...field, options: nextOptions }
        }),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  const saveForm = async () => {
    if (!form || !user) return
    const result = await formService.updateForm(form.id, {
      title: form.title,
      description: form.description,
      brandName: form.brandName ?? '',
      status: form.status,
      fields: form.fields,
    })
    if (result.success) {
      setForm(result.data)
      toast({
        title: 'Draft saved',
        description: 'Your changes have been saved as a draft.',
        variant: 'success',
      })
    }
  }

  const publishForm = async () => {
    if (!form || !user) return
    const trimmedBrand = (form.brandName ?? '').trim()
    if (!trimmedBrand) {
      setBrandNameError('Please enter your brand name before publishing the form.')
      const el = document.getElementById('brandName')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const result = await formService.updateForm(form.id, {
      title: form.title,
      description: form.description,
      brandName: trimmedBrand,
      status: 'published',
      fields: form.fields,
    })
    if (result.success) {
      setForm(result.data)
      toast({
        title: 'Form published',
        description: 'This form is live and accessible to clients via the share link.',
        variant: 'success',
      })
    } else {
      toast({
        title: 'Publish failed',
        description: result.error?.message || 'Could not publish the form. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const copyLink = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    toast({
      title: 'Link copied',
      description: 'The client form link is ready to share.',
      variant: 'success',
    })
  }

  const filteredFields = useMemo(() => {
    if (!form) return []
    if (sectionFilter === 'core') {
      return form.fields
        .map((field, index) => ({ field, originalIndex: index }))
        .filter(({ field }) => field.section !== 'custom')
    }
    if (sectionFilter === 'custom') {
      return form.fields
        .map((field, index) => ({ field, originalIndex: index }))
        .filter(({ field }) => field.section === 'custom')
    }
    return form.fields.map((field, index) => ({ field, originalIndex: index }))
  }, [form, sectionFilter])

  if (loading || !form) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading form builder…
      </div>
    )
  }

  const coreFieldsCount = form.fields.filter((f) => f.section !== 'custom').length
  const customFieldsCount = form.fields.filter((f) => f.section === 'custom').length

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/designer/forms')}
            aria-label="Back to forms"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Form Builder
              </p>
              <Badge variant={form.status === 'published' ? 'default' : 'secondary'}>
                {form.status === 'published' ? 'Published' : 'Draft'}
              </Badge>
              {form.status === 'published' && JSON.stringify(form.fields) !== JSON.stringify(form.publishedFields) && (
                <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  Unpublished changes
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{form.title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={activeTab === 'editor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('editor')}
          >
            <Edit2 className="size-4" /> Builder
          </Button>
          <Button
            variant={activeTab === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('preview')}
          >
            <Eye className="size-4" /> Live Preview
          </Button>
          <Button variant="outline" size="sm" onClick={() => void saveForm()}>
            <Save className="size-4" /> Save Draft
          </Button>
          <Button
            size="sm"
            onClick={() => void publishForm()}
            className={form.status === 'published' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            {form.status === 'published' ? (
              <>
                <Check className="size-4" /> Republish
              </>
            ) : (
              <>
                <Eye className="size-4" /> Publish Form
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Share Link Banner — only when published */}
      {form.status === 'published' && (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Public Client Share Link
            </p>
            <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground sm:text-sm">
              {shareUrl}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void copyLink()}>
              <Copy className="size-4" /> Copy Link
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/form/${form.shareToken}`} target="_blank" rel="noreferrer">
                Open Form ↗
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Basic Form Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Form Details & Client Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Form Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
                placeholder="e.g. Creative Project Discovery Questionnaire"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="brandName">
                Brand Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="brandName"
                value={form.brandName ?? ''}
                onChange={(e) => updateForm({ brandName: e.target.value })}
                placeholder="Enter your brand name"
                maxLength={100}
              />
              {brandNameError && (
                <p className="text-xs font-medium text-destructive">{brandNameError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                This name will appear at the top of the client form.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Instructions / Intro Message for Client</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                rows={3}
                placeholder="Explain the purpose of this form and any guidelines for the client..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'editor' && (
        <div className="space-y-6">
          {/* Fields Toolbar & Filter */}
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Filter:</span>
              <Button
                variant={sectionFilter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSectionFilter('all')}
              >
                All Fields ({form.fields.length})
              </Button>
              <Button
                variant={sectionFilter === 'core' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSectionFilter('core')}
              >
                Core Information ({coreFieldsCount})
              </Button>
              <Button
                variant={sectionFilter === 'custom' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSectionFilter('custom')}
              >
                Custom Questions ({customFieldsCount})
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>

          {/* Unified Fields List */}
          <div className="space-y-4">
            {filteredFields.map(({ field, originalIndex }) => {
              const isExpanded = !!expandedFieldIds[field.id]
              const isCore = field.section !== 'custom'

              return (
                <Card
                  key={field.id}
                  className={`transition-all ${
                    isExpanded
                      ? 'border-primary/50 shadow-sm ring-1 ring-primary/20'
                      : 'hover:border-foreground/30'
                  }`}
                >
                  {/* Summary Bar */}
                  <CardHeader className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3 sm:items-center">
                        <GripVertical className="mt-1 size-4 shrink-0 text-muted-foreground/60 sm:mt-0" />
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Field {originalIndex + 1}
                            </span>
                            <Badge variant="outline" className="font-normal text-xs">
                              {getFieldTypeBadgeLabel(field.type)}
                            </Badge>
                            {field.required ? (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Required
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Optional
                              </Badge>
                            )}
                            {isCore ? (
                              <span className="text-[11px] font-medium text-muted-foreground">
                                • Core Project Field
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-primary">
                                • Custom Field
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-foreground text-base">
                            {field.label || <span className="italic text-muted-foreground">Untitled Field</span>}
                          </h3>
                          {field.description && !isExpanded && (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {field.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => moveField(originalIndex, -1)}
                          disabled={originalIndex === 0}
                          aria-label="Move field up"
                          title="Move Up"
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => moveField(originalIndex, 1)}
                          disabled={originalIndex === form.fields.length - 1}
                          aria-label="Move field down"
                          title="Move Down"
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          variant={isExpanded ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => toggleExpand(field.id)}
                          className="gap-1.5"
                        >
                          <Edit2 className="size-3.5" />
                          {isExpanded ? 'Done' : 'Edit'}
                          {isExpanded ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeField(field.id)}
                          aria-label="Delete field"
                          title="Delete Field"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Expanded Field Editor */}
                  {isExpanded && (
                    <CardContent className="border-t bg-muted/10 p-5 space-y-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Question Label */}
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`label-${field.id}`} className="font-semibold">
                            Question / Field Label <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id={`label-${field.id}`}
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            placeholder="e.g. Tell us about your project"
                          />
                        </div>

                        {/* Field Type */}
                        <div className="space-y-2">
                          <Label htmlFor={`type-${field.id}`} className="font-semibold">
                            Field Type
                          </Label>
                          <Select
                            value={field.type}
                            onValueChange={(val) =>
                              changeFieldType(field.id, val as FormFieldType)
                            }
                          >
                            <SelectTrigger id={`type-${field.id}`} className="w-full">
                              <SelectValue placeholder="Select field type" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {FIELD_TYPES.map((typeEntry) => (
                                <SelectItem key={typeEntry.value} value={typeEntry.value}>
                                  <div className="flex flex-col text-left">
                                    <span className="font-medium">{typeEntry.label}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {typeEntry.description}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Currency Selector (for Amount type) */}
                        {field.type === 'amount' && (
                          <div className="space-y-2">
                            <Label htmlFor={`currency-${field.id}`} className="font-semibold">
                              Currency
                            </Label>
                            <Select
                              value={field.currency ?? 'NGN (₦)'}
                              onValueChange={(val) => updateField(field.id, { currency: val })}
                            >
                              <SelectTrigger id={`currency-${field.id}`} className="w-full">
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              <SelectContent>
                                {CURRENCY_OPTIONS.map((cur) => (
                                  <SelectItem key={cur} value={cur}>
                                    {cur}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Placeholder (for text, long text, email, phone, number, url, amount, date) */}
                        {field.type !== 'file_upload' &&
                          field.type !== 'image_upload' &&
                          field.type !== 'yes_no' && (
                            <div
                              className={`space-y-2 ${
                                field.type !== 'amount' ? '' : 'md:col-span-2'
                              }`}
                            >
                              <Label
                                htmlFor={`placeholder-${field.id}`}
                                className="font-semibold"
                              >
                                Placeholder Text
                              </Label>
                              <Input
                                id={`placeholder-${field.id}`}
                                value={field.placeholder ?? ''}
                                onChange={(e) =>
                                  updateField(field.id, { placeholder: e.target.value })
                                }
                                placeholder="e.g. Type your answer here..."
                              />
                            </div>
                          )}

                        {/* Description / Help Text */}
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`desc-${field.id}`} className="font-semibold">
                            Help Text / Field Instructions (Optional)
                          </Label>
                          <Textarea
                            id={`desc-${field.id}`}
                            value={field.description ?? ''}
                            onChange={(e) =>
                              updateField(field.id, { description: e.target.value })
                            }
                            rows={2}
                            placeholder="Add secondary guidance or details to help the client respond accurately..."
                          />
                        </div>
                      </div>

                      {/* Required / Optional Toggle */}
                      <div className="flex items-center justify-between rounded-lg border bg-background p-3.5">
                        <div>
                          <p className="font-semibold text-sm">Required Field</p>
                          <p className="text-xs text-muted-foreground">
                            Require the client to complete this question before submitting.
                          </p>
                        </div>
                        <label className="flex cursor-pointer items-center gap-2">
                          <Checkbox
                            checked={field.required}
                            onCheckedChange={(checked) =>
                              updateField(field.id, { required: !!checked })
                            }
                          />
                          <span className="text-sm font-medium">
                            {field.required ? 'Required' : 'Optional'}
                          </span>
                        </label>
                      </div>

                      {/* Choice Fields Options Editor */}
                      {(field.type === 'multiple_choice' ||
                        field.type === 'checkbox' ||
                        field.type === 'dropdown') && (
                        <div className="space-y-3 rounded-lg border bg-background p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-sm">Answer Options</h4>
                              <p className="text-xs text-muted-foreground">
                                Add, edit, or reorder the choices displayed to the client.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addOption(field.id)}
                              className="gap-1"
                            >
                              <Plus className="size-3.5" /> Add Option
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {(field.options ?? []).map((option, optIdx) => (
                              <div
                                key={option.id}
                                className="flex items-center gap-2 rounded-md border bg-muted/20 p-2"
                              >
                                <span className="text-xs font-semibold text-muted-foreground w-6 text-center">
                                  {optIdx + 1}.
                                </span>
                                <Input
                                  value={option.label}
                                  onChange={(e) =>
                                    updateOption(field.id, option.id, e.target.value)
                                  }
                                  placeholder={`Option ${optIdx + 1}`}
                                  className="h-9 bg-background"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() => moveOption(field.id, optIdx, -1)}
                                  disabled={optIdx === 0}
                                  aria-label="Move option up"
                                >
                                  <ArrowUp className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() => moveOption(field.id, optIdx, 1)}
                                  disabled={optIdx === (field.options?.length ?? 0) - 1}
                                  aria-label="Move option down"
                                >
                                  <ArrowDown className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => removeOption(field.id, option.id)}
                                  aria-label="Remove option"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          {/* Allow "Other" Option Toggle */}
                          <div className="pt-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                              <Checkbox
                                checked={!!field.allowOther}
                                onCheckedChange={(checked) =>
                                  updateField(field.id, { allowOther: !!checked })
                                }
                              />
                              <span className="font-medium">
                                Include "Other" option with "Please specify" text field
                              </span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* File Upload Settings */}
                      {(field.type === 'file_upload' || field.type === 'image_upload') && (
                        <div className="space-y-3 rounded-lg border bg-background p-4">
                          <h4 className="font-semibold text-sm">File Upload Settings</h4>
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <Checkbox
                              checked={field.allowMultiple ?? true}
                              onCheckedChange={(checked) =>
                                updateField(field.id, { allowMultiple: !!checked })
                              }
                            />
                            <span>Allow client to upload multiple files</span>
                          </label>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Add Field Section */}
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="size-5 text-primary" /> Add a New Question / Field
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Choose a question type to add to your form. The new field will appear with the same
                editable capabilities as core fields.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                  value={selectedTypeToAdd}
                  onValueChange={(val) => setSelectedTypeToAdd(val as FormFieldType)}
                >
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Select field type to add" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {FIELD_TYPES.map((typeEntry) => (
                      <SelectItem key={typeEntry.value} value={typeEntry.value}>
                        {typeEntry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={() => addField(selectedTypeToAdd)} className="gap-2">
                  <Plus className="size-4" /> Add Question to Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Live Preview Tab */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <FileText className="size-5 text-primary" /> Form Preview (Live Synchronized)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    This preview renders directly from your active field configuration.
                  </p>
                </div>
                <Badge variant="outline">Client View</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Form Title & Description */}
              <div className="rounded-xl border bg-muted/10 p-6 space-y-2">
                {(form.brandName ?? '').trim() && (
                  <p className="text-sm font-bold uppercase tracking-wider text-primary">
                    {form.brandName}
                  </p>
                )}
                <h2 className="text-2xl font-bold">{form.title}</h2>
                {form.description && (
                  <p className="text-muted-foreground whitespace-pre-wrap">{form.description}</p>
                )}
              </div>

              {/* Dynamic Fields Rendering */}
              <div className="space-y-6">
                {form.fields.map((field, index) => (
                  <div key={field.id} className="space-y-2 rounded-xl border bg-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <span>{field.label}</span>
                        {field.required ? (
                          <span className="text-xs font-semibold text-destructive">
                            • Required
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">• Optional</span>
                        )}
                      </Label>
                      <span className="text-xs text-muted-foreground">Field {index + 1}</span>
                    </div>

                    {field.description && (
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    )}

                    {/* Preview Inputs based on type */}
                    <div className="pt-1">
                      {field.type === 'long_text' ? (
                        <Textarea
                          rows={4}
                          placeholder={field.placeholder || 'Your answer...'}
                          disabled
                        />
                      ) : field.type === 'checkbox' ? (
                        <div className="space-y-2">
                          <div className="grid gap-2 sm:grid-cols-2">
                            {(field.options ?? []).map((option) => (
                              <label
                                key={option.id}
                                className="flex items-center gap-2 rounded-lg border bg-background p-2.5 text-sm text-muted-foreground"
                              >
                                <Checkbox disabled />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                          {field.allowOther && (
                            <div className="pt-2">
                              <Input
                                placeholder={field.otherPlaceholder || 'Please specify other...'}
                                disabled
                              />
                            </div>
                          )}
                        </div>
                      ) : field.type === 'multiple_choice' || field.type === 'dropdown' ? (
                        <div className="space-y-2">
                          <Select disabled>
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={field.placeholder || 'Select an option...'}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {(field.options ?? []).map((option) => (
                                <SelectItem key={option.id} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {field.allowOther && (
                            <Input
                              placeholder={field.otherPlaceholder || 'Please specify other...'}
                              disabled
                            />
                          )}
                        </div>
                      ) : field.type === 'yes_no' ? (
                        <Select disabled>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose Yes or No" />
                          </SelectTrigger>
                        </Select>
                      ) : field.type === 'color' ? (
                        <div className="flex gap-2">
                          <Input
                            placeholder={field.placeholder || 'Color names or HEX codes'}
                            disabled
                          />
                          <Input
                            className="max-w-32"
                            type="color"
                            defaultValue="#000000"
                            disabled
                            aria-label="Color preview"
                          />
                        </div>
                      ) : field.type === 'amount' ? (
                        <div className="flex gap-2">
                          <div className="flex items-center rounded-md border bg-muted px-3 text-sm font-medium text-muted-foreground">
                            {field.currency || 'NGN (₦)'}
                          </div>
                          <Input
                            type="number"
                            placeholder={field.placeholder || '150000'}
                            disabled
                          />
                        </div>
                      ) : field.type === 'file_upload' || field.type === 'image_upload' ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                          <Upload className="mb-2 size-6 text-muted-foreground/60" />
                          <p className="font-medium">
                            {field.type === 'image_upload' ? 'Upload Images' : 'Upload Files'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {field.allowMultiple ? 'Multiple files supported' : 'Single file'}
                          </p>
                        </div>
                      ) : (
                        <Input
                          type={
                            field.type === 'number'
                              ? 'number'
                              : field.type === 'email'
                              ? 'email'
                              : field.type === 'date'
                              ? 'date'
                              : field.type === 'url'
                              ? 'url'
                              : 'text'
                          }
                          placeholder={field.placeholder || 'Type your answer...'}
                          disabled
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Responses Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Client Form Submissions</CardTitle>
            <Badge variant="outline">{responses.length} Submissions</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {responses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No submissions received yet for this form. Share the public link with your client to
              start collecting briefs.
            </p>
          ) : (
            responses.map((resp) => (
              <div
                key={resp.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
              >
                <div>
                  <p className="font-semibold text-sm">{resp.submittedByName}</p>
                  <p className="text-xs text-muted-foreground">{resp.submittedByEmail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      resp.status === 'confirmed'
                        ? 'default'
                        : resp.status === 'reviewed'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {resp.status}
                  </Badge>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/designer/forms/${form.id}/responses/${resp.id}`}>
                      View Submission
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
