import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { CreatePostForm } from '@/components/community/create-post-form'
import { PostCard } from '@/components/community/post-card'
import { SuggestedUsers } from '@/components/community/suggested-users'
import { FriendsList } from '@/components/community/friends-list'
import { MessageCircle, TrendingUp, Users } from 'lucide-react'
import { Post } from '@/lib/types'

export function Community() {
  const [posts, setPosts] = useState<(Post & { profile?: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }; is_liked?: boolean })[]>([])
  const [userId, setUserId] = useState<string | undefined>()
  const [totalPosts, setTotalPosts] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id)

      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profiles(id, username, display_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(20)
      const postsWithProfile = (postsData || []).map((p) => ({ ...p, profile: p.profiles, is_liked: false }))

      if (user) {
        const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id)
        const likedSet = new Set(likes?.map((l) => l.post_id) || [])
        postsWithProfile.forEach((p) => { p.is_liked = likedSet.has(p.id) })
      }
      setPosts(postsWithProfile)

      const { count: postsCount } = await supabase.from('posts').select('*', { count: 'exact', head: true })
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      setTotalPosts(postsCount ?? 0)
      setTotalUsers(usersCount ?? 0)
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground">Connect with other developers and share your work</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPosts}</p>
              <p className="text-sm text-muted-foreground">Total Posts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-sm text-muted-foreground">Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">Active</p>
              <p className="text-sm text-muted-foreground">Community Status</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CreatePostForm />
          {posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={userId} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No posts yet</h3>
                <p className="mt-1 text-center text-sm text-muted-foreground">Be the first to share something with the community!</p>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <SuggestedUsers currentUserId={userId} />
          <FriendsList userId={userId} />
        </div>
      </div>
    </div>
  )
}
