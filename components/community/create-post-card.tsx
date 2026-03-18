'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { ImagePlus, Send } from 'lucide-react'

export function CreatePostCard() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    if (!content.trim()) return

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      await supabase.from('posts').insert({
        user_id: user.id,
        content: content.trim(),
      })

      setContent('')
      router.refresh()
    } catch (error) {
      console.error('Error creating post:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Textarea
          placeholder="What's on your mind? Share code tips, project updates, or ask questions..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px] resize-none border-0 p-0 text-base focus-visible:ring-0"
        />
        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled>
              <ImagePlus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
          >
            {loading ? <Spinner className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
            Post
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
