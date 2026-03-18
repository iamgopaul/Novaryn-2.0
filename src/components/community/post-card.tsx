import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Post } from '@/lib/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow } from 'date-fns'
import { Heart, MessageCircle, Repeat2, MoreHorizontal, Trash2, Send } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type CommentRow = {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profile?: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }
}

interface PostCardProps {
  post: Omit<Post, 'profile' | 'original_post'> & {
    profile?: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }
    original_post?: Omit<Post, 'profile' | 'original_post'> & {
      profile?: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }
    }
  }
  currentUserId?: string
}

export function PostCard({ post, currentUserId }: PostCardProps) {
  const navigate = useNavigate()
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentSending, setCommentSending] = useState(false)
  const [isRepostComposerOpen, setIsRepostComposerOpen] = useState(false)
  const [repostText, setRepostText] = useState('')
  const supabase = createClient()

  useEffect(() => {
    setIsLiked(!!post.is_liked)
    setLikesCount(post.likes_count ?? 0)
  }, [post.id, post.is_liked, post.likes_count])

  const isOwner = currentUserId === post.user_id
  const profile = post.profile
  const isRepost = !!post.repost_of && !!post.original_post
  const targetPostId = post.id

  const handleGoToOriginal = () => {
    if (!post.original_post) return
    // Always navigate to the original post on the community page
    navigate(`/community#post-${post.original_post.id}`)
  }

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', targetPostId)
        .order('created_at', { ascending: true })
      const rows = (data || []) as CommentRow[]
      const userIds = [...new Set(rows.map((c) => c.user_id))]
      const { data: profiles } = userIds.length
        ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds)
        : { data: [] as CommentRow['profile'][] }
      const safeProfiles = (profiles || []).filter(
        (p): p is NonNullable<CommentRow['profile']> => Boolean(p)
      )
      const profileMap = new Map(safeProfiles.map((p) => [p.id, p]))
      setComments(rows.map((c) => ({ ...c, profile: profileMap.get(c.user_id) })))
    }
    load()
  }, [targetPostId, supabase])

  const handleAddComment = async () => {
    const text = commentText.trim()
    if (!text || !currentUserId || commentSending) return
    setCommentSending(true)
    const { error } = await supabase.from('post_comments').insert({
      post_id: targetPostId,
      user_id: currentUserId,
      content: text,
    })
    if (!error) {
      setCommentText('')
      const { data } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', targetPostId)
        .order('created_at', { ascending: true })
      const rows = (data || []) as CommentRow[]
      const userIds = [...new Set(rows.map((c) => c.user_id))]
      const { data: profiles } = userIds.length
        ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds)
        : { data: [] as CommentRow['profile'][] }
      const safeProfiles = (profiles || []).filter(
        (p): p is NonNullable<CommentRow['profile']> => Boolean(p)
      )
      const profileMap = new Map(safeProfiles.map((p) => [p.id, p]))
      setComments(rows.map((c) => ({ ...c, profile: profileMap.get(c.user_id) })))
    }
    setCommentSending(false)
  }

  const openRepostComposer = () => {
    if (!currentUserId || loading) return
    setIsRepostComposerOpen(true)
    // If this is already a repost with text, start from that text so
    // reposting a repost “posts what you posted”.
    setRepostText(post.content || '')
  }

  const submitRepost = async () => {
    if (loading || !currentUserId) return
    setLoading(true)
    const targetId = post.repost_of || post.id
    const content = repostText.trim()
    const { error } = await supabase.from('posts').insert({
      user_id: currentUserId,
      content,
      repost_of: targetId,
    })
    if (error) {
      console.error('Error creating repost', error)
    } else {
      setIsRepostComposerOpen(false)
      setRepostText('')
    }
    setLoading(false)
  }

  const handleLike = async () => {
    if (loading || !currentUserId) return
    setLoading(true)

    if (isLiked) {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
      if (error) {
        console.error('Error unliking post', error)
      } else {
        setIsLiked(false)
        setLikesCount(prev => Math.max(0, prev - 1))
      }
    } else {
      const { error } = await supabase.from('post_likes').insert({
        post_id: post.id,
        user_id: currentUserId,
      })
      if (error) {
        console.error('Error liking post', error)
      } else {
        setIsLiked(true)
        setLikesCount(prev => prev + 1)
      }
    }

    setLoading(false)
  }

  const handleDelete = async () => {
    if (!isOwner) return
    await supabase.from('posts').delete().eq('id', post.id)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        {isRepost && (
          <div className="mb-2 text-xs text-muted-foreground">
            Reposted by <span className="font-medium text-foreground">{profile?.display_name || 'Unknown'}</span> ·{' '}
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </div>
        )}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/community/profile/${(isRepost ? post.original_post?.profile?.username : profile?.username) || (isRepost ? post.original_post?.user_id : post.user_id)}`}>
              <Avatar>
                <AvatarImage src={(isRepost ? post.original_post?.profile?.avatar_url : profile?.avatar_url) || undefined} />
                <AvatarFallback>
                  {(isRepost ? post.original_post?.profile?.display_name : profile?.display_name)?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link
                to={`/community/profile/${(isRepost ? post.original_post?.profile?.username : profile?.username) || (isRepost ? post.original_post?.user_id : post.user_id)}`}
                className="font-medium hover:underline"
              >
                {(isRepost ? post.original_post?.profile?.display_name : profile?.display_name) || 'Unknown User'}
              </Link>
              <p className="text-sm text-muted-foreground">
                @{(isRepost ? post.original_post?.profile?.username : profile?.username) || 'unknown'} ·{' '}
                {formatDistanceToNow(new Date((isRepost ? post.original_post?.created_at : post.created_at) as string), { addSuffix: true })}
              </p>
            </div>
          </div>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRepost ? (
          <>
            {post.content && (
              <p className="whitespace-pre-wrap text-sm sm:text-base text-foreground">
                {post.content}
              </p>
            )}
            <button
              type="button"
              onClick={handleGoToOriginal}
              className="w-full text-left rounded-xl border border-border/80 bg-muted/40 p-3 sm:p-4 hover:border-primary/60 hover:bg-primary/5 transition-colors"
            >
              {post.original_post ? (
                <p className="whitespace-pre-wrap text-sm sm:text-base text-foreground">
                  {post.original_post.content}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Original post was removed.
                </p>
              )}
            </button>
          </>
        ) : (
          <p className="whitespace-pre-wrap">{post.content}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={cn(
              'gap-2',
              isLiked && 'text-red-500 hover:text-red-600'
            )}
          >
            <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />
            {likesCount}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            {comments.length}
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={openRepostComposer} disabled={!currentUserId || loading}>
            <Repeat2 className="h-4 w-4" />
            {post.reposts_count}
          </Button>
        </div>

        {isRepostComposerOpen && currentUserId && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Add a message to your repost</p>
            <Textarea
              placeholder="Write something about this post..."
              value={repostText}
              onChange={(e) => setRepostText(e.target.value)}
              rows={3}
              className="resize-none"
              disabled={loading}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsRepostComposerOpen(false)
                  setRepostText('')
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={submitRepost}
                disabled={loading}
              >
                Repost
              </Button>
            </div>
          </div>
        )}

        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Comments</p>
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={c.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {c.profile?.display_name?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {c.profile?.display_name || 'User'} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </p>
                <p className="text-sm whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))}
          {currentUserId && (
            <div className="flex gap-2 pt-2">
              <Textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                className="min-h-[60px] resize-none"
                disabled={commentSending}
              />
              <Button
                size="icon"
                className="shrink-0 self-end"
                onClick={handleAddComment}
                disabled={!commentText.trim() || commentSending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
