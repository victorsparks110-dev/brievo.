import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePageMeta } from '@/hooks/usePageMeta'

export function NotFoundPage() {
  usePageMeta('Page not found')
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-md text-muted-foreground">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button asChild>
        <Link to="/">
          <Home className="size-4" /> Back home
        </Link>
      </Button>
    </div>
  )
}
