'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { Bot, Send, User, Sparkles } from 'lucide-react'

interface ChatInterfaceProps {
  userId?: string
}

export function ChatInterface({ userId }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ 
      api: '/api/chat',
      body: { conversationId }
    }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Load conversation from URL param
  useEffect(() => {
    const convId = searchParams.get('conversation')
    if (convId && convId !== conversationId) {
      loadConversation(convId)
    }
  }, [searchParams])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const loadConversation = async (convId: string) => {
    const supabase = createClient()
    const { data: chatMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    if (chatMessages) {
      const uiMessages = chatMessages.map((msg, idx) => ({
        id: msg.id || String(idx),
        role: msg.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: msg.content }],
      }))
      setMessages(uiMessages)
      setConversationId(convId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !userId) return

    // Create conversation if it doesn't exist
    let convId = conversationId
    if (!convId) {
      const supabase = createClient()
      const { data: newConv } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId,
          title: input.slice(0, 50) + (input.length > 50 ? '...' : ''),
          model: 'groq/llama-3.3-70b-versatile',
        })
        .select()
        .single()

      if (newConv) {
        convId = newConv.id
        setConversationId(convId)
      }
    }

    sendMessage({ text: input }, { body: { conversationId: convId } })
    setInput('')
  }

  const handleNewChat = () => {
    setMessages([])
    setConversationId(null)
    router.push('/chatbot')
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="border-b py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-primary" />
            Nova AI Assistant
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleNewChat}>
            <Sparkles className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="h-16 w-16 text-primary/50" />
            <h3 className="mt-4 text-lg font-semibold">How can I help you today?</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Ask me anything about coding, debugging, architecture, or best practices. 
              I&apos;m here to help!
            </p>
            <div className="mt-6 grid gap-2 text-sm">
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => setInput('How do I implement authentication in Next.js?')}
              >
                How do I implement authentication in Next.js?
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => setInput('Explain the difference between useMemo and useCallback')}
              >
                Explain useMemo vs useCallback
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => setInput('Help me debug this error: Cannot read property of undefined')}
              >
                Help me debug an undefined error
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.parts.map((part, index) => {
                    if (part.type === 'text') {
                      return (
                        <div key={index} className="whitespace-pre-wrap text-sm">
                          {part.text}
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-secondary">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                  <Spinner className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <CardContent className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            placeholder="Ask Nova anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="self-end"
          >
            {isLoading ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
