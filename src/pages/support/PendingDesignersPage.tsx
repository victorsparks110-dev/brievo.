import { useEffect, useState } from 'react'
import { UserCheck, CheckCircle, Loader2 } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useToast } from '@/context/ToastContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import * as supportAdminService from '@/services/supportAdminService'

interface PendingDesigner {
  id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function PendingDesignersPage() {
  usePageMeta('Pending Designers')
  const [designers, setDesigners] = useState<PendingDesigner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchDesigners = async () => {
    setLoading(true)
    setError('')
    const result = await supportAdminService.listPendingDesigners()
    setLoading(false)
    if (result.success) {
      setDesigners(result.data)
    } else {
      setError(result.error.message)
    }
  }

  useEffect(() => {
    void fetchDesigners()
  }, [])

  const handleApprove = async (designer: PendingDesigner) => {
    setApprovingId(designer.id)
    const result = await supportAdminService.approveDesigner(designer.id)
    setApprovingId(null)

    if (result.success) {
      toast({
        title: 'Account Approved',
        description: `${designer.name}'s account has been approved.`,
        variant: 'success',
      })
      setDesigners((prev) => prev.filter((d) => d.id !== designer.id))
    } else {
      toast({
        title: 'Approval Failed',
        description: result.error.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Support
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Pending Designers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and approve new designer accounts awaiting verification.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading pending designers...</div>
      ) : designers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-muted-foreground">No pending designers awaiting approval.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {designers.map((designer) => (
            <Card key={designer.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{designer.name}</p>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {designer.email} — Registered {formatDate(designer.createdAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleApprove(designer)}
                  disabled={approvingId === designer.id}
                >
                  {approvingId === designer.id ? (
                    <Loader2 className="mr-1 size-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="mr-1 size-3.5" />
                  )}
                  Approve
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
