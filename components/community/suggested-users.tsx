import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users } from 'lucide-react'

interface SuggestedUsersProps {
  currentUserId?: string
}

export async function SuggestedUsers({ currentUserId }: SuggestedUsersProps) {
  const supabase = await createClient()

  // Get users that the current user is not following
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', currentUserId || '')
    .limit(5)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Suggested Developers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {users && users.length > 0 ? (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <Link
                  href={`/community/profile/${user.username || user.id}`}
                  className="flex items-center gap-3"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.display_name?.slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium hover:underline">
                      {user.display_name || 'Unknown'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{user.username || 'unknown'}
                    </p>
                  </div>
                </Link>
                <Button variant="outline" size="sm">
                  Follow
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No suggestions available
          </p>
        )}
      </CardContent>
    </Card>
  )
}
