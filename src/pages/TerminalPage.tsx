import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Terminal as TerminalIcon, Trash2 } from 'lucide-react'

interface TerminalLine {
  type: 'input' | 'output' | 'error'
  content: string
  timestamp: Date
}

const helpText = `Available commands:
  help     - Show this help message
  clear    - Clear terminal
  echo     - Print text
  date     - Show current date/time
  whoami   - Show current user
  pwd      - Print working directory
  ls       - List files (simulated)
  env      - Show environment variables (simulated)
  version  - Show Novaryn version`

export function TerminalPage() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'output', content: 'Welcome to Novaryn Terminal v1.0.0', timestamp: new Date() },
    { type: 'output', content: 'Type "help" for available commands.\n', timestamp: new Date() },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight
  }, [lines])

  const executeCommand = (cmd: string) => {
    const args = cmd.trim().split(' ')
    const command = args[0].toLowerCase()
    const params = args.slice(1).join(' ')
    let output: string
    let isError = false
    switch (command) {
      case '': return
      case 'help': output = helpText; break
      case 'clear': setLines([]); return
      case 'echo': output = params || ''; break
      case 'date': output = new Date().toString(); break
      case 'whoami': output = 'novaryn-developer'; break
      case 'pwd': output = '/home/novaryn/workspace'; break
      case 'ls': output = 'projects/  tools/  snippets/  README.md  package.json'; break
      case 'env': output = 'NODE_ENV=development\nNOVARYN_VERSION=1.0.0\nTERM=xterm-256color'; break
      case 'version': output = 'Novaryn Developer Hub v1.0.0'; break
      default: output = `Command not found: ${command}. Type "help" for available commands.`; isError = true
    }
    setLines(prev => [...prev, { type: 'input', content: `$ ${cmd}`, timestamp: new Date() }, { type: isError ? 'error' : 'output', content: output, timestamp: new Date() }])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) { setHistory(prev => [...prev, input]); setHistoryIndex(-1) }
    executeCommand(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setInput(history[history.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(history[history.length - 1 - newIndex] || '')
      } else { setHistoryIndex(-1); setInput('') }
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Terminal</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLines([])}><Trash2 className="mr-2 h-4 w-4" />Clear</Button>
      </div>
      <Card className="flex-1">
        <CardContent className="flex h-full flex-col p-0">
          <div ref={terminalRef} className="flex-1 overflow-auto bg-zinc-950 p-4 font-mono text-sm text-green-400" onClick={() => inputRef.current?.focus()}>
            {lines.map((line, i) => (
              <div key={i} className={line.type === 'error' ? 'text-red-400' : line.type === 'input' ? 'text-cyan-400' : 'text-green-400'}>
                <pre className="whitespace-pre-wrap">{line.content}</pre>
              </div>
            ))}
            <form onSubmit={handleSubmit} className="flex items-center">
              <span className="text-cyan-400 mr-2">$</span>
              <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} className="flex-1 bg-transparent text-green-400 outline-none" autoFocus />
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
