import {
  File as FileIcon,
  FileArchive,
  FileImage,
  FileText,
  Trash2,
} from 'lucide-react'
import type { ProjectFile } from '@/types'
import { deleteFile } from '@/services/fileService'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/state-display'
import { useToast } from '@/context/ToastContext'
import { authService } from '@/services'
import { formatDate, formatFileSize } from '@/utils/helpers'

function fileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return FileImage
  if (fileType === 'application/pdf') return FileText
  if (fileType.includes('zip') || fileType.includes('compressed')) {
    return FileArchive
  }
  return FileIcon
}

const CATEGORY_LABELS: Record<ProjectFile['category'], string> = {
  reference: 'Reference',
  draft: 'Draft',
  final: 'Final',
  attachment: 'Attachment',
}

/**
 * Renders a project's file list with a mock preview for images and a
 * download link for documents. In demo mode, file URLs are placeholders.
 */
export function FileList({
  files,
  onDeleted,
}: {
  files: ProjectFile[]
  onDeleted?: () => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()

  const handleDelete = async (id: string) => {
    const result = await deleteFile(id)
    if (result.success) {
      toast({ title: 'File deleted', variant: 'success' })
      onDeleted?.()
    } else {
      toast({ title: 'Delete failed', description: result.error.message, variant: 'destructive' })
    }
  }

  if (files.length === 0) {
    return <EmptyState title="No files yet" description="Uploaded files will appear here." />
  }

  return (
    <div className="space-y-2">
      {files.map((file) => {
        const Icon = fileIcon(file.fileType)
        const canDelete = user && file.uploadedBy === user.id
        const uploaderName =
          authService.getUserById(file.uploadedBy)?.name ?? 'BRIEVO User'
        return (
          <div
            key={file.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border p-3 sm:flex-nowrap"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
              {file.fileType.startsWith('image/') ? (
                <div className="flex size-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/40">
                  <FileImage className="size-5 text-primary" />
                </div>
              ) : (
                <Icon className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.fileName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {formatFileSize(file.fileSize)} · {uploaderName} ·{' '}
                {formatDate(file.createdAt)}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {CATEGORY_LABELS[file.category]}
            </Badge>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="outline" size="sm" asChild>
                <a href={file.url} download={file.fileName}>
                  View
                </a>
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete file"
                  onClick={() => void handleDelete(file.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
