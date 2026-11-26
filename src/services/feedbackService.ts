import type { Feedback, FeedbackInput, ServiceResult } from '@/types'
import { getCollection, upsertInCollection } from './mockStorage'
import { generateId } from '@/utils/helpers'
import { delay, ok } from './serviceHelpers'
import { addActivity, updateProjectStatus } from './projectService'

/**
 * Feedback service.
 *
 * MOCK implementation backed by local storage. Maps conceptually to future
 * endpoints: GET/POST /projects/:id/feedback.
 */

export async function getFeedback(
  projectId: string
): Promise<ServiceResult<Feedback[]>> {
  await delay(200)
  const feedback = getCollection('feedback').filter(
    (f) => f.projectId === projectId
  )
  return ok([...feedback].sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
}

/** Submit client feedback against a revision of the project. */
export async function submitFeedback(
  input: FeedbackInput
): Promise<ServiceResult<Feedback>> {
  await delay(300)
  const feedback: Feedback = {
    id: generateId('fb'),
    projectId: input.projectId,
    authorId: input.authorId,
    revisionNumber: input.revisionNumber,
    type: input.type,
    content: input.content,
    read: false,
    createdAt: new Date().toISOString(),
  }
  upsertInCollection('feedback', feedback)

  // Adding feedback moves the project to "awaiting feedback" from the client's side,
  // but if the client merely approves, we post the activity.
  await addActivity(
    input.projectId,
    'feedback_sent',
    'Feedback submitted',
    feedback.content,
    input.authorId
  )

  return ok(feedback)
}

/** Approve the current design (client confirms the deliverable). */
export async function approveDesign(
  projectId: string,
  actorId: string,
  note?: string
): Promise<ServiceResult<null>> {
  await delay(400)
  await updateProjectStatus(projectId, 'approved', actorId, note)
  await addActivity(projectId, 'approved', 'Design approved', note, actorId)
  return ok(null)
}

export async function updateFeedback(
  id: string,
  updates: Partial<Pick<Feedback, 'read'>>
): Promise<ServiceResult<Feedback>> {
  await delay(150)
  const feedbacks = getCollection('feedback')
  const found = feedbacks.find((f) => f.id === id)
  if (!found) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Feedback not found.' } }
  }
  const updated = { ...found, ...updates }
  upsertInCollection('feedback', updated)
  return ok(updated)
}
