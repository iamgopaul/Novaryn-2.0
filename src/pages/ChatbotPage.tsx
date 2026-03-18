import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { ConversationSidebar } from '@/components/chatbot/conversation-sidebar'
import { NovaChatPanel } from '@/components/chatbot/nova-chat-panel'
import { ChatConversation } from '@/lib/types'

export function ChatbotPage() {
  const [user, setUser] = useState<User | null>(null)
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [searchParams] = useSearchParams()
  const selectedFromUrl = searchParams.get('conversation')
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u ?? null)
      if (!u) return
      const { data } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', u.id)
        .order('updated_at', { ascending: false })
      setConversations((data as ChatConversation[]) ?? [])
    }
    init()
  }, [])

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const effectiveSelectedId = useMemo(
    () => selectedFromUrl ?? conversations[0]?.id ?? null,
    [selectedFromUrl, conversations]
  )

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      <ConversationSidebar
        conversations={conversations}
        userId={user.id}
        onDelete={(convId) => setConversations((prev) => prev.filter((c) => c.id !== convId))}
      />
      <div className="flex-1 min-w-0">
        <NovaChatPanel
          userId={user.id}
          variant="page"
          selectedConversationId={effectiveSelectedId}
          onConversationCreated={(conv) => setConversations((prev) => [conv, ...prev])}
          className="h-full"
        />
      </div>
    </div>
  )
}
