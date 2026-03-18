import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { Bot, User, Send, Sparkles, MessageSquare, PanelRightClose } from 'lucide-react'
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

export interface WorkspaceContext {
  files: Record<string, string>
  terminalLines: { content: string; type: string }[]
  activePath: string | null
}

export interface WorkspaceChatPanelProps {
  workspaceContext: WorkspaceContext
  onWriteFile: (path: string, content: string) => void
  onRunCommand: (command: string) => void
  onOpenFile?: (path: string) => void
  onCollapse?: () => void
  className?: string
}

/** Parse assistant text for WRITE_FILE and RUN_CMD; return actions and cleaned text for display */
function parseWorkspaceActions(text: string): {
  writeFiles: { path: string; content: string }[]
  runCommands: string[]
  displayText: string
} {
  const writeFiles: { path: string; content: string }[] = []
  const runCommands: string[] = []
  let displayText = text

  // WRITE_FILE path="..." then optional newlines then ```...``` block
  const writeFileBlockRegex = /WRITE_FILE\s+path=(?:"([^"]*)"|'([^']*)')\s*\n([\s\S]*?)(?=\n(?:RUN_CMD|WRITE_FILE)|\n\n|$)/g
  let m: RegExpExecArray | null
  while ((m = writeFileBlockRegex.exec(text)) !== null) {
    const path = (m[1] ?? m[2] ?? '').trim()
    const raw = (m[3] ?? '').trim()
    const codeBlock = raw.match(/```(?:\w*)\n?([\s\S]*?)```/)
    const content = codeBlock ? codeBlock[1].trim() : raw.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim()
    if (path) {
      writeFiles.push({ path, content })
      displayText = displayText.replace(m[0], `*[Wrote to \`${path}\`]*\n\n`)
    }
  }

  const runCmdRegex = /RUN_CMD\s+(.+?)(?=\n(?:RUN_CMD|WRITE_FILE)|\n\n|$)/gs
  while ((m = runCmdRegex.exec(text)) !== null) {
    const cmd = m[1].trim().replace(/\n.*/s, '').trim()
    if (cmd) {
      runCommands.push(cmd)
      displayText = displayText.replace(m[0], `*[Ran: \`${cmd}\`]*\n\n`)
    }
  }

  return { writeFiles, runCommands, displayText }
}

export function WorkspaceChatPanel({
  workspaceContext,
  onWriteFile,
  onRunCommand,
  onOpenFile,
  onCollapse,
  className,
}: WorkspaceChatPanelProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastParsedIdRef = useRef<string | null>(null)
  const contextRef = useRef(workspaceContext)
  contextRef.current = workspaceContext

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat/workspace',
      body: () => ({
        workspaceContext: {
          files: contextRef.current.files,
          terminalLines: contextRef.current.terminalLines.map((l) => l.content),
          activePath: contextRef.current.activePath,
        },
      }),
    }),
    onError: (err) => setError(err.message ?? 'Chat failed'),
  })

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Parse last assistant message for WRITE_FILE / RUN_CMD when stream finishes
  useEffect(() => {
    if (status === 'streaming' || status === 'submitted') return
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant') return
    if (lastParsedIdRef.current === last.id) return
    lastParsedIdRef.current = last.id
    const text = getMessageText(last as UIMessage)
    if (!text) return
    const { writeFiles, runCommands } = parseWorkspaceActions(text)
    writeFiles.forEach(({ path, content }) => {
      onWriteFile(path, content)
      onOpenFile?.(path)
    })
    runCommands.forEach((cmd) => onRunCommand(cmd))
  }, [messages, status, onWriteFile, onRunCommand, onOpenFile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || status === 'streaming' || status === 'submitted') return
    setError(null)
    const ctx = contextRef.current
    sendMessage(
      { text },
      {
        body: {
          workspaceContext: {
            files: ctx.files,
            terminalLines: ctx.terminalLines.map((l) => l.content),
            activePath: ctx.activePath,
          },
        },
      }
    )
    setInput('')
  }

  const isStreaming = status === 'streaming' || status === 'submitted'

  return (
    <div className={cn('flex h-full flex-col border-l border-border bg-background', className)}>
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nova</span>
        </div>
        {onCollapse && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCollapse} title="Close panel">
            <PanelRightClose className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto p-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Sparkles className="h-9 w-9 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">Nova can read your editors and terminal, write code, and run commands.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {['Add a console.log to main.js', 'Run ls in the terminal', 'Explain the active file'].map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => setInput(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const text = getMessageText(msg as UIMessage)
              const { displayText } = parseWorkspaceActions(text)
              return (
                <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        <Bot className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-[90%] rounded-lg px-2.5 py-1.5 text-sm',
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.role === 'user' ? text : displayText}</ReactMarkdown>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="text-xs">
                        <User className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )
            })}
            {isStreaming && (
              <div className="flex gap-2">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    <Bot className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5">
                  <Spinner className="h-3 w-3" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {error && (
        <div className="shrink-0 border-t border-border bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="shrink-0 border-t border-border p-2">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            placeholder="Ask Nova to edit code or run commands..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            className="min-h-[36px] resize-none text-sm"
            disabled={isStreaming}
          />
          <Button type="submit" size="icon" disabled={isStreaming} className="h-9 w-9 shrink-0">
            {isStreaming ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
