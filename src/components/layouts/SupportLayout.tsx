import { MessageSquare, LayoutDashboard, UserCheck, KeyRound, Settings } from 'lucide-react'
import { DashboardLayout } from './DashboardLayout'

const NAV = [
  { label: 'Dashboard', to: '/support', end: true, icon: LayoutDashboard },
  { label: 'Tickets', to: '/support/tickets', icon: MessageSquare },
  { label: 'Pending Designers', to: '/support/pending-designers', icon: UserCheck },
  { label: 'Password Reset', to: '/support/password-reset', icon: KeyRound },
  { label: 'Settings', to: '/support/settings', icon: Settings },
]

export function SupportLayout() {
  return <DashboardLayout navItems={NAV} />
}
