import type {
  CreateProjectInput,
  Project,
  ProjectActivity,
  ProjectStatus,
  ServiceResult,
} from '@/types'
import { getCollection, upsertInCollection } from './mockStorage'
import { generateId } from '@/utils/helpers'
import { delay, fail, notFound, ok } from './serviceHelpers'

/**
 * Project service.
 *
 * MOCK implementation backed by local storage. Maps conceptually to the
 * future backend endpoints: GET/POST /projects, GET/PATCH /projects/:id.
 */

export async function createProject(
  input: CreateProjectInput
): Promise<ServiceResult<Project>> {
  await delay()
  const now = new Date().toISOString()
  const project: Project = {
    id: generateId('project'),
    briefId: input.briefId,
    designerId: input.designerId,
    clientId: input.clientId,
    title: input.title,
    status: 'new_brief',
    deadline: input.deadline,
    createdAt: now,
    updatedAt: now,
    currentRevision: 0,
  }
  upsertInCollection('projects', project)
  await addActivity(
    project.id,
    'brief_submitted',
    'Project created',
    'A new brief was submitted and awaits review.',
    input.clientId
  )
  return ok(project)
}

export async function getProjects(
  designerId?: string,
  clientId?: string
): Promise<ServiceResult<Project[]>> {
  await delay(200)
  let projects = getCollection('projects')
  if (designerId) {
    projects = projects.filter((p) => p.designerId === designerId)
  }
  if (clientId) {
    projects = projects.filter((p) => p.clientId === clientId)
  }
  return ok([...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
}

export async function getProjectById(
  id: string
): Promise<ServiceResult<Project>> {
  await delay(150)
  const project = getCollection('projects').find((p) => p.id === id)
  if (!project) return fail(notFound('Project'))
  return ok(project)
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<Project, 'title' | 'deadline'>>
): Promise<ServiceResult<Project>> {
  await delay()
  const projects = getCollection('projects')
  const project = projects.find((p) => p.id === id)
  if (!project) return fail(notFound('Project'))
  const updated: Project = {
    ...project,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  upsertInCollection('projects', updated)
  return ok(updated)
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus,
  actorId?: string,
  note?: string
): Promise<ServiceResult<Project>> {
  await delay(250)
  const projects = getCollection('projects')
  const project = projects.find((p) => p.id === id)
  if (!project) return fail(notFound('Project'))
  const updated: Project = {
    ...project,
    status,
    updatedAt: new Date().toISOString(),
  }
  upsertInCollection('projects', updated)

  await addActivity(
    project.id,
    'status_changed',
    `Status changed to ${status.replace(/_/g, ' ')}`,
    note,
    actorId
  )
  return ok(updated)
}

/** Designer submits a new design draft, bumping the revision counter. */
export async function submitDesignSubmission(
  projectId: string,
  actorId: string,
  note?: string
): Promise<ServiceResult<Project>> {
  await delay(400)
  const projects = getCollection('projects')
  const project = projects.find((p) => p.id === projectId)
  if (!project) return fail(notFound('Project'))
  const revision = project.currentRevision + 1
  const updated: Project = {
    ...project,
    currentRevision: revision,
    status: 'awaiting_feedback',
    updatedAt: new Date().toISOString(),
  }
  upsertInCollection('projects', updated)

  await addActivity(
    project.id,
    'design_submitted',
    `Design submission v${revision}`,
    note,
    actorId
  )
  return ok(updated)
}

export async function getProjectActivities(
  projectId: string
): Promise<ServiceResult<ProjectActivity[]>> {
  await delay(150)
  const activities = getCollection('activities').filter(
    (a) => a.projectId === projectId
  )
  return ok([...activities].sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
}

/** Internal helper to append an activity entry (also used by other services). */
export async function addActivity(
  projectId: string,
  type: ProjectActivity['type'],
  title: string,
  detail?: string,
  actorId?: string
): Promise<void> {
  const entry: ProjectActivity = {
    id: generateId('act'),
    projectId,
    type,
    title,
    detail,
    actorId,
    createdAt: new Date().toISOString(),
  }
  upsertInCollection('activities', entry)
}
