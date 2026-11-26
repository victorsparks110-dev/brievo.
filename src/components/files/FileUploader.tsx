import { useRef, useState } from 'react'
import { CloudUpload, FileUp, X } from 'lucide-react'
import type { FileCategory, ProjectFile } from '@/types'
import { uploadFile } from '@/services/fileService'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { useToast } from '@/context/ToastContext'
import { formatFileSize } from '@/utils/helpers'

/**
 * File uploader UI. In demo mode it registers mock file metadata via the
 * file service, which later swaps to a real backend upload endpoint.
 */
export function FileUploader({
  projectId,
  category,
  onUploaded,
  label = 'Upload files',
  accept = '',
}: {
  projectId: string
  category: FileCategory
  onUploaded?: (file: ProjectFile) => void
  label?: string
  accept?: string
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const handleAdd = (list: FileList | null) => {
    if (!list) return
    setFiles((prev) => [...prev, ...Array.from(list)])
  }

  const handleSubmit = async () => {
    if (!user || files.length === 0) return
    setUploading(true)
    for (const file of files) {
      const result = await uploadFile({
        projectId,
        uploadedBy: user.id,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        category,
        url: '', // placeholder; backend provides the real URL later
      })
      if (result.success) {
        onUploaded?.(result.data)
      } else {
        toast({
          title: 'Upload failed',
          description: result.error.message,
          variant: 'destructive',
        })
      }
    }
    setFiles([])
    setUploading(false)
    toast({
      title: 'Files uploaded',
      description: 'Your files were attached to the project.',
      variant: 'success',
    })
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors hover:bg-muted/60"
      >
        <CloudUpload className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          Drag files here or click to browse
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => handleAdd(e.target.files)}
      />

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center gap-3 rounded-lg border px-3 py-2"
            >
              <FileUp className="size-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(f.size)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Remove file"
                onClick={() =>
                  setFiles((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          <Button onClick={handleSubmit} disabled={uploading} className="w-full">
            {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      )}
    </div>
  )
}
