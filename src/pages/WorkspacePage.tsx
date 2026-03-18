import { useState, useRef, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from 'next-themes'
import { Play, Copy, Download, Terminal as TerminalIcon, Trash2, GripVertical } from 'lucide-react'
import { logger } from '@/lib/logger'

const defaultCode = `// Novaryn Workspace – edit and run here
function greet(name) {
  return \`Hello, \${name}! Welcome to Novaryn.\`;
}
console.log(greet('Developer'));
`

const languages = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'sql', label: 'SQL' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
]

const shells = [
  { value: 'bash', label: 'Bash', prompt: '$ ' },
  { value: 'zsh', label: 'Zsh', prompt: '% ' },
  { value: 'sh', label: 'Shell', prompt: '$ ' },
  { value: 'wsl', label: 'WSL', prompt: 'user@novaryn:~$ ' },
  { value: 'sudo', label: 'Sudo', prompt: '# ' },
]

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

export function WorkspacePage() {
  const { resolvedTheme } = useTheme()
  const [code, setCode] = useState(defaultCode)
  const [language, setLanguage] = useState('typescript')
  const [shell, setShell] = useState('bash')
  const [editorHeightPercent, setEditorHeightPercent] = useState(60)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const shellConfig = shells.find((s) => s.value === shell) || shells[0]
  const prompt = shellConfig.prompt

  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { type: 'output', content: `Novaryn Workspace – Terminal (${shellConfig.label})\nType "help" for commands.\n`, timestamp: new Date() },
  ])
  const [terminalInput, setTerminalInput] = useState('')
  const [terminalHistory, setTerminalHistory] = useState<string[]>([])
  const [terminalHistoryIndex, setTerminalHistoryIndex] = useState(-1)
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight
  }, [terminalLines])

  const appendTerminal = useCallback((type: TerminalLine['type'], content: string) => {
    setTerminalLines((prev) => [...prev, { type, content, timestamp: new Date() }])
  }, [])

  const executeCommand = useCallback(
    (cmd: string) => {
      const args = cmd.trim().split(' ')
      const command = args[0].toLowerCase()
      const params = args.slice(1).join(' ')
      let output: string
      let isError = false
      switch (command) {
        case '':
          return
        case 'help':
          output = helpText
          break
        case 'clear':
          setTerminalLines([])
          return
        case 'echo':
          output = params || ''
          break
        case 'date':
          output = new Date().toString()
          break
        case 'whoami':
          output = shell === 'sudo' ? 'root' : 'novaryn-developer'
          break
        case 'pwd':
          output = shell === 'wsl' ? '/home/user/workspace' : '/home/novaryn/workspace'
          break
        case 'ls':
          output = 'projects/  tools/  snippets/  README.md  package.json'
          break
        case 'env':
          output = `SHELL=${shell}\nNODE_ENV=development\nNOVARYN_VERSION=1.0.0\nTERM=xterm-256color`
          break
        case 'version':
          output = 'Novaryn Developer Hub v1.0.0'
          break
        default:
          output = `Command not found: ${command}. Type "help" for available commands.`
          isError = true
      }
      setTerminalLines((prev) => [
        ...prev,
        { type: 'input', content: `${prompt}${cmd}`, timestamp: new Date() },
        { type: isError ? 'error' : 'output', content: output, timestamp: new Date() },
      ])
    },
    [prompt, shell]
  )

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (terminalInput.trim()) {
      setTerminalHistory((prev) => [...prev, terminalInput])
      setTerminalHistoryIndex(-1)
    }
    executeCommand(terminalInput)
    setTerminalInput('')
  }

  const handleTerminalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (terminalHistory.length > 0) {
        const newIndex = terminalHistoryIndex < terminalHistory.length - 1 ? terminalHistoryIndex + 1 : terminalHistoryIndex
        setTerminalHistoryIndex(newIndex)
        setTerminalInput(terminalHistory[terminalHistory.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (terminalHistoryIndex > 0) {
        const newIndex = terminalHistoryIndex - 1
        setTerminalHistoryIndex(newIndex)
        setTerminalInput(terminalHistory[terminalHistory.length - 1 - newIndex] || '')
      } else {
        setTerminalHistoryIndex(-1)
        setTerminalInput('')
      }
    }
  }

  const handleRun = () => {
    try {
      if (language === 'javascript' || language === 'typescript') {
        const logs: string[] = []
        const captureLog = (...args: unknown[]) => {
          logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '))
        }
        try {
          const run = new Function(
            'console',
            `
            const __log = console.log;
            try {
              ${code}
            } finally {
              console.log = __log;
            }
          `
          )
          run({ ...console, log: captureLog })
          appendTerminal('output', logs.join('\n') || '(no output)')
        } catch (e: unknown) {
          logger.debug('Workspace run: user code threw', 'WorkspacePage', e)
          appendTerminal('error', `Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      } else {
        appendTerminal('output', `Running ${language} code requires a backend runtime.`)
      }
    } catch (e: unknown) {
      logger.error('Workspace run failed', 'WorkspacePage', e)
      appendTerminal('error', `Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    appendTerminal('output', 'Code copied to clipboard.')
  }

  const handleDownload = () => {
    const ext = language === 'typescript' ? 'ts' : language === 'javascript' ? 'js' : language
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workspace.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    appendTerminal('output', `Downloaded workspace.${ext}`)
  }

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current || !isDragging) return
      const rect = containerRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top
      const pct = Math.min(90, Math.max(20, (y / rect.height) * 100))
      setEditorHeightPercent(pct)
    },
    [isDragging]
  )

  const handleResizeEnd = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    if (!isDragging) return
    window.addEventListener('mousemove', handleResizeMove)
    window.addEventListener('mouseup', handleResizeEnd)
    return () => {
      window.removeEventListener('mousemove', handleResizeMove)
      window.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [isDragging, handleResizeMove, handleResizeEnd])

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Editor</span>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleCopy} title="Copy code">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} title="Download">
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleRun}>
            <Play className="mr-2 h-4 w-4" />
            Run
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Terminal</span>
          <Select value={shell} onValueChange={setShell}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {shells.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setTerminalLines([])} title="Clear terminal">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Editor + Terminal split */}
      <div ref={containerRef} className="relative flex-1 flex flex-col min-h-0">
        {/* Editor panel */}
        <div style={{ height: `${editorHeightPercent}%` }} className="min-h-[120px] border-b overflow-hidden">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12 },
            }}
          />
        </div>

        {/* Resize handle */}
        <div
          role="separator"
          aria-label="Resize panels"
          onMouseDown={() => setIsDragging(true)}
          className={`flex h-2 shrink-0 cursor-ns-resize items-center justify-center border-b bg-muted/50 hover:bg-muted ${isDragging ? 'bg-muted' : ''}`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Terminal panel */}
        <div className="flex min-h-[140px] flex-1 flex-col overflow-hidden bg-zinc-950">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-1.5">
            <TerminalIcon className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-zinc-400">{shellConfig.label}</span>
          </div>
          <div
            ref={terminalRef}
            className="flex-1 overflow-auto p-4 font-mono text-sm text-green-400"
            onClick={() => terminalInputRef.current?.focus()}
          >
            {terminalLines.map((line, i) => (
              <div
                key={i}
                className={
                  line.type === 'error'
                    ? 'text-red-400'
                    : line.type === 'input'
                      ? 'text-cyan-400'
                      : 'text-green-400'
                }
              >
                <pre className="whitespace-pre-wrap">{line.content}</pre>
              </div>
            ))}
            <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2">
              <span className="text-cyan-400">{prompt}</span>
              <input
                ref={terminalInputRef}
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={handleTerminalKeyDown}
                className="min-w-[200px] flex-1 bg-transparent text-green-400 outline-none"
                autoFocus
                spellCheck={false}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
