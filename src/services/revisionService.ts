import type { Revision, RevisionInput, RevisionStatus, ServiceResult } from '@/types'
import { getCollection, upsertInCollection } from './mockStorage'
import { generateId } from '@/utils/helpers'
import { delay, fail, notFound, ok } from './serviceHelpers'
import { addActivity, updateProjectStatus } from './projectService'

/**
 * Revision service.
 *
 * MOCK implementation backed by local storage. Maps conceptually to future
 * endpoints: GET/POST /projects/:id/revisions, PATCH /revisions/:id.
 */

export async function getRevisions(
  projectId: string
): Promise<ServiceResult<Revision[]>> {
  await delay(200)
  const revisions = getCollection('revisions').filter(
    (r) => r.projectId === projectId
  )
  return ok([...revisions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
}

/** Client requests a revision, moving the project into "revision_requested". */
export async function createRevisionRequest(
  input: RevisionInput
): Promise<ServiceResult<Revision>> {
  await delay(400)
  const now = new Date().toISOString()
  const revision: Revision = {
    id: generateId('rev'),
    projectId: input.projectId,
    revisionNumber: input.revisionNumber,
    requestedById: input.requestedById,
    notes: input.notes,
    status: 'requested',
    createdAt: now,
    updatedAt: now,
  }
  upsertInCollection('revisions', revision)

  await updateProjectStatus(
    input.projectId,
    'revision_requested',
    input.requestedById,
    'Revision requested by client'
  )
  await addActivity(
    input.projectId,
    'revision_requested',
    `Revision requested (v${input.revisionNumber})`,
    input.notes,
    input.requestedById
  )
  return ok(revision)
}

export async function updateRevisionStatus(
  id: string,
  status: RevisionStatus
): Promise<ServiceResult<Revision>> {
  await delay(250)
  const revisions = getCollection('revisions')
  const found = revisions.find((r) => r.id === id)
  if (!found) return fail(notFound('Revision'))
  const updated: Revision = {
    ...found,
    status,
    updatedAt: new Date().toISOString(),
  }
  upsertInCollection('revisions', updated)
  return ok(updated)
}
