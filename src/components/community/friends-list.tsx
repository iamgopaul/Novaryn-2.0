import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

interface FriendProfile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

interface FriendsListProps {
  userId?: string
}

export function FriendsList({ userId }: FriendsListProps) {
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted')
        .limit(5)
      const ids =
        friendships?.map((f: { user_id: string; friend_id: string }) =>
          f.user_id === userId ? f.friend_id : f.user_id
        ) ?? []
      const uniqueIds = Array.from(new Set(ids)).filter(Boolean)
      const { data: profiles } = uniqueIds.length
        ? await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', uniqueIds)
        : { data: [] as FriendProfile[] }
      setFriends((profiles as FriendProfile[] | null) ?? [])

      const { count } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', userId)
        .eq('status', 'pending')
      setPendingCount(count ?? 0)
    }
    load()
  }, [userId])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Friends</CardTitle>
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} pending</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {friends.length > 0 ? (
          <div className="space-y-3">
            {friends.map((friend) => (
              <Link
                key={friend.id}
                to={`/community/profile/${friend.username || friend.id}`}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={friend.avatar_url || ''} />
                  <AvatarFallback>
                    {friend.display_name?.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{friend.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Users className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No friends yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
