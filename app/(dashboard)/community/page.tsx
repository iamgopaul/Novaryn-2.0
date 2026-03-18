import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreatePostForm } from '@/components/community/create-post-form'
import { PostCard } from '@/components/community/post-card'
import { SuggestedUsers } from '@/components/community/suggested-users'
import { MessageCircle, TrendingUp, Users } from 'lucide-react'

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch posts with profiles
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  // Get user's liked posts
  const { data: likes } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', user?.id)

  const likedPostIds = new Set(likes?.map(l => l.post_id) || [])

  // Enrich posts with like status
  const enrichedPosts = posts?.map(post => ({
    ...post,
    profile: post.profiles,
    is_liked: likedPostIds.has(post.id),
  })) || []

  // Get stats
  const { count: totalPosts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })

  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground">
          Connect with other developers and share your work
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPosts || 0}</p>
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
              <p className="text-2xl font-bold">{totalUsers || 0}</p>
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
        {/* Main Feed */}
        <div className="space-y-6 lg:col-span-2">
          <CreatePostForm />
          
          {enrichedPosts.length > 0 ? (
            <div className="space-y-4">
              {enrichedPosts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={user?.id} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No posts yet</h3>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  Be the first to share something with the community!
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SuggestedUsers currentUserId={user?.id} />
        </div>
      </div>
    </div>
  )
}
