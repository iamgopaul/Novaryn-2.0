import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Bot, User, Send, Trash2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

type UIMessage = { id: string; role: string; parts?: Array<{ type: string; text?: string }> }

function getMessageText(message: UIMessage): string {
  if (!message.parts || !Array.isArray(message.parts)) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function ChatbotPage() {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || status === 'streaming') return
    sendMessage({ text })
    setInput('')
  }

  const isStreaming = status === 'streaming' || status === 'submitted'

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <Badge variant="secondary" className="ml-2">
            <Sparkles className="mr-1 h-3 w-3" />Powered by AI
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => setMessages([])} disabled={messages.length === 0}>
          <Trash2 className="mr-2 h-4 w-4" />Clear Chat
        </Button>
      </div>
      <Card className="flex flex-1 flex-col">
        <CardContent className="flex flex-1 flex-col p-0">
          <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Bot className="h-16 w-16 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">Welcome to Novaryn AI</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  I&apos;m your coding assistant. Ask me anything about programming, debugging, best practices, or documentation.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {['Explain async/await', 'Debug my code', 'Best practices for React', 'Write a TypeScript function'].map((suggestion) => (
                    <Button key={suggestion} variant="outline" size="sm" onClick={() => setInput(suggestion)}>{suggestion}</Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn('max-w-[80%] rounded-lg px-4 py-2', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{getMessageText(message as UIMessage)}</ReactMarkdown>
                    </div>
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            {isStreaming && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                  <Spinner className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Textarea placeholder="Ask me anything about coding..." value={input} onChange={(e) => setInput(e.target.value)} rows={1} className="min-h-[40px] resize-none" disabled={isStreaming} />
              <Button type="submit" disabled={isStreaming}>
                {isStreaming ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
