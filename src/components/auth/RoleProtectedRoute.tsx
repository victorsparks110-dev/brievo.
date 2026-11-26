import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PageLoader } from '@/components/ui/page-loader'

/**
 * Role-protected route.
 *
 * Requires the authenticated user to have one of the specified roles.
 * Redirects to /login if not authenticated, or shows Access Denied if
 * authenticated but without the required role.
 */
export function RoleProtectedRoute({ allowedRoles }: { allowedRoles: string[] }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <PageLoader label="Loading..." />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!allowedRoles.includes(user.role)) {
    const dashboardPath = user.role === 'support' ? '/support' : '/designer'
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Access Denied</h1>
        <p className="max-w-md text-muted-foreground">
          You do not have permission to access this page.
        </p>
        <Link
          to={dashboardPath}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go to Dashboard
        </Link>
      </div>
    )
  }

  return <Outlet />
}
