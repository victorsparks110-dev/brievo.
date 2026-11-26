import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePageMeta } from '@/hooks/usePageMeta'

export function BriefSuccessPage() {
  usePageMeta('Brief submitted')
  const { token } = useParams()

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-10">
      <Card className="w-full max-w-xl text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-7" />
          </div>
          <CardTitle className="text-2xl">Brief submitted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">
            Thanks for sharing your project details. Your designer has received the brief and will review it shortly.
          </p>
          <div className="rounded-xl border bg-muted/20 p-4 text-left">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">What happens next</p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>• Your designer will review the brief and confirm the next steps.</li>
              <li>• You will receive updates as concepts and revisions are shared.</li>
              <li>• The project will move through review, approval, and completion.</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/">Back to BRIEVO</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={token ? `/brief/${token}/form` : '/'}>
                Review again <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
