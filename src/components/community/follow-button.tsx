import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { UserPlus, UserMinus } from 'lucide-react'

interface FollowButtonProps {
  userId?: string
  targetUserId: string
  isFollowing: boolean
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm'
}

export function FollowButton({
  userId,
  targetUserId,
  isFollowing: initialIsFollowing,
  variant = 'outline',
  size = 'sm'
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleFollow = async () => {
    if (!userId) return

    setLoading(true)
    const supabase = createClient()

    try {
      if (isFollowing) {
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', userId)
          .eq('following_id', targetUserId)
        
        setIsFollowing(false)
      } else {
        await supabase.from('followers').insert({
          follower_id: userId,
          following_id: targetUserId,
        })
        
        setIsFollowing(true)
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setLoading(false)
    }
  }

  if (userId === targetUserId) return null

  return (
    <Button
      variant={isFollowing ? 'outline' : variant}
      size={size}
      onClick={handleFollow}
      disabled={loading}
    >
      {loading ? (
        <Spinner className="h-4 w-4" />
      ) : isFollowing ? (
        <>
          <UserMinus className="mr-1 h-3 w-3" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="mr-1 h-3 w-3" />
          Follow
        </>
      )}
    </Button>
  )
}
