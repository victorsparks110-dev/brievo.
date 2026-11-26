import type {
  CreateFormInput,
  FormDefinition,
  FormResponse,
  SubmitFormResponseInput,
  ServiceResult,
  WorkStatus,
} from '@/types'
import { apiRequest } from './apiClient'
import { fail, notFound, ok } from './serviceHelpers'

function normalizeResponse(raw: Record<string, unknown>): FormResponse {
  const pi = (raw.projectInformation ?? {}) as Record<string, unknown>
  const defaults = {
    clientName: String(raw.submittedByName ?? ''),
    clientEmail: String(raw.submittedByEmail ?? ''),
    clientPhone: '',
    companyName: '',
    projectTypes: [] as string[],
    otherProjectType: '',
    description: '',
    projectGoal: '',
    otherProjectGoal: '',
    targetAudience: '',
    deadline: '',
    noSpecificDeadline: false,
    content: '',
    preferredColors: '',
    preferredColorHex: '',
    noColorPreference: false,
    projectUsage: [] as string[],
    otherProjectUsage: '',
    amount: 0,
    currency: 'NGN',
    projectFiles: [],
    brandAssets: [],
    referenceFiles: [],
    referenceNotes: '',
    additionalNotes: '',
  }

  return {
    id: (raw.id as string) ?? '',
    formId: (raw.formId as string) ?? '',
    submittedByName: (raw.submittedByName as string) ?? '',
    submittedByEmail: (raw.submittedByEmail as string) ?? '',
    answers: (raw.answers as Record<string, string | string[] | boolean | number | null>) ?? {},
    projectInformation: { ...defaults, ...pi } as import('@/types').ProjectInformation,
    uploadedFiles: (raw.uploadedFiles as Array<Record<string, unknown>> | undefined)?.map(f => ({
      fieldId: String(f.fieldId ?? ''),
      category: String(f.category ?? '') as 'project' | 'brand_asset' | 'reference',
      fileName: String(f.fileName ?? ''),
      fileType: String(f.fileType ?? ''),
      url: String(f.url ?? ''),
      dataUrl: f.dataUrl ? String(f.dataUrl) : undefined,
      gridFsFileId: f.gridFsFileId ? String(f.gridFsFileId) : null,
      mimeType: f.mimeType ? String(f.mimeType) : undefined,
      size: f.size ? Number(f.size) : undefined,
    })) ?? [],
    status: (raw.status as FormResponse['status']) ?? 'new',
    workStatus:
      raw.workStatus === 'new' || raw.workStatus === 'in_progress' || raw.workStatus === 'completed'
        ? (raw.workStatus as WorkStatus)
        : 'new',
    submittedAt: (raw.submittedAt as string) ?? (raw.createdAt as string) ?? new Date().toISOString(),
    reviewedAt: (raw.reviewedAt as string | null) ?? null,
    confirmationSentAt: (raw.confirmationSentAt as string | null) ?? null,
    confirmationSubject: (raw.confirmationSubject as string) ?? undefined,
    confirmationBody: (raw.confirmationBody as string) ?? undefined,
    completedAt: (raw.completedAt as string | null) ?? null,
  }
}

function mapForm(raw: Record<string, unknown>): FormDefinition {
  return {
    id: (raw.id as string) ?? '',
    designerId: (raw.designerId as string) ?? '',
    title: (raw.title as string) ?? '',
    description: (raw.description as string) ?? '',
    brandName: (raw.brandName as string) ?? '',
    status: (raw.status as FormDefinition['status']) ?? 'draft',
    createdAt: (raw.createdAt as string) ?? '',
    updatedAt: (raw.updatedAt as string) ?? '',
    shareToken: (raw.shareToken as string) ?? '',
    fields: (raw.fields as FormDefinition['fields']) ?? [],
    publishedTitle: (raw.publishedTitle as string) ?? '',
    publishedDescription: (raw.publishedDescription as string) ?? '',
    publishedBrandName: (raw.publishedBrandName as string) ?? '',
    publishedFields: (raw.publishedFields as FormDefinition['fields']) ?? [],
  }
}

export async function createForm(
  input: CreateFormInput
): Promise<ServiceResult<FormDefinition>> {
  const res = await apiRequest<{ success: boolean; form: Record<string, unknown> }>('/api/forms', {
    method: 'POST',
    auth: true,
    body: {
      title: input.title,
      description: input.description,
      brandName: input.brandName,
      status: input.status,
      fields: input.fields,
    },
  })
  if (!res.success) return fail(res.error!)
  return ok(mapForm(res.data!.form))
}

export async function getDesignerForms(
  _designerId: string
): Promise<ServiceResult<FormDefinition[]>> {
  const res = await apiRequest<{ success: boolean; forms: Record<string, unknown>[] }>(
    '/api/forms/designer',
    { auth: true }
  )
  if (!res.success) return fail(res.error!)
  return ok(res.data!.forms.map(mapForm))
}

export async function getFormById(
  id: string
): Promise<ServiceResult<FormDefinition>> {
  const res = await apiRequest<{ success: boolean; form: Record<string, unknown> }>(
    `/api/forms/${id}`,
    { auth: true }
  )
  if (!res.success) {
    if (res.error?.code === 'NOT_FOUND') return fail(notFound('Form'))
    return fail(res.error!)
  }
  return ok(mapForm(res.data!.form))
}

export async function getFormByShareToken(
  shareToken: string
): Promise<ServiceResult<FormDefinition>> {
  const res = await apiRequest<{ success: boolean; form: Record<string, unknown> }>(
    `/api/forms/public/${shareToken}`
  )
  if (!res.success) {
    if (res.error?.code === 'NOT_FOUND') return fail(notFound('Form'))
    return fail(res.error!)
  }
  return ok(mapForm(res.data!.form))
}

export async function updateForm(
  id: string,
  updates: Partial<Pick<FormDefinition, 'title' | 'description' | 'brandName' | 'status' | 'fields'>>
): Promise<ServiceResult<FormDefinition>> {
  const res = await apiRequest<{ success: boolean; form: Record<string, unknown> }>(
    `/api/forms/${id}`,
    { method: 'PATCH', auth: true, body: updates }
  )
  if (!res.success) {
    if (res.error?.code === 'NOT_FOUND') return fail(notFound('Form'))
    return fail(res.error!)
  }
  return ok(mapForm(res.data!.form))
}

export async function deleteForm(
  id: string
): Promise<ServiceResult<null>> {
  const res = await apiRequest<{ success: boolean }>(`/api/forms/${id}`, {
    method: 'DELETE',
    auth: true,
  })
  if (!res.success) {
    if (res.error?.code === 'NOT_FOUND') return fail(notFound('Form'))
    return fail(res.error!)
  }
  return ok(null)
}

export async function submitFormResponse(
  input: SubmitFormResponseInput,
  files?: Record<string, File[]>
): Promise<ServiceResult<FormResponse>> {
  const hasFiles = files && Object.values(files).some(fArr => fArr.length > 0)

  if (hasFiles) {
    // Build FormData for multipart submission
    const fd = new FormData()
    fd.append('formId', input.formId)
    fd.append('submittedByName', input.submittedByName)
    fd.append('submittedByEmail', input.submittedByEmail)
    fd.append('answers', JSON.stringify(input.answers))
    fd.append('projectInformation', JSON.stringify(input.projectInformation))

    // Collect file metadata and actual files
    const allFileMetadata: Array<{ fieldId: string; category: string; fileName: string; fileType: string }> = []
    const allFiles: File[] = []

    for (const [fieldId, fileArr] of Object.entries(files!)) {
      let category: 'project' | 'brand_asset' | 'reference' = 'project'
      if (fieldId === 'brand_assets' || fieldId.includes('brand')) category = 'brand_asset'
      else if (fieldId === 'reference_files' || fieldId.includes('reference')) category = 'reference'

      for (const file of fileArr) {
        allFileMetadata.push({ fieldId, category, fileName: file.name, fileType: file.type || 'application/octet-stream' })
        allFiles.push(file)
      }
    }

    fd.append('fileMetadata', JSON.stringify(allFileMetadata))
    allFiles.forEach(file => fd.append('files', file))

    // Also send legacy metadata for backward compatibility
    fd.append('uploadedFiles', JSON.stringify(
      allFileMetadata.map(m => ({
        ...m,
        url: '',
        gridFsFileId: null,
        mimeType: m.fileType,
        size: 0,
      }))
    ))

    const res = await apiRequest<{ success: boolean; response: Record<string, unknown> }>(
      '/api/forms/responses',
      { method: 'POST', body: fd, isFormData: true }
    )
    if (!res.success) return fail(res.error!)
    return ok(normalizeResponse(res.data!.response))
  }

  // No files — use JSON body (backward compatible)
  const res = await apiRequest<{ success: boolean; response: Record<string, unknown> }>(
    '/api/forms/responses',
    {
      method: 'POST',
      body: {
        formId: input.formId,
        submittedByName: input.submittedByName,
        submittedByEmail: input.submittedByEmail,
        answers: input.answers,
        projectInformation: input.projectInformation,
        uploadedFiles: input.uploadedFiles ?? [
          ...input.projectInformation.projectFiles,
          ...input.projectInformation.brandAssets,
          ...input.projectInformation.referenceFiles,
        ],
      },
    }
  )
  if (!res.success) return fail(res.error!)
  return ok(normalizeResponse(res.data!.response))
}

export async function getFormResponses(
  formId: string
): Promise<ServiceResult<FormResponse[]>> {
  const res = await apiRequest<{ success: boolean; responses: Record<string, unknown>[] }>(
    `/api/forms/${formId}/responses`,
    { auth: true }
  )
  if (!res.success) return fail(res.error!)
  return ok(res.data!.responses.map(normalizeResponse))
}

export async function getResponseById(
  responseId: string
): Promise<ServiceResult<FormResponse>> {
  const res = await apiRequest<{ success: boolean; response: Record<string, unknown> }>(
    `/api/forms/responses/${responseId}`,
    { auth: true }
  )
  if (!res.success) {
    if (res.error?.code === 'NOT_FOUND') return fail(notFound('Form response'))
    return fail(res.error!)
  }
  return ok(normalizeResponse(res.data!.response))
}

export async function markResponseReviewed(
  responseId: string
): Promise<ServiceResult<FormResponse>> {
  const res = await apiRequest<{ success: boolean; response: Record<string, unknown> }>(
    `/api/forms/responses/${responseId}`,
    { method: 'PATCH', auth: true, body: { status: 'reviewed' } }
  )
  if (!res.success) return fail(res.error!)
  return ok(normalizeResponse(res.data!.response))
}

export async function getDesignerResponses(
  _designerId: string
): Promise<ServiceResult<Array<FormResponse & { formTitle: string; formShareToken?: string }>>> {
  const res = await apiRequest<{
    success: boolean
    responses: Array<Record<string, unknown> & { form?: Record<string, unknown> | null }>
  }>('/api/forms/designer/responses', { auth: true })
  if (!res.success) return fail(res.error!)

  const mapped = res.data!.responses.map((r) => {
    const resp = normalizeResponse(r)
    const form = r.form as Record<string, unknown> | null | undefined
    return {
      ...resp,
      formTitle: (form?.title as string) ?? 'Intake Form',
      formShareToken: (form?.shareToken as string) ?? undefined,
    }
  })
  return ok(mapped)
}

export async function sendConfirmationEmail(
  responseId: string,
  subject: string,
  body: string
): Promise<ServiceResult<FormResponse>> {
  const res = await apiRequest<{ success: boolean; response: Record<string, unknown> }>(
    `/api/forms/responses/${responseId}/confirm`,
    { method: 'POST', auth: true, body: { subject, message: body } }
  )
  if (!res.success) return fail(res.error!)

  return ok(normalizeResponse(res.data!.response))
}

export async function updateWorkStatus(
  responseId: string,
  workStatus: WorkStatus
): Promise<ServiceResult<FormResponse>> {
  const res = await apiRequest<{ success: boolean; response: Record<string, unknown> }>(
    `/api/forms/responses/${responseId}`,
    { method: 'PATCH', auth: true, body: { workStatus } }
  )
  if (!res.success) return fail(res.error!)
  return ok(normalizeResponse(res.data!.response))
}
