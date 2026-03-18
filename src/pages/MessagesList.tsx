import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConversationList } from '@/components/messages/conversation-list'
import { NewConversationDialog } from '@/components/messages/new-conversation-dialog'
import { Mail } from 'lucide-react'

interface Conversation {
  partner: { id: string; username: string | null; display_name: string | null; avatar_url: string | null }
  lastMessage: { content: string; created_at: string; sender_id: string }
  unreadCount: number
}

function buildConversations(
  messages: Array<{ receiver_id: string; sender_id: string; content: string; created_at: string; is_read: boolean }>,
  profilesById: Map<string, Conversation['partner']>,
  currentUserId: string
): Conversation[] {
  const map = new Map<string, Conversation>()
  messages.forEach((msg) => {
    const isReceiver = msg.receiver_id === currentUserId
    const partnerId = isReceiver ? msg.sender_id : msg.receiver_id
    const partner = profilesById.get(partnerId)
    if (!partner) return
    if (!map.has(partner.id)) {
      map.set(partner.id, {
        partner,
        lastMessage: { content: msg.content, created_at: msg.created_at, sender_id: msg.sender_id },
        unreadCount: isReceiver && !msg.is_read ? 1 : 0,
      })
    } else if (isReceiver && !msg.is_read) {
      const c = map.get(partner.id)!
      c.unreadCount++
    }
  })
  return Array.from(map.values())
}

export function MessagesList() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const { data: messages } = await supabase
      .from('private_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    const partnerIds = Array.from(
      new Set(
        (messages || []).map((m: { sender_id: string; receiver_id: string }) =>
          m.sender_id === user.id ? m.receiver_id : m.sender_id
        )
      )
    ).filter(Boolean)
    const { data: profiles } = partnerIds.length
      ? await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', partnerIds)
      : { data: [] as Conversation['partner'][] }
    const profileMap = new Map((profiles as Conversation['partner'][] | null | undefined)?.map((p) => [p.id, p]) ?? [])
    setConversations(buildConversations((messages as any[]) || [], profileMap, user.id))
  }

  const loadRef = useRef(loadConversations)
  loadRef.current = loadConversations

  useEffect(() => {
    loadRef.current()
  }, [])

  // Real-time: new or updated messages refresh conversation list
  useEffect(() => {
    const channel = supabase
      .channel('messages-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'private_messages' },
        () => {
          loadRef.current()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (!currentUserId) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">Private conversations with other developers</p>
        </div>
        <NewConversationDialog currentUserId={currentUserId} />
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.length > 0 ? (
            <ConversationList conversations={conversations} currentUserId={currentUserId} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No messages yet</h3>
              <p className="mt-1 text-center text-sm text-muted-foreground">Start a conversation with another developer</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
