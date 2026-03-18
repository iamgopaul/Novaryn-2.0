import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { FolderKanban, Users, Plus, ArrowRight } from 'lucide-react'
import { ProjectHealthCard } from '@/components/dashboard/project-health-card'
import { Project } from '@/lib/types'

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [teamsCount, setTeamsCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: projs } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5)
      setProjects(projs || [])
      const { count } = await supabase.from('team_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      setTeamsCount(count ?? 0)
    }
    load()
  }, [])

  const activeProjects = projects.filter((p) => !['completed', 'archived'].includes(p.status)).length
  const healthyCount = projects.filter((p) => p.health === 'healthy').length

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Overview</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Welcome back. Here&apos;s what&apos;s happening with your projects.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">{activeProjects} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamsCount}</div>
            <p className="text-xs text-muted-foreground">Member of</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{healthyCount}</div>
            <p className="text-xs text-muted-foreground">Projects on track</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Your latest project updates</CardDescription>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No projects yet.</p>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <ProjectHealthCard key={project.id} project={project} />
              ))}
            </div>
          )}
          <Button variant="ghost" className="mt-4 w-full" asChild>
            <Link to="/projects">
              View all projects
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
