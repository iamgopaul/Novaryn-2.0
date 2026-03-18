import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft } from 'lucide-react'
import { MessageThread } from '@/components/messages/message-thread'

interface PrivateMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

export function Conversation() {
  const { userId } = useParams<{ userId: string }>()
  const [partner, setPartner] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<PrivateMessage[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const messageIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const { data: partnerData, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error || !partnerData) { setNotFound(true); setLoading(false); return }
      setPartner(partnerData as Profile)

      const { data: messagesData } = await supabase
        .from('private_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
      const list = (messagesData as PrivateMessage[]) || []
      setMessages(list)
      messageIdsRef.current = new Set(list.map((m) => m.id))

      await supabase.from('private_messages').update({ is_read: true }).eq('receiver_id', user.id).eq('sender_id', userId)
      setLoading(false)
    }
    load()
  }, [userId])

  // Real-time: new messages in this thread
  useEffect(() => {
    if (!userId || !currentUserId) return
    const channel = supabase
      .channel(`conversation-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages' },
        async (payload) => {
          const row = payload.new as PrivateMessage
          const isInThread =
            (row.sender_id === currentUserId && row.receiver_id === userId) ||
            (row.sender_id === userId && row.receiver_id === currentUserId)
          if (!isInThread || messageIdsRef.current.has(row.id)) return
          messageIdsRef.current.add(row.id)
          setMessages((prev) => [...prev, row])
          if (row.receiver_id === currentUserId) {
            await supabase.from('private_messages').update({ is_read: true }).eq('id', row.id)
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, currentUserId])

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
  if (notFound || !partner || !currentUserId) return <div className="space-y-4"><h1 className="text-2xl font-bold">Conversation not found</h1><Link to="/messages" className="text-primary hover:underline">Back to messages</Link></div>

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col space-y-4">
      <Link to="/messages" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Back to messages
      </Link>
      <Card className="flex flex-1 flex-col">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={partner.avatar_url || undefined} />
              <AvatarFallback>{partner.display_name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{partner.display_name || 'Unknown User'}</CardTitle>
              <p className="text-sm text-muted-foreground">@{partner.username || 'unknown'}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col p-0">
          <MessageThread
          messages={messages}
          currentUserId={currentUserId}
          partnerId={userId!}
          onMessageSent={(msg) => {
            if (messageIdsRef.current.has(msg.id)) return
            messageIdsRef.current.add(msg.id)
            setMessages((prev) => [...prev, msg])
          }}
        />
        </CardContent>
      </Card>
    </div>
  )
}
