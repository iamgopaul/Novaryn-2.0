import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Users } from 'lucide-react'

interface FriendsListProps {
  userId?: string
}

export async function FriendsList({ userId }: FriendsListProps) {
  const supabase = await createClient()

  // Get accepted friendships
  const { data: friendships } = await supabase
    .from('friendships')
    .select(`
      *,
      friend:profiles!friendships_friend_id_fkey (
        id, username, display_name, avatar_url
      )
    `)
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted')
    .limit(5)

  // Get pending friend requests (where user is the friend_id, meaning someone sent them a request)
  const { data: pendingRequests } = await supabase
    .from('friendships')
    .select(`
      *,
      sender:profiles!friendships_user_id_fkey (
        id, username, display_name, avatar_url
      )
    `)
    .eq('friend_id', userId)
    .eq('status', 'pending')

  const friends = friendships?.map(f => {
    // Determine which profile is the friend
    if (f.user_id === userId) {
      return f.friend
    }
    // Need to fetch the other user
    return f.friend
  }) || []

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Friends</CardTitle>
          {pendingRequests && pendingRequests.length > 0 && (
            <Badge variant="secondary">{pendingRequests.length} pending</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {friends.length > 0 ? (
          <div className="space-y-3">
            {friends.map((friend) => (
              <Link
                key={friend.id}
                href={`/profile/${friend.username}`}
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
