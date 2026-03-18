import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Users, UserPlus, Crown, Shield, User, Clock, History } from 'lucide-react'
import { format } from 'date-fns'
import { InviteMemberDialog } from '@/components/teams/invite-member-dialog'

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
}

const roleColors = {
  owner: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  admin: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  member: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch team
  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !team) {
    notFound()
  }

  // Fetch team members with profiles
  const { data: members } = await supabase
    .from('team_members')
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('team_id', id)
    .order('role', { ascending: true })

  // Fetch shared history
  const { data: history } = await supabase
    .from('shared_history')
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('team_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Check if current user is admin/owner
  const currentMember = members?.find(m => m.user_id === user?.id)
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin'

  return (
    <div className="space-y-6">
      <Link
        href="/teams"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to teams
      </Link>

      {/* Team Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={team.avatar_url || undefined} />
            <AvatarFallback className="text-lg">
              {team.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
            <p className="text-muted-foreground">
              {team.description || 'No description'}
            </p>
          </div>
        </div>
        {canManage && (
          <InviteMemberDialog teamId={team.id} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Members Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
                <CardDescription>
                  {members?.length || 0} members in this team
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members?.map((member) => {
                const RoleIcon = roleIcons[member.role as keyof typeof roleIcons]
                const profile = member.profiles

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {profile?.display_name?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {profile?.display_name || profile?.username || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{profile?.username || 'unknown'}
                        </p>
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

        {/* Activity History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Team activity history</CardDescription>
          </CardHeader>
          <CardContent>
            {history && history.length > 0 ? (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={item.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {item.profiles?.display_name?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p>
                        <span className="font-medium">
                          {item.profiles?.display_name || 'User'}
                        </span>{' '}
                        <span className="text-muted-foreground">{item.action_type}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), 'MMM d, h:mm a')}
                      </p>
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
