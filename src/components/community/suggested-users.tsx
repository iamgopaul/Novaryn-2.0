import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users } from 'lucide-react'
import { Profile } from '@/lib/types'

interface SuggestedUsersProps {
  currentUserId?: string
}

export function SuggestedUsers({ currentUserId }: SuggestedUsersProps) {
  const [users, setUsers] = useState<Profile[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId || '')
        .limit(5)
      if (data) setUsers(data)
    }
    fetchUsers()
  }, [currentUserId])

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
                  to={`/community/profile/${user.username || user.id}`}
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
