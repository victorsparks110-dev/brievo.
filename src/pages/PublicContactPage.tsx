import { Link } from 'react-router-dom'
import { DesignerContactPage } from '@/pages/designer/DesignerContactPage'
import { AppFooter } from '@/components/layouts/AppFooter'

/**
 * Public contact page.
 *
 * Reuses the SAME Contact Us component as the logged-in designer experience
 * (`DesignerContactPage`), so there is exactly one Contact Us system. This
 * wrapper only provides the standalone marketing-style chrome (header + footer)
 * so visitors can reach the form without logging in.
 */
export function PublicContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      {/* Simple public header so visitors can navigate back to sign up / log in */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              B
            </span>
            <span className="text-lg font-semibold tracking-tight">BRIEVO</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Reused Contact Us form */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <DesignerContactPage />
      </main>

      <AppFooter />
    </div>
  )
}
