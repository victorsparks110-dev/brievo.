import type {
  Brief,
  BriefInput,
  BriefResponse,
  ServiceResult,
} from '@/types'
import {
  getCollection,
  upsertInCollection,
  setCollection,
} from './mockStorage'
import { generateId, generateToken } from '@/utils/helpers'
import { delay, fail, notFound, ok } from './serviceHelpers'
import { createProject } from './projectService'

/**
 * Brief service.
 *
 * MOCK implementation backed by local storage. Maps conceptually to the
 * future backend endpoints: GET/POST/PATCH /briefs, POST /briefs/:id/submit,
 * GET /public/brief/:token.
 */

export async function createBrief(
  designerId: string,
  input: BriefInput
): Promise<ServiceResult<Brief>> {
  await delay()
  const now = new Date().toISOString()
  const brief: Brief = {
    id: generateId('brief'),
    designerId,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    companyName: input.companyName,
    title: input.title,
    description: input.description,
    selectedServices: input.selectedServices,
    deadline: input.deadline,
    priority: input.priority,
    designerInstructions: input.designerInstructions,
    status: 'sent',
    uniqueToken: generateToken(),
    createdAt: now,
    updatedAt: now,
  }
  upsertInCollection('briefs', brief)
  return ok(brief)
}

export async function getBriefs(
  designerId?: string
): Promise<ServiceResult<Brief[]>> {
  await delay(200)
  let briefs = getCollection('briefs')
  if (designerId) {
    briefs = briefs.filter((b) => b.designerId === designerId)
  }
  return ok([...briefs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
}

export async function getBrief(id: string): Promise<ServiceResult<Brief>> {
  await delay(150)
  const brief = getCollection('briefs').find((b) => b.id === id)
  if (!brief) return fail(notFound('Brief'))
  return ok(brief)
}

/** Fetch a brief by its public token (used by the unauthenticated client link). */
export async function getBriefByToken(
  token: string
): Promise<ServiceResult<Brief>> {
  await delay(200)
  const brief = getCollection('briefs').find((b) => b.uniqueToken === token)
  if (!brief) return fail(notFound('Brief'))
  return ok(brief)
}

export async function updateBrief(
  id: string,
  updates: Partial<BriefInput>
): Promise<ServiceResult<Brief>> {
  await delay()
  const briefs = getCollection('briefs')
  const brief = briefs.find((b) => b.id === id)
  if (!brief) return fail(notFound('Brief'))
  const updated: Brief = {
    ...brief,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  upsertInCollection('briefs', updated)
  return ok(updated)
}

/** Generate (or return) the public link for a brief. */
export async function generateBriefLink(
  id: string
): Promise<ServiceResult<{ token: string; url: string }>> {
  await delay(150)
  const briefs = getCollection('briefs')
  const brief = briefs.find((b) => b.id === id)
  if (!brief) return fail(notFound('Brief'))
  return ok({
    token: brief.uniqueToken,
    url: `/brief/${brief.uniqueToken}`,
  })
}

/**
 * Submit a client's brief response. Advances the brief to 'submitted' and
 * creates a project in the 'new_brief' state so the designer can review it.
 */
export async function submitBrief(
  briefId: string,
  response: Omit<BriefResponse, 'id' | 'briefId' | 'submittedAt'>
): Promise<ServiceResult<BriefResponse>> {
  await delay(500)
  const briefs = getCollection('briefs')
  const brief = briefs.find((b) => b.id === briefId)
  if (!brief) return fail(notFound('Brief'))

  const submitted: BriefResponse = {
    id: generateId('response'),
    briefId,
    ...response,
    submittedAt: new Date().toISOString(),
  }
  upsertInCollection('briefResponses', submitted)

  // Update brief status and mark it submitted.
  const updatedBrief: Brief = {
    ...brief,
    status: 'submitted',
    updatedAt: new Date().toISOString(),
  }
  upsertInCollection('briefs', updatedBrief)

  // Create a project for the designer to review (if one doesn't exist yet).
  const existingProject = getCollection('projects').find(
    (p) => p.briefId === briefId
  )
  if (!existingProject && brief.clientId) {
    await createProject({
      briefId,
      designerId: brief.designerId,
      clientId: brief.clientId,
      title: brief.title,
      deadline: brief.deadline,
    })
  }

  return ok(submitted)
}

export async function getBriefResponse(
  briefId: string
): Promise<ServiceResult<BriefResponse | null>> {
  await delay(150)
  const response = getCollection('briefResponses').find(
    (r) => r.briefId === briefId
  )
  return ok(response ?? null)
}

/** List responses, optionally filtered by brief. */
export async function getBriefResponses(
  briefId?: string
): Promise<ServiceResult<BriefResponse[]>> {
  await delay(150)
  let responses = getCollection('briefResponses')
  if (briefId) {
    responses = responses.filter((r) => r.briefId === briefId)
  }
  return ok(responses)
}

/** Delete a brief (dev tooling) — resets its storage entry. */
export async function deleteBrief(id: string): Promise<ServiceResult<null>> {
  await delay(150)
  const briefs = getCollection('briefs')
  setCollection(
    'briefs',
    briefs.filter((b) => b.id !== id)
  )
  return ok(null)
}
