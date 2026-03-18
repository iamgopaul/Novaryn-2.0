import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { Plus, Search } from 'lucide-react'

interface NewConversationDialogProps {
  currentUserId: string
}

export function NewConversationDialog({ currentUserId }: NewConversationDialogProps) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<Array<{
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }>>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (search.length < 2) {
      setUsers([])
      return
    }

    const searchUsers = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .neq('id', currentUserId)
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .limit(5)

      setUsers(data || [])
      setLoading(false)
    }

    const debounce = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounce)
  }, [search, currentUserId, supabase])

  const handleSelectUser = (userId: string) => {
    setIsOpen(false)
    navigate(`/messages/${userId}`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {loading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <Avatar>
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.display_name?.slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.display_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">@{user.username || 'unknown'}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : search.length >= 2 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No users found
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              Type at least 2 characters to search
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
