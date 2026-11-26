import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  FileText,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { initials } from '@/utils/helpers'
import { NotificationPopover } from '@/components/notifications/NotificationPopover'
import { AppFooter } from '@/components/layouts/AppFooter'

export interface NavItem {
  label: string
  to: string
  end?: boolean
  icon: LucideIcon
}

/** Shared app shell: responsive sidebar + sticky header + content Outlet. */
export function DashboardLayout({
  navItems,
}: {
  navItems: NavItem[]
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const home = user?.role === 'support' ? '/support' : '/designer'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const brand = (
    <div className="flex h-16 items-center gap-2.5 border-b px-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        B
      </span>
      <span className="text-lg font-semibold tracking-tight">BRIEVO</span>
    </div>
  )

  const nav = (
    <nav className="flex-1 space-y-1 p-3">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon className="size-4.5" />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )

  const footer = (
    <div className="border-t p-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback>{initials(user?.name ?? '?')}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user?.name ?? 'User'}</p>
          <p className="truncate text-xs text-muted-foreground capitalize">
            {user?.role === 'support' ? 'Support' : 'Designer'}
          </p>
        </div>
      </div>
    </div>
  )

  const sidebarBody = (
    <div className="flex h-full flex-col">
      {brand}
      {nav}
      {footer}
    </div>
  )

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-card lg:block">
        {sidebarBody}
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72">
            <button
              aria-label="Close"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-4 z-10 rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="size-5" />
            </button>
            <div className="h-full rounded-r-xl border-r bg-card shadow-xl">
              {sidebarBody}
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <NotificationPopover />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/30"
                  aria-label="Account menu"
                >
                  <Avatar className="size-8">
                    <AvatarFallback>{initials(user?.name ?? '?')}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{user?.name ?? 'User'}</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate(home)}>
                  <LayoutDashboard className="size-4" /> Dashboard
                </DropdownMenuItem>
                {user?.role !== 'support' && (
                  <>
                    <DropdownMenuItem onSelect={() => navigate(`${home}/forms`)}>
                      <FileText className="size-4" /> Forms
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate(`${home}/responses`)}>
                      <Inbox className="size-4" /> Responses
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate(`${home}/support`)}>
                      <MessageSquare className="size-4" /> My Support
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate(`${home}/contact`)}>
                      <LifeBuoy className="size-4" /> Contact us
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onSelect={() => navigate(user?.role === 'support' ? '/support/settings' : `${home}/settings`)}>
                  <Settings className="size-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmLogout(true)}>
                  <LogOut className="size-4" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <AppFooter authenticated role={user?.role === 'support' ? 'support' : 'designer'} />
      </div>

      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign back in to access your dashboard and forms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmLogout(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleLogout()}>
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
