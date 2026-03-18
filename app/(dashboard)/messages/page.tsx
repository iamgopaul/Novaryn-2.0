import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConversationList } from '@/components/messages/conversation-list'
import { NewConversationDialog } from '@/components/messages/new-conversation-dialog'
import { Mail } from 'lucide-react'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get conversations - messages where user is sender or receiver
  const { data: messages } = await supabase
    .from('private_messages')
    .select(`
      *,
      sender:profiles!private_messages_sender_id_fkey (
        id, username, display_name, avatar_url
      ),
      receiver:profiles!private_messages_receiver_id_fkey (
        id, username, display_name, avatar_url
      )
    `)
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  // Group messages by conversation partner
  const conversationsMap = new Map<string, {
    partner: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }
    lastMessage: typeof messages extends (infer T)[] ? T : never
    unreadCount: number
  }>()

  messages?.forEach((msg) => {
    const isReceiver = msg.receiver_id === user.id
    const partner = isReceiver ? msg.sender : msg.receiver
    
    if (!partner) return

    if (!conversationsMap.has(partner.id)) {
      conversationsMap.set(partner.id, {
        partner,
        lastMessage: msg,
        unreadCount: isReceiver && !msg.is_read ? 1 : 0,
      })
    } else if (isReceiver && !msg.is_read) {
      const conv = conversationsMap.get(partner.id)!
      conv.unreadCount++
    }
  })

  const conversations = Array.from(conversationsMap.values())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Private conversations with other developers
          </p>
        </div>
        <NewConversationDialog currentUserId={user.id} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.length > 0 ? (
            <ConversationList conversations={conversations} currentUserId={user.id} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No messages yet</h3>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                Start a conversation with another developer
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
