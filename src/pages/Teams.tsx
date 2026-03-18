import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Users, ArrowRight, Crown, Shield, User } from 'lucide-react'

const roleIcons = { owner: Crown, admin: Shield, member: User }
const roleColors = {
  owner: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  admin: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  member: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
}

interface TeamMemberRow {
  id: string
  team_id: string
  user_id: string
  role: string
  teams: { id: string; name: string; description: string | null; avatar_url: string | null; owner_id: string } | null
}

export function Teams() {
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([])
  const [countsByTeam, setCountsByTeam] = useState<Record<string, number>>({})
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: members } = await supabase
        .from('team_members')
        .select('*, teams(id, name, description, avatar_url, owner_id)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
      setTeamMembers((members as TeamMemberRow[]) || [])
      const teamIds = members?.map((m: { team_id: string }) => m.team_id) || []
      const { data: countData } = await supabase.from('team_members').select('team_id').in('team_id', teamIds)
      const counts = (countData || []).reduce((acc: Record<string, number>, m: { team_id: string }) => {
        acc[m.team_id] = (acc[m.team_id] || 0) + 1
        return acc
      }, {})
      setCountsByTeam(counts)
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Teams</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Collaborate with others on projects</p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link to="/teams/new"><Plus className="mr-2 h-4 w-4" />Create Team</Link>
        </Button>
      </div>

      {teamMembers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((tm) => {
            const team = tm.teams
            const RoleIcon = roleIcons[tm.role as keyof typeof roleIcons]
            const memberCount = countsByTeam[tm.team_id] || 0
            return (
              <Card key={tm.id} className="group transition-colors hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={team?.avatar_url || undefined} />
                      <AvatarFallback>{team?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{team?.name}</CardTitle>
                      <CardDescription className="line-clamp-1">{team?.description || 'No description'}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{memberCount} members</span>
                    </div>
                    <Badge variant="outline" className={roleColors[tm.role as keyof typeof roleColors]}>
                      <RoleIcon className="mr-1 h-3 w-3" />
                      {tm.role}
                    </Badge>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={`/teams/${tm.team_id}`}>
                      View Team
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No teams yet</h3>
            <p className="mt-1 text-center text-sm text-muted-foreground">Create a team or join one to start collaborating</p>
            <Button asChild className="mt-4">
              <Link to="/teams/new"><Plus className="mr-2 h-4 w-4" />Create Team</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
