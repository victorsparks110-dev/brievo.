import type { ProjectFile, ServiceResult, UploadFileInput } from '@/types'
import { getCollection, removeFromCollection, upsertInCollection } from './mockStorage'
import { generateId } from '@/utils/helpers'
import { delay, fail, notFound, ok } from './serviceHelpers'

/**
 * File service.
 *
 * MOCK implementation backed by local storage. The UI only sees metadata and
 * a URL. Maps conceptually to future endpoints:
 * GET/POST /projects/:id/files, DELETE /files/:id. Real upload/storage is
 * delegated to a backend later; this just returns placeholder URLs.
 */

export async function getFiles(
  projectId: string
): Promise<ServiceResult<ProjectFile[]>> {
  await delay(200)
  const files = getCollection('files').filter((f) => f.projectId === projectId)
  return ok([...files].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

export async function uploadFile(
  input: UploadFileInput
): Promise<ServiceResult<ProjectFile>> {
  await delay(500)
  const file: ProjectFile = {
    id: generateId('file'),
    projectId: input.projectId,
    uploadedBy: input.uploadedBy,
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
    category: input.category,
    // Placeholder URL for the demo; replaced by real storage later.
    url: input.url || `/files/${input.fileName}`,
    createdAt: new Date().toISOString(),
  }
  upsertInCollection('files', file)
  return ok(file)
}

export async function deleteFile(
  id: string
): Promise<ServiceResult<null>> {
  await delay(150)
  const files = getCollection('files')
  const exists = files.some((f) => f.id === id)
  if (!exists) return fail(notFound('File'))
  removeFromCollection('files', id)
  return ok(null)
}
