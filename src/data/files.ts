import type { ProjectFile } from '@/types'

/**
 * Mock file entries. URLs are placeholders (data URIs/symbols) for the demo.
 * A future backend will provide real storage URLs and handle upload/download.
 */
export const mockFiles: ProjectFile[] = [
  {
    id: 'file-1',
    projectId: 'project-1',
    uploadedBy: 'user-client-1',
    fileName: 'bright-bloom-brand-colors.png',
    fileType: 'image/png',
    fileSize: 1_240_000,
    category: 'reference',
    url: '/files/brand-colors.png',
    createdAt: '2026-08-25T09:30:00.000Z',
  },
  {
    id: 'file-2',
    projectId: 'project-1',
    uploadedBy: 'user-designer-1',
    fileName: 'logo-concept-v1.zip',
    fileType: 'application/zip',
    fileSize: 8_400_000,
    category: 'draft',
    url: '/files/logo-concept-v1.zip',
    createdAt: '2026-08-28T16:00:00.000Z',
  },
  {
    id: 'file-3',
    projectId: 'project-2',
    uploadedBy: 'user-client-2',
    fileName: 'nordica-current-branding.pdf',
    fileType: 'application/pdf',
    fileSize: 2_100_000,
    category: 'reference',
    url: '/files/nordica-branding.pdf',
    createdAt: '2026-08-26T14:30:00.000Z',
  },
  {
    id: 'file-4',
    projectId: 'project-3',
    uploadedBy: 'user-client-3',
    fileName: 'movement-logo-current.svg',
    fileType: 'image/svg+xml',
    fileSize: 320_000,
    category: 'reference',
    url: '/files/movement-logo.svg',
    createdAt: '2026-08-27T09:30:00.000Z',
  },
  {
    id: 'file-5',
    projectId: 'project-2',
    uploadedBy: 'user-designer-1',
    fileName: 'social-templates-rev1.pdf',
    fileType: 'application/pdf',
    fileSize: 5_600_000,
    category: 'draft',
    url: '/files/social-templates-rev1.pdf',
    createdAt: '2026-08-27T11:00:00.000Z',
  },
]
