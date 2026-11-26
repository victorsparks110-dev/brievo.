/**
 * Central file model for BRIEVO.
 *
 * The frontend only stores/reads file metadata and a URL. In the
 * frontend-only phase, URLs are mock placeholders; later they point to real
 * storage provided by the backend.
 */

export type FileCategory = 'reference' | 'draft' | 'final' | 'attachment'

export interface ProjectFile {
  id: string
  projectId: string
  uploadedBy: string
  fileName: string
  fileType: string
  fileSize: number
  category: FileCategory
  /** Mock placeholder URL now; real storage URL later. */
  url: string
  createdAt: string
}

/** Used to register a newly uploaded file. */
export interface UploadFileInput {
  projectId: string
  uploadedBy: string
  fileName: string
  fileType: string
  fileSize: number
  category: FileCategory
  url: string
}
