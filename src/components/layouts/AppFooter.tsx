import { Link } from 'react-router-dom'
import { LayoutDashboard, FileText, Inbox, Settings, LifeBuoy, MessageSquare, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DESIGNER_QUICK_LINKS = [
  { label: 'Dashboard', to: '/designer', icon: LayoutDashboard },
  { label: 'Forms', to: '/designer/forms', icon: FileText },
  { label: 'Responses', to: '/designer/responses', icon: Inbox },
  { label: 'Settings', to: '/designer/settings', icon: Settings },
]

const SUPPORT_QUICK_LINKS = [
  { label: 'Dashboard', to: '/support', icon: LayoutDashboard },
  { label: 'Tickets', to: '/support/tickets', icon: MessageSquare },
  { label: 'Password Reset', to: '/support/password-reset', icon: Ticket },
  { label: 'Settings', to: '/support/settings', icon: Settings },
]

interface AppFooterProps {
  /** When true renders a slimmer, single-column footer suited for auth pages. */
  compact?: boolean
  /**
   * When true, the Contact Us button navigates to the logged-in app's
   * /designer/contact page. When false it navigates to the public /contact
   * page. Both reuse the same Contact Us form so there is a single system.
   */
  authenticated?: boolean
  /** User role for role-aware quick links. Defaults to 'designer'. */
  role?: 'designer' | 'support'
}

export function AppFooter({ compact = false, authenticated = false, role = 'designer' }: AppFooterProps) {
  const year = new Date().getFullYear()

  const contactTo = authenticated
    ? (role === 'support' ? '/support' : '/designer/contact')
    : '/contact'

  const quickLinks = role === 'support' ? SUPPORT_QUICK_LINKS : DESIGNER_QUICK_LINKS

  const ContactButton = () => (
    <Button variant="outline" size="sm" asChild>
      <Link to={contactTo} aria-label="Contact BRIEVO">
        <LifeBuoy className="size-3.5" />
        Contact Us
      </Link>
    </Button>
  )

  if (compact) {
    return (
      <footer className="border-t bg-muted/20 py-6">
        <div className="mx-auto flex max-w-md flex-col items-center px-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {year} BRIEVO.{' '}
            <span className="font-medium text-foreground/60">Powered by SPARKS DIGITAL</span>
          </p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="border-t bg-muted/20">
      {/* Main footer body */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">

          {/* Brand column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                B
              </span>
              <span className="text-lg font-semibold tracking-tight">BRIEVO</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Better briefs. Clearer projects. Less back and forth.
            </p>
            <p className="text-sm text-muted-foreground">
              BRIEVO helps designers collect the right information from clients
              before work begins — structured forms, shareable links, and
              organised responses in one place.
            </p>
          </div>

          {/* Quick Links column */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Quick links
            </h3>
            <ul className="space-y-2">
              {quickLinks.map(({ label, to, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact column */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Get in touch
            </h3>
            <p className="text-sm text-muted-foreground">
              Have a question or need support? We'd love to hear from you.
            </p>
            <ContactButton />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1.5 px-4 py-4 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <p className="text-xs text-muted-foreground">
            © {year}{' '}
            <span className="font-semibold text-foreground/70">BRIEVO</span>
            {' '}— Designer Information Collection Platform.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by{' '}
            <span className="font-semibold tracking-wide text-primary">
              SPARKS DIGITAL
            </span>
          </p>
        </div>
      </div>
    </footer>
  )
}
