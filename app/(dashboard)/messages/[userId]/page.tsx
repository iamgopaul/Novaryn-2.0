import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft } from 'lucide-react'
import { MessageThread } from '@/components/messages/message-thread'

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get partner profile
  const { data: partner, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !partner) {
    notFound()
  }

  // Get messages between users
  const { data: messages } = await supabase
    .from('private_messages')
    .select('*')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true })

  // Mark messages as read
  await supabase
    .from('private_messages')
    .update({ is_read: true })
    .eq('receiver_id', user.id)
    .eq('sender_id', userId)

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col space-y-4">
      <Link
        href="/messages"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to messages
      </Link>

      <Card className="flex flex-1 flex-col">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={partner.avatar_url || undefined} />
              <AvatarFallback>
                {partner.display_name?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{partner.display_name || 'Unknown User'}</CardTitle>
              <p className="text-sm text-muted-foreground">@{partner.username || 'unknown'}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col p-0">
          <MessageThread
            messages={messages || []}
            currentUserId={user.id}
            partnerId={userId}
          />
        </CardContent>
      </Card>
    </div>
  )
}
