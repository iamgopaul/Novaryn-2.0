import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Post } from '@/lib/types'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { formatDistanceToNow } from 'date-fns'
import { Heart, MessageCircle, Repeat2, MoreHorizontal, Send } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PostFeedProps {
  posts: Post[]
  userId?: string
}

export function PostFeed({ posts, userId }: PostFeedProps) {
  if (!posts || posts.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <MessageCircle className="h-12 w-12" />
        </EmptyMedia>
        <EmptyTitle>No posts yet</EmptyTitle>
        <EmptyDescription>Be the first to share something with the community!</EmptyDescription>
      </Empty>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} userId={userId} />
      ))}
    </div>
  )
}

function PostCard({ post, userId }: { post: Post; userId?: string }) {
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [showComments, setShowComments] = useState(false)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleLike = async () => {
    const supabase = createClient()
    
    if (isLiked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', userId)
      
      setIsLiked(false)
      setLikesCount(prev => prev - 1)
    } else {
      await supabase
        .from('post_likes')
        .insert({ post_id: post.id, user_id: userId })
      
      setIsLiked(true)
      setLikesCount(prev => prev + 1)
    }
  }

  const handleRepost = async () => {
    const supabase = createClient()
    
    await supabase.from('posts').insert({
      user_id: userId,
      content: '',
      repost_of: post.id,
    })

  }

  const handleComment = async () => {
    if (!comment.trim()) return
    
    setIsSubmitting(true)
    const supabase = createClient()
    
    await supabase.from('post_comments').insert({
      post_id: post.id,
      user_id: userId,
      content: comment,
    })

    setComment('')
    setIsSubmitting(false)
  }

  const handleDelete = async () => {
    const supabase = createClient()
    await supabase.from('posts').delete().eq('id', post.id)
  }

  const profile = post.profile

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${profile?.username}`}>
              <Avatar>
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>
                  {profile?.display_name?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link 
                to={`/profile/${profile?.username}`}
                className="font-semibold hover:underline"
              >
                {profile?.display_name || 'Anonymous'}
              </Link>
              <p className="text-sm text-muted-foreground">
                @{profile?.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          {post.user_id === userId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <p className="whitespace-pre-wrap">{post.content}</p>
      </CardContent>
      
      <CardFooter className="flex-col gap-3 border-t pt-3">
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={isLiked ? 'text-red-500' : ''}
            >
              <Heart className={`mr-1 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              {likesCount}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="mr-1 h-4 w-4" />
              {post.comments_count}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRepost}>
              <Repeat2 className="mr-1 h-4 w-4" />
              {post.reposts_count}
            </Button>
          </div>
        </div>
        
        {showComments && (
          <div className="flex w-full gap-2">
            <Textarea
              placeholder="Write a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[60px]"
            />
            <Button
              onClick={handleComment}
              disabled={!comment.trim() || isSubmitting}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
