import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bot, User, Send, Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import { ChatConversation } from '@/lib/types'
import { logger } from '@/lib/logger'

type UIMessage = { id: string; role: string; parts?: Array<{ type: string; text?: string }> }

function getMessageText(message: UIMessage): string {
  if (!message.parts || !Array.isArray(message.parts)) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

interface NovaChatPanelProps {
  userId: string
  variant: 'popup' | 'page'
  /** When provided (e.g. from page sidebar), load this conversation when it changes */
  selectedConversationId?: string | null
  onNewChat?: () => void
  onSelectConversation?: (id: string) => void
  /** When a new conversation is created (e.g. first message), call this so parent can update list */
  onConversationCreated?: (conv: ChatConversation) => void
  className?: string
}

export function NovaChatPanel({
  userId,
  variant,
  selectedConversationId,
  onNewChat,
  onSelectConversation,
  onConversationCreated,
  className,
}: NovaChatPanelProps) {
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onFinish: async ({ message, isError }) => {
      if (isError || !conversationIdRef.current) return
      const text = getMessageText(message as UIMessage)
      if (!text) return
      await supabase.from('chat_messages').insert({
        user_id: userId,
        conversation_id: conversationIdRef.current,
        role: 'assistant',
        content: text,
      })
    },
  })

  const conversationIdRef = useRef<string | null>(null)
  conversationIdRef.current = conversationId

  const loadConversations = async () => {
    try {
      const { data } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
      setConversations((data as ChatConversation[]) ?? [])
    } catch (e) {
      logger.error('Load conversations failed', 'NovaChatPanel', e)
      setConversations([])
    } finally {
      setLoadingConvs(false)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [userId])

  const lastLoadedIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (variant === 'page' && selectedConversationId && selectedConversationId !== lastLoadedIdRef.current) {
      lastLoadedIdRef.current = selectedConversationId
      loadConversation(selectedConversationId)
    }
    if (!selectedConversationId) {
      lastLoadedIdRef.current = null
      if (variant === 'page') {
        setConversationId(null)
        setMessages([])
      }
    }
  }, [variant, selectedConversationId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const loadConversation = async (convId: string) => {
    try {
      const { data: chatMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })

      const uiMessages =
        chatMessages?.map((msg, idx) => ({
          id: msg.id || String(idx),
          role: msg.role,
          parts: [{ type: 'text' as const, text: msg.content }],
        })) ?? []

      setMessages(uiMessages)
      setConversationId(convId)
      onSelectConversation?.(convId)
    } catch (e) {
      logger.error('Load conversation failed', 'NovaChatPanel', e)
    }
  }

  const handleNewChat = () => {
    setConversationId(null)
    setMessages([])
    onNewChat?.()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || status === 'streaming' || status === 'submitted') return

    let convId = conversationId
    if (!convId) {
      const { data: newConv } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId,
          title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
        })
        .select()
        .single()
      if (newConv) {
        convId = newConv.id
        setConversationId(convId)
        const newConvTyped = { ...newConv, user_id: userId, created_at: newConv.created_at, updated_at: newConv.updated_at } as ChatConversation
        setConversations((prev) => [newConvTyped, ...prev])
        onConversationCreated?.(newConvTyped)
      }
    }

    if (convId) {
      await supabase.from('chat_messages').insert({
        user_id: userId,
        conversation_id: convId,
        role: 'user',
        content: text,
      })
      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId)
    }

    sendMessage({ text })
    setInput('')
  }

  const isStreaming = status === 'streaming' || status === 'submitted'
  const isPopup = variant === 'popup'

  return (
    <Card className={cn('flex flex-col', isPopup ? 'h-[420px]' : 'flex-1 min-h-0', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="h-5 w-5 shrink-0 text-primary" />
          <span className="font-semibold truncate">Nova</span>
          {isPopup && (
            <>
              <Select
                value={conversationId ?? '__new__'}
                onValueChange={(v) => (v === '__new__' ? handleNewChat() : loadConversation(v))}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Chat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">New chat</SelectItem>
                  {conversations.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="truncate block max-w-[120px]">{c.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleNewChat} className="shrink-0">
          <Plus className="h-4 w-4" />
          {!isPopup && <span className="ml-1">New chat</span>}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-0 min-h-0">
        <div ref={scrollRef} className="flex-1 overflow-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">Ask Nova anything about coding.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {['Explain async/await', 'Debug my code', 'React best practices'].map((s) => (
                  <Button key={s} variant="outline" size="sm" onClick={() => setInput(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs"><Bot className="h-3 w-3" /></AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{getMessageText(msg as UIMessage)}</ReactMarkdown>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs"><User className="h-3 w-3" /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isStreaming && (
                <div className="flex gap-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs"><Bot className="h-3 w-3" /></AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                    <Spinner className="h-3 w-3" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="border-t p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              placeholder="Ask Nova..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={1}
              className="min-h-[36px] resize-none text-sm"
              disabled={isStreaming}
            />
            <Button type="submit" size="icon" disabled={isStreaming} className="shrink-0 h-9 w-9">
              {isStreaming ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
