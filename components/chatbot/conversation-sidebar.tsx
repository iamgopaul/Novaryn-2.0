'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChatConversation } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { History, MessageSquare, Plus, Trash2 } from 'lucide-react'

interface ConversationSidebarProps {
  conversations: ChatConversation[]
  userId?: string
}

export function ConversationSidebar({ conversations, userId }: ConversationSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentConvId = searchParams.get('conversation')

  const handleNewChat = () => {
    router.push('/chatbot')
  }

  const handleSelectConversation = (convId: string) => {
    router.push(`/chatbot?conversation=${convId}`)
  }

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const supabase = createClient()
    
    // Delete messages first
    await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', convId)
    
    // Then delete conversation
    await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', convId)
    
    // If this was the current conversation, redirect
    if (convId === currentConvId) {
      router.push('/chatbot')
    } else {
      router.refresh()
    }
  }

  return (
    <Card className="w-72 shrink-0">
      <CardHeader className="border-b py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            History
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleNewChat}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-14rem)]">
          {conversations.length > 0 ? (
            <div className="space-y-1 p-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`group flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors ${
                    currentConvId === conv.id
                      ? 'bg-primary/10'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="truncate text-sm font-medium">{conv.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No conversations yet</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
