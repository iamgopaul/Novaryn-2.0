import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Palette, Shield, Bell, ArrowRight } from 'lucide-react'

const settingsSections = [
  { title: 'Profile', description: 'Manage your personal information and avatar', icon: User, href: '/settings/profile' },
  { title: 'Appearance', description: 'Customize theme, colors, and display preferences', icon: Palette, href: '/settings/appearance' },
  { title: 'Security', description: 'Password, two-factor authentication, and sessions', icon: Shield, href: '/settings/security' },
  { title: 'Notifications', description: 'Email and push notification preferences', icon: Bell, href: '/settings/notifications' },
]

export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Manage your account settings and preferences</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {settingsSections.map((section) => (
          <Card key={section.href} className="group transition-colors hover:border-primary/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to={section.href}>
                  Open Settings
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
