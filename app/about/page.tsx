import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NovarynLogo } from '@/components/novaryn-logo'
import { ArrowLeft, Target, Eye, Heart, Sparkles } from 'lucide-react'

const values = [
  {
    icon: Target,
    title: 'Developer-First',
    description: 'We build tools that developers actually want to use. Every feature is designed with the developer experience in mind.'
  },
  {
    icon: Eye,
    title: 'Transparency',
    description: 'Open communication, clear documentation, and honest pricing. No hidden fees or surprises.'
  },
  {
    icon: Heart,
    title: 'Community',
    description: 'We believe in the power of community. Together, we build better software and support each other.'
  },
  {
    icon: Sparkles,
    title: 'Innovation',
    description: 'We embrace cutting-edge technology like AI to help developers work smarter, not harder.'
  }
]

const stats = [
  { value: '10K+', label: 'Active Developers' },
  { value: '50K+', label: 'Projects Created' },
  { value: '1M+', label: 'Lines of Code' },
  { value: '99.9%', label: 'Uptime' }
]

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <NovarynLogo className="h-8 w-8" />
            <span className="text-xl font-bold">Novaryn</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/about" className="text-sm font-medium text-foreground">
              About
            </Link>
            <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
            <Button asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-24">
        <div className="container mx-auto px-4">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="mx-auto max-w-3xl">
            <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
              Building the future of{' '}
              <span className="text-primary">software development</span>
            </h1>
            <p className="mt-6 text-pretty text-lg text-muted-foreground">
              Novaryn was founded with a simple mission: make software development 
              more accessible, collaborative, and enjoyable for everyone.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
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

      {/* Mission Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Our Mission
            </h2>
            <div className="mt-8 space-y-6 text-lg text-muted-foreground">
              <p className="text-pretty">
                We believe that great software should be built by empowered developers. 
                That&apos;s why we created Novaryn - a comprehensive platform that brings together 
                all the tools, collaboration features, and AI assistance developers need in one place.
              </p>
              <p className="text-pretty">
                Our platform is designed to streamline the entire software development lifecycle, 
                from initial planning to deployment. We provide powerful tools like code editors, 
                terminals, and documentation generators, along with team collaboration features 
                that make working together seamless.
              </p>
              <p className="text-pretty">
                With built-in AI assistance powered by the latest language models, developers 
                can get help with coding, debugging, and documentation in real-time. Our 
                community features also enable developers to connect, share knowledge, and 
                grow together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Our Values
            </h2>
            <p className="mt-4 text-pretty text-muted-foreground">
              These principles guide everything we do at Novaryn.
            </p>
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

      {/* Technology Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Built with Modern Technology
            </h2>
            <p className="mt-6 text-pretty text-lg text-muted-foreground">
              Novaryn is built using the latest and most reliable technologies:
            </p>
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              <li className="flex items-center gap-3 rounded-lg border p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <span className="text-lg font-bold text-primary">TS</span>
                </div>
                <div>
                  <p className="font-medium">TypeScript</p>
                  <p className="text-sm text-muted-foreground">Type-safe development</p>
                </div>
              </li>
              <li className="flex items-center gap-3 rounded-lg border p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <span className="text-lg font-bold text-primary">R</span>
                </div>
                <div>
                  <p className="font-medium">React & Next.js</p>
                  <p className="text-sm text-muted-foreground">Modern web framework</p>
                </div>
              </li>
              <li className="flex items-center gap-3 rounded-lg border p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <span className="text-lg font-bold text-primary">S</span>
                </div>
                <div>
                  <p className="font-medium">Supabase</p>
                  <p className="text-sm text-muted-foreground">Backend & authentication</p>
                </div>
              </li>
              <li className="flex items-center gap-3 rounded-lg border p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <span className="text-lg font-bold text-primary">V</span>
                </div>
                <div>
                  <p className="font-medium">Vercel</p>
                  <p className="text-sm text-muted-foreground">Edge deployment</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-24 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            Join our community today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-primary-foreground/80">
            Start building better software with Novaryn. It&apos;s free to get started.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link href="/auth/sign-up">Create Your Account</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <NovarynLogo className="h-6 w-6" />
              <span className="font-semibold">Novaryn</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-6">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                About
              </Link>
              <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
                Sign In
              </Link>
              <Link href="/auth/sign-up" className="text-sm text-muted-foreground hover:text-foreground">
                Sign Up
              </Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Novaryn. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
