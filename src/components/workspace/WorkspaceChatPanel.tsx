import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/spinner'
import { Bot, User, Send, Sparkles, MessageSquare, PanelRightClose, Check, X, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

type UIMessage = { id: string; role: string; parts?: Array<{ type: string; text?: string }> }

/** Bordered, copyable code block for chat messages */
function ChatCodeBlock({ children, className, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const preRef = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const copyCode = () => {
    const code = preRef.current?.querySelector('code')?.textContent ?? ''
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div className="relative my-2 overflow-hidden rounded-md border border-border bg-muted/50">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-6 w-6 opacity-70 hover:opacity-100"
        onClick={copyCode}
        title={copied ? 'Copied!' : 'Copy code'}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
      <pre
        ref={preRef}
        className={cn('overflow-x-auto p-3 pr-9 text-xs', className)}
        {...props}
      >
        {children}
      </pre>
    </div>
  )
}

/** Inline code: subtle border/background so it’s distinct from prose */
function ChatInlineCode({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      className={cn('rounded border border-border/60 bg-muted/40 px-1 py-0.5 font-mono text-[0.9em]', className)}
      {...props}
    >
      {children}
    </code>
  )
}

function getMessageText(message: UIMessage): string {
  if (message.parts && Array.isArray(message.parts)) {
    const fromParts = message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('')
    if (fromParts) return fromParts
  }
  const anyMsg = message as { content?: string; text?: string }
  return anyMsg.content ?? anyMsg.text ?? ''
}

export interface WorkspaceContext {
  files: Record<string, string>
  terminalLines: { content: string; type: string }[]
  activePath: string | null
}

export interface WorkspaceChatPanelProps {
  workspaceContext: WorkspaceContext
  onWriteFile: (path: string, content: string) => void
  onDeleteFile?: (path: string) => void
  onRunCommand: (command: string) => void
  onOpenFile?: (path: string) => void
  onCollapse?: () => void
  className?: string
}

/** Parse assistant text for WRITE_FILE, DELETE_FILE, and RUN_CMD; return actions and cleaned text for display */
function parseWorkspaceActions(text: string): {
  writeFiles: { path: string; content: string }[]
  deleteFiles: string[]
  runCommands: string[]
  displayText: string
} {
  const writeFiles: { path: string; content: string }[] = []
  const deleteFiles: string[] = []
  const runCommands: string[] = []
  let displayText = text

  // 1) WRITE_FILE path="..." then newline then optional fenced block; capture until closing ``` so code with blank lines is not truncated
  const writeFileBlockRegex = /WRITE_FILE\s+path=(?:"([^"]*)"|'([^']*)'|([^\s\n]+))\s*\n([\s\S]*?```(?:\w*)\n?[\s\S]*?```)/g
  let m: RegExpExecArray | null
  while ((m = writeFileBlockRegex.exec(text)) !== null) {
    const path = (m[1] ?? m[2] ?? m[3] ?? '').trim()
    const raw = (m[4] ?? '').trim()
    const codeBlock = raw.match(/```(?:\w*)\n?([\s\S]*?)```/)
    const content = codeBlock ? codeBlock[1].trim() : raw.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim()
    if (path && content) {
      writeFiles.push({ path, content })
      // Keep the code block visible in chat so the user sees what will be written; only replace the directive with a label
      displayText = displayText.replace(m[0], `**→ Will write to \`${path}\`:**\n\n${raw}\n\n`)
    }
  }

  // 2) Fallback: find fenced code blocks not already captured; associate with a path from preceding text.
  // Never add a fallback write for a path we already have from an explicit WRITE_FILE (that one is the real code; later blocks are often "example output").
  const pathsAlreadyWritten = new Set(writeFiles.map((w) => w.path))
  const alreadyCapturedContent = new Set(writeFiles.map((w) => w.content.trim()))
  const codeBlockRegex = /```(?:\w*)\n?([\s\S]*?)```/g
  let blockMatch: RegExpExecArray | null
  while ((blockMatch = codeBlockRegex.exec(text)) !== null) {
    const content = blockMatch[1].trim()
    if (!content || alreadyCapturedContent.has(content)) continue
    const beforeBlock = text.slice(Math.max(0, blockMatch.index - 400), blockMatch.index)
    const pathFromBefore = extractPathBeforeCodeBlock(beforeBlock)
    if (pathFromBefore && !pathsAlreadyWritten.has(pathFromBefore)) {
      writeFiles.push({ path: pathFromBefore, content })
      pathsAlreadyWritten.add(pathFromBefore)
      alreadyCapturedContent.add(content)
      displayText = displayText.replace(blockMatch[0], `**→ Will write to \`${pathFromBefore}\`:**\n\n${blockMatch[0]}\n\n`)
    }
  }

  // DELETE_FILE path="..." or path='...' or path=unquoted
  const deleteFileRegex = /DELETE_FILE\s+path=(?:"([^"]*)"|'([^']*)'|([^\s\n]+))(?=\s*\n|$)/g
  while ((m = deleteFileRegex.exec(text)) !== null) {
    const path = (m[1] ?? m[2] ?? m[3] ?? '').trim()
    if (path) {
      deleteFiles.push(path)
      displayText = displayText.replace(m[0], `*[Deleted \`${path}\`]*\n\n`)
    }
  }

  // RUN_CMD: capture only the first line so we never include following prose
  const runCmdRegex = /RUN_CMD\s+([^\n]+?)(?=\s*\n|$)/g
  while ((m = runCmdRegex.exec(text)) !== null) {
    const cmd = m[1].trim().replace(/\s*$/, '')
    if (cmd) {
      runCommands.push(cmd)
      displayText = displayText.replace(m[0], `*[Ran: \`${cmd}\`]*\n\n`)
    }
  }

  return { writeFiles, deleteFiles, runCommands, displayText }
}

/** From text that appears before a code block, try to extract a file path (e.g. main.ts, src/utils.js). */
function extractPathBeforeCodeBlock(before: string): string | null {
  const pathInQuotes = before.match(/path\s*=\s*["']([^"']+)["']/i)
  if (pathInQuotes) return pathInQuotes[1].trim()
  const backtickPath = before.match(/`([^`]+\.(ts|tsx|js|jsx|html|css|json|md))`/i)
  if (backtickPath) return backtickPath[1].trim()
  const quotedPath = before.match(/["']([a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|html|css|json|md))["']/g)
  if (quotedPath) {
    const last = quotedPath[quotedPath.length - 1]
    return last.replace(/^["']|["']$/g, '').trim()
  }
  const toFile = before.match(/(?:to|for|in|file)\s+[`"']?([a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|html|css|json|md))[`"']?/gi)
  if (toFile) {
    const last = toFile[toFile.length - 1]
    const pathMatch = last.match(/([a-zA-Z0-9_./-]+\.[a-z]+)/i)
    return pathMatch ? pathMatch[1].trim() : null
  }
  const anyExt = before.match(/\b([a-zA-Z0-9_./-]+\.(ts|tsx|js|jsx|html|css|json|md))\b/g)
  if (anyExt) return anyExt[anyExt.length - 1].trim()
  return null
}

export function WorkspaceChatPanel({
  workspaceContext,
  onWriteFile,
  onDeleteFile,
  onRunCommand,
  onOpenFile,
  onCollapse,
  className,
}: WorkspaceChatPanelProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resolvedMessages, setResolvedMessages] = useState<Record<string, 'accepted' | 'declined'>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
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

  const applyActionsForMessage = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId)
    if (!msg || msg.role !== 'assistant') return
    const text = getMessageText(msg as UIMessage)
    if (!text) return
    const { writeFiles, deleteFiles, runCommands } = parseWorkspaceActions(text)
    deleteFiles.forEach((path) => onDeleteFile?.(path))
    const appliedPaths = new Set<string>()
    writeFiles.forEach(({ path, content }) => {
      if (appliedPaths.has(path)) return
      appliedPaths.add(path)
      onWriteFile(path, content)
      onOpenFile?.(path)
    })
    runCommands.forEach((cmd) => onRunCommand(cmd))
    setResolvedMessages((prev) => ({ ...prev, [messageId]: 'accepted' }))
  }

  const declineActionsForMessage = (messageId: string) => {
    setResolvedMessages((prev) => ({ ...prev, [messageId]: 'declined' }))
  }

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
              const { displayText, writeFiles, deleteFiles, runCommands } = parseWorkspaceActions(text)
              const hasActions = writeFiles.length > 0 || deleteFiles.length > 0 || runCommands.length > 0
              const resolution = resolvedMessages[msg.id]

              return (
                <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        <Bot className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn('flex max-w-[90%] flex-col gap-1.5', msg.role === 'user' ? 'items-end' : 'items-start')}>
                    <div
                      className={cn(
                        'rounded-lg px-2.5 py-1.5 text-sm',
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}
                    >
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            pre: ChatCodeBlock,
                            code: ({ className, ...props }) =>
                              className ? (
                                <code className={className} {...props} />
                              ) : (
                                <ChatInlineCode className={className} {...props} />
                              ),
                          }}
                        >
                          {msg.role === 'user' ? text : displayText}
                        </ReactMarkdown>
                      </div>
                    </div>
                    {msg.role === 'assistant' && hasActions && (
                      <div className="flex items-center gap-2 rounded-md border border-border bg-background/80 px-2 py-1.5 text-xs">
                        {resolution ? (
                          <span
                            className={cn(
                              'font-medium',
                              resolution === 'accepted' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                            )}
                          >
                            {resolution === 'accepted' ? 'Applied' : 'Declined'}
                          </span>
                        ) : (
                          <>
                            <span className="text-muted-foreground">
                              {[
                                writeFiles.length > 0 && `${writeFiles.length} file${writeFiles.length !== 1 ? 's' : ''}`,
                                deleteFiles.length > 0 && `${deleteFiles.length} delete${deleteFiles.length !== 1 ? 's' : ''}`,
                                runCommands.length > 0 && `${runCommands.length} command${runCommands.length !== 1 ? 's' : ''}`,
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-6 gap-1 px-2 text-xs"
                              onClick={() => applyActionsForMessage(msg.id)}
                            >
                              <Check className="h-3 w-3" />
                              Accept
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => declineActionsForMessage(msg.id)}
                            >
                              <X className="h-3 w-3" />
                              Decline
                            </Button>
                          </>
                        )}
                      </div>
                    )}
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
