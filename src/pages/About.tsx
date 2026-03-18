import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NovarynLogo } from '@/components/novaryn-logo'
import { ArrowLeft, Target, Eye, Heart, Sparkles } from 'lucide-react'

const values = [
  { icon: Target, title: 'Developer-First', description: 'We build tools that developers actually want to use.' },
  { icon: Eye, title: 'Transparency', description: 'Open communication, clear documentation, and honest pricing.' },
  { icon: Heart, title: 'Community', description: 'We believe in the power of community.' },
  { icon: Sparkles, title: 'Innovation', description: 'We embrace cutting-edge technology like AI.' },
]

const stats = [
  { value: '10K+', label: 'Active Developers' },
  { value: '50K+', label: 'Projects Created' },
  { value: '1M+', label: 'Lines of Code' },
  { value: '99.9%', label: 'Uptime' },
]

export function About() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <NovarynLogo className="h-8 w-8" />
            <span className="text-xl font-bold">Novaryn</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/about" className="text-sm font-medium text-foreground">About</Link>
            <Link to="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign In</Link>
            <Button asChild>
              <Link to="/auth/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-primary/5 to-background py-24">
        <div className="container mx-auto px-4">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="mx-auto max-w-3xl">
            <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
              Building the future of <span className="text-primary">software development</span>
            </h1>
            <p className="mt-6 text-pretty text-lg text-muted-foreground">
              Novaryn was founded with a simple mission: make software development more accessible, collaborative, and enjoyable.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-primary md:text-4xl">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Our Values</h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {values.map((value) => (
              <Card key={value.title}>
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary py-24 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Join our community today</h2>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link to="/auth/sign-up">Create Your Account</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <NovarynLogo className="h-6 w-6" />
              <span className="font-semibold">Novaryn</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-6">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
              <Link to="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">Sign In</Link>
              <Link to="/auth/sign-up" className="text-sm text-muted-foreground hover:text-foreground">Sign Up</Link>
            </nav>
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Novaryn.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
