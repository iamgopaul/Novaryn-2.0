import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NovarynLogo } from '@/components/novaryn-logo'
import {
  Code2,
  Users,
  MessageSquare,
  Bot,
  Layers,
  Zap,
  Shield,
  GitBranch,
  Terminal,
  FileCode,
} from 'lucide-react'

const features = [
  { icon: Layers, title: 'Project Management', description: 'Track your projects through the entire SDLC with visual pipelines, health indicators, and control tower views.' },
  { icon: Code2, title: 'Developer Tools', description: 'Built-in code editor, terminal, documentation generator, and snippet manager - everything you need in one place.' },
  { icon: Users, title: 'Team Collaboration', description: 'Invite team members, assign roles, and work together with shared history and real-time updates.' },
  { icon: MessageSquare, title: 'Community', description: 'Connect with other developers, share posts, follow friends, and build your professional network.' },
  { icon: Bot, title: 'AI Assistant', description: 'Get help with coding, debugging, and documentation using our powerful AI chatbot.' },
  { icon: Shield, title: 'Secure by Design', description: 'Two-factor authentication, secure sessions, and enterprise-grade security for your peace of mind.' },
]

const tools = [
  { icon: FileCode, name: 'Code Editor', description: 'Monaco-powered IDE' },
  { icon: Terminal, name: 'Terminal', description: 'Command execution' },
  { icon: GitBranch, name: 'Version Control', description: 'Git integration' },
  { icon: Zap, name: 'AI Assist', description: 'Smart suggestions' },
]

export function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 min-h-[3.5rem] items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
          <Link to="/" className="flex items-center gap-2">
            <NovarynLogo className="h-8 w-8" />
            <span className="text-xl font-bold">Novaryn</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground">About</Link>
            <Link to="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign In</Link>
            <Button asChild>
              <Link to="/auth/sign-up">Get Started</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Button asChild size="sm">
              <Link to="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-6xl">
              Your All-in-One <span className="text-primary">Developer Hub</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
              Build, collaborate, and ship amazing software with powerful tools, AI assistance, and a thriving developer community.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/auth/sign-up">Start Building Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link to="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
      </section>

      <section className="border-y bg-muted/30 py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 md:gap-16">
            {tools.map((t) => (
              <div key={t.name} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <t.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-16">
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Everything you need to build great software</h2>
            <p className="mt-4 text-pretty text-muted-foreground">
              Novaryn combines powerful development tools, team collaboration, and AI assistance into one seamless platform.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-2 transition-colors hover:border-primary/50">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary py-16 text-primary-foreground sm:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Ready to transform your development workflow?</h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-primary-foreground/80">
            Join thousands of developers who are building better software with Novaryn.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link to="/auth/sign-up">Get Started for Free</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:gap-6 md:flex-row md:text-left">
            <div className="flex items-center gap-2">
              <NovarynLogo className="h-6 w-6" />
              <span className="font-semibold">Novaryn</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-6">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
              <Link to="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">Sign In</Link>
              <Link to="/auth/sign-up" className="text-sm text-muted-foreground hover:text-foreground">Sign Up</Link>
            </nav>
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Novaryn. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
