import {
  FileText,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Settings,
} from 'lucide-react'
import { DashboardLayout } from './DashboardLayout'

const NAV = [
  { label: 'Dashboard', to: '/designer', end: true, icon: LayoutDashboard },
  { label: 'Forms', to: '/designer/forms', icon: FileText },
  { label: 'Responses', to: '/designer/responses', icon: Inbox },
  { label: 'Settings', to: '/designer/settings', icon: Settings },
  { label: 'My Support', to: '/designer/support', icon: MessageSquare },
  { label: 'Contact Us', to: '/designer/contact', icon: LifeBuoy },
]

export function DesignerLayout() {
  return <DashboardLayout navItems={NAV} />
}
