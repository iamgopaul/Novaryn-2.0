import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Post } from '@/lib/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { Heart, MessageCircle, Repeat2, MoreHorizontal, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface PostCardProps {
  post: Post & { profile?: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } }
  currentUserId?: string
}

export function PostCard({ post, currentUserId }: PostCardProps) {
  const navigate = useNavigate()
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const isOwner = currentUserId === post.user_id
  const profile = post.profile

  const handleLike = async () => {
    if (loading || !currentUserId) return
    setLoading(true)

    if (isLiked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
      setIsLiked(false)
      setLikesCount(prev => Math.max(0, prev - 1))
    } else {
      await supabase.from('post_likes').insert({
        post_id: post.id,
        user_id: currentUserId,
      })
      setIsLiked(true)
      setLikesCount(prev => prev + 1)
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
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/community/profile/${profile?.username || post.user_id}`}>
              <Avatar>
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {profile?.display_name?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link
                to={`/community/profile/${profile?.username || post.user_id}`}
                className="font-medium hover:underline"
              >
                {profile?.display_name || 'Unknown User'}
              </Link>
              <p className="text-sm text-muted-foreground">
                @{profile?.username || 'unknown'} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
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
        <p className="whitespace-pre-wrap">{post.content}</p>

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
            {likesCount > 0 && likesCount}
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            {post.comments_count > 0 && post.comments_count}
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <Repeat2 className="h-4 w-4" />
            {post.reposts_count > 0 && post.reposts_count}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
