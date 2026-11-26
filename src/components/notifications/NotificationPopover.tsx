import { Link } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '@/context/NotificationContext'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatRelativeTime } from '@/utils/helpers'
import { cn } from '@/lib/utils'

/** Notification bell with a dropdown listing the user's notifications. */
export function NotificationPopover() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={markAllAsRead}
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              You have no notifications.
            </p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                to={n.link ?? '#'}
                onClick={() => markAsRead(n.id)}
                className={cn(
                  'block border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/60',
                  !n.read && 'bg-primary/5'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(n.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
