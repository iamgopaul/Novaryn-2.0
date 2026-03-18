import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Users, Crown, Shield, User, Clock, History } from 'lucide-react'
import { format } from 'date-fns'
import { InviteMemberDialog } from '@/components/teams/invite-member-dialog'
import { Team } from '@/lib/types'

const roleIcons = { owner: Crown, admin: Shield, member: User }
const roleColors = {
  owner: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  admin: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  member: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
}

interface MemberRow {
  id: string
  user_id: string
  role: string
  profiles: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null
}

interface HistoryRow {
  id: string
  action_type: string
  created_at: string
  profiles: { display_name: string | null; avatar_url: string | null } | null
}

export function TeamDetail() {
  const { id } = useParams<{ id: string }>()
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: teamData, error } = await supabase.from('teams').select('*').eq('id', id).single()
      if (error || !teamData) { setNotFound(true); setLoading(false); return }
      setTeam(teamData as Team)
      const { data: membersData } = await supabase
        .from('team_members')
        .select('*, profiles(id, username, display_name, avatar_url)')
        .eq('team_id', id)
        .order('role', { ascending: true })
      setMembers((membersData as MemberRow[]) || [])
      const { data: historyData } = await supabase
        .from('shared_history')
        .select('*, profiles(id, display_name, avatar_url)')
        .eq('team_id', id)
        .order('created_at', { ascending: false })
        .limit(10)
      setHistory((historyData as HistoryRow[]) || [])
      setLoading(false)
    }
    load()
  }, [id])

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null))
  }, [])
  const canManageState =
    !!currentUserId && members.some((m) => m.user_id === currentUserId && (m.role === 'owner' || m.role === 'admin'))

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
  if (notFound || !team) return <div className="space-y-4"><h1 className="text-2xl font-bold">Team not found</h1><Link to="/teams" className="text-primary hover:underline">Back to teams</Link></div>

  return (
    <div className="space-y-6">
      <Link to="/teams" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Back to teams
      </Link>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={team.avatar_url || undefined} />
            <AvatarFallback className="text-lg">{team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
            <p className="text-muted-foreground">{team.description || 'No description'}</p>
          </div>
        </div>
        {canManageState && <InviteMemberDialog teamId={team.id} />}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Team Members</CardTitle>
            <CardDescription>{members.length} members in this team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map((member) => {
                const RoleIcon = roleIcons[member.role as keyof typeof roleIcons]
                const profile = member.profiles
                return (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback>{profile?.display_name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{profile?.display_name || profile?.username || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">@{profile?.username || 'unknown'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={roleColors[member.role as keyof typeof roleColors]}>
                      <RoleIcon className="mr-1 h-3 w-3" />
                      {member.role}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Recent Activity</CardTitle>
            <CardDescription>Team activity history</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{item.profiles?.display_name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p><span className="font-medium">{item.profiles?.display_name || 'User'}</span> <span className="text-muted-foreground">{item.action_type}</span></p>
                      <p className="text-xs text-muted-foreground">{format(new Date(item.created_at), 'MMM d, h:mm a')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No activity yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
