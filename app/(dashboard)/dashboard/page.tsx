import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  FolderKanban,
  Users,
  Code2,
  MessageCircle,
  Plus,
  ArrowRight,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { SDLCPipeline } from '@/components/dashboard/sdlc-pipeline'
import { ProjectHealthCard } from '@/components/dashboard/project-health-card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user's projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user?.id)
    .order('updated_at', { ascending: false })
    .limit(5)

  // Fetch user's teams
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('team_id, teams(id, name)')
    .eq('user_id', user?.id)
    .limit(5)

  const stats = {
    totalProjects: projects?.length || 0,
    activeProjects: projects?.filter(p => !['completed', 'archived'].includes(p.status)).length || 0,
    teams: teamMembers?.length || 0,
    healthyProjects: projects?.filter(p => p.health === 'healthy').length || 0,
    atRiskProjects: projects?.filter(p => p.health === 'at_risk').length || 0,
    criticalProjects: projects?.filter(p => p.health === 'critical').length || 0,
  }

  const statusCounts = {
    planning: projects?.filter(p => p.status === 'planning').length || 0,
    design: projects?.filter(p => p.status === 'design').length || 0,
    development: projects?.filter(p => p.status === 'development').length || 0,
    testing: projects?.filter(p => p.status === 'testing').length || 0,
    review: projects?.filter(p => p.status === 'review').length || 0,
    deployment: projects?.filter(p => p.status === 'deployment').length || 0,
    completed: projects?.filter(p => p.status === 'completed').length || 0,
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your development activities.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeProjects} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teams}</div>
            <p className="text-xs text-muted-foreground">
              Collaborating with others
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm">{stats.healthyProjects} Healthy</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">{stats.atRiskProjects} At Risk</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Code2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link href="/tools/editor">
                <Code2 className="mr-2 h-3 w-3" />
                Open Editor
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link href="/chatbot">
                <MessageCircle className="mr-2 h-3 w-3" />
                AI Assistant
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* SDLC Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>SDLC Pipeline</CardTitle>
          <CardDescription>
            Track your projects through the software development lifecycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SDLCPipeline statusCounts={statusCounts} />
        </CardContent>
      </Card>

      {/* Recent Projects & Control Tower */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Your latest project activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {projects && projects.length > 0 ? (
              <div className="space-y-4">
                {projects.map((project) => (
                  <ProjectHealthCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderKanban className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-sm font-medium">No projects yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first project to get started
                </p>
                <Button asChild className="mt-4">
                  <Link href="/projects/new">
                    <Plus className="mr-2 h-4 w-4" />
                    New Project
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Control Tower */}
        <Card>
          <CardHeader>
            <CardTitle>Control Tower</CardTitle>
            <CardDescription>Quick overview of all project statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">Healthy</p>
                    <p className="text-sm text-muted-foreground">On track projects</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg">
                  {stats.healthyProjects}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-medium">At Risk</p>
                    <p className="text-sm text-muted-foreground">Needs attention</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg">
                  {stats.atRiskProjects}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                    <Clock className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium">Critical</p>
                    <p className="text-sm text-muted-foreground">Immediate action required</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg">
                  {stats.criticalProjects}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
