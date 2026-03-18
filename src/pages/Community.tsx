import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { CreatePostForm } from '@/components/community/create-post-form'
import { PostCard } from '@/components/community/post-card'
import { SuggestedUsers } from '@/components/community/suggested-users'
import { FriendsList } from '@/components/community/friends-list'
import { MessageCircle, TrendingUp, Users } from 'lucide-react'
import { Post } from '@/lib/types'

type PostWithMeta = Post & { profile?: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }; is_liked?: boolean }

export function Community() {
  const [posts, setPosts] = useState<PostWithMeta[]>([])
  const [userId, setUserId] = useState<string | undefined>()
  const [totalPosts, setTotalPosts] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id)

      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profiles(id, username, display_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(20)
      const postsWithProfile: PostWithMeta[] = (postsData || []).map((p: { profiles?: PostWithMeta['profile'] }) => ({ ...p, profile: p.profiles, is_liked: false })) as PostWithMeta[]

      if (user) {
        const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id)
        const likedSet = new Set(likes?.map((l: { post_id: string }) => l.post_id) || [])
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

  // Real-time: posts
  useEffect(() => {
    const channel = supabase
      .channel('community-posts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as { id: string; user_id: string; content: string; created_at: string; likes_count: number; comments_count: number; reposts_count: number; media_urls?: string[]; is_repost?: boolean; original_post_id?: string }
            const { data } = await supabase
              .from('posts')
              .select('*, profiles(id, username, display_name, avatar_url)')
              .eq('id', newRow.id)
              .single()
            if (data) {
              const withProfile = { ...data, profile: (data as { profiles?: PostWithMeta['profile'] }).profiles, is_liked: false }
              setPosts((prev) => [withProfile as PostWithMeta, ...prev])
            }
            setTotalPosts((n) => n + 1)
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as { id: string; likes_count?: number; comments_count?: number; reposts_count?: number; content?: string }
            setPosts((prev) =>
              prev.map((p) => (p.id === row.id ? { ...p, ...row, likes_count: row.likes_count ?? p.likes_count, comments_count: row.comments_count ?? p.comments_count, reposts_count: row.reposts_count ?? p.reposts_count } : p))
            )
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as { id: string }
            setPosts((prev) => prev.filter((p) => p.id !== old.id))
            setTotalPosts((n) => Math.max(0, n - 1))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Real-time: post_likes (sync likes_count and is_liked)
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('community-likes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_likes' },
        (payload) => {
          const row = payload.new as { post_id: string; user_id: string }
          setPosts((prev) =>
            prev.map((p) =>
              p.id === row.post_id
                ? { ...p, likes_count: (p.likes_count ?? 0) + 1, is_liked: row.user_id === userId ? true : p.is_liked }
                : p
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_likes' },
        (payload) => {
          const row = payload.old as { post_id: string; user_id: string }
          setPosts((prev) =>
            prev.map((p) =>
              p.id === row.post_id
                ? { ...p, likes_count: Math.max(0, (p.likes_count ?? 0) - 1), is_liked: row.user_id === userId ? false : p.is_liked }
                : p
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Community</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Connect with other developers and share your work</p>
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
