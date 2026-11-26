import { Link } from 'react-router-dom'
import { ArrowRight, FileText, Inbox, Share2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePageMeta } from '@/hooks/usePageMeta'
import { AppFooter } from '@/components/layouts/AppFooter'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

const FEATURES = [
  {
    icon: FileText,
    title: 'Custom Intake Forms',
    description:
      'Build flexible forms with custom questions, file uploads, multiple-choice options, budget targets, and timeline requirements.',
  },
  {
    icon: Share2,
    title: 'Shareable Client Links',
    description:
      'Generate instant public links. Clients open, complete, and submit project details without needing to register an account.',
  },
  {
    icon: Inbox,
    title: 'Organized Submissions',
    description:
      'Review complete client briefs, specifications, brand assets, and answers in one clean designer dashboard.',
  },
]

export function LandingPage() {
  usePageMeta('')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              B
            </span>
            <span className="text-lg font-semibold tracking-tight">BRIEVO</span>
          </div>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Designer information collection platform
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Effortless client intake,{'\n'}
            <span className="text-primary">from form to final brief.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            BRIEVO helps designers create tailored information-collection forms,
            share public links with clients, and gather exact project details,
            specifications, and files seamlessly.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/signup">
                Start free <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Explore the demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="rounded-xl border bg-card p-6">
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <AppFooter />
    </div>
  )
}
