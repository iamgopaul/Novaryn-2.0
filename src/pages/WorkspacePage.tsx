import { useState, useRef, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from 'next-themes'
import { Play, Copy, Download, Terminal as TerminalIcon, Trash2, GripVertical, Package, FolderOpen, FileCode, Search, GitBranch, Puzzle, X, MessageSquare, FilePlus, PlayCircle, MoreHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { logger } from '@/lib/logger'
import { WorkspaceChatPanel } from '@/components/workspace/WorkspaceChatPanel'

const STORAGE_KEY = 'novaryn_workspace'
const WORKSPACE_FILES_KEY = 'novaryn_workspace_files'

const DEFAULT_WORKSPACE_FILES: Record<string, string> = {
  'main.js': `// Novaryn Workspace
function greet(name) {
  return \`Hello, \${name}!\`;
}
console.log(greet('Developer'));`,
  'index.html': '<!DOCTYPE html>\n<html>\n<head><title>App</title></head>\n<body>\n  <h1>Hello</h1>\n</body>\n</html>',
  'style.css': '/* Styles */\nbody { font-family: system-ui; }\n',
  'src/utils.js': '// Utils\nexport function add(a, b) { return a + b; }\n',
}

function getExtension(path: string): string {
  const i = path.lastIndexOf('.')
  return i >= 0 ? path.slice(i + 1) : ''
}

const EXT_TO_LANGUAGE: Record<string, string> = {
  js: 'javascript', ts: 'typescript', py: 'python', cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
  java: 'java', cs: 'csharp', go: 'go', rs: 'rust', html: 'html', css: 'css',
  json: 'json', md: 'markdown', sql: 'sql',
}

function getLanguageFromPath(path: string): string {
  return EXT_TO_LANGUAGE[getExtension(path)] ?? 'plaintext'
}

type FileTreeNode = { name: string; path?: string; children?: FileTreeNode[] }

type InternalNode = { name: string; path?: string; children?: Map<string, InternalNode> }

function pathToTree(files: Record<string, string>): { name: string; children?: FileTreeNode[] } {
  const root: { name: string; children: Map<string, InternalNode> } = { name: 'WORKSPACE', children: new Map() }
  for (const path of Object.keys(files).sort()) {
    const parts = path.split('/')
    let current = root.children
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      if (isFile) {
        current.set(path, { name: part, path })
      } else {
        if (!current.has(part)) current.set(part, { name: part, children: new Map() })
        const next = (current.get(part) as InternalNode).children
        if (next) current = next
      }
    }
  }
  function mapToArr(m: Map<string, InternalNode>): FileTreeNode[] {
    return Array.from(m.entries()).map(([_, v]) => ({
      name: v.name,
      path: v.path,
      children: v.children ? mapToArr(v.children) : undefined,
    }))
  }
  return { name: root.name, children: mapToArr(root.children) }
}

const defaultByLanguage: Record<string, string> = {
  typescript: `// Novaryn Workspace – TypeScript (transpiled and run in browser)
function greet(name: string): string {
  return \`Hello, \${name}! Welcome to Novaryn.\`;
}
console.log(greet('Developer'));`,
  javascript: `// Novaryn Workspace – edit and run here
function greet(name) {
  return \`Hello, \${name}! Welcome to Novaryn.\`;
}
console.log(greet('Developer'));`,
  python: '# Novaryn Workspace – Python (run in browser via Pyodide)\ndef greet(name):\n    return f"Hello, {name}! Welcome to Novaryn."\n\nprint(greet("Developer"))',
  cpp: '#include <iostream>\nint main() {\n  std::cout << "Hello, Novaryn!" << std::endl;\n  return 0;\n}',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, Novaryn!");\n  }\n}',
  html: '<!DOCTYPE html>\n<html>\n<head><title>Workspace</title></head>\n<body>\n  <h1>Hello, Novaryn!</h1>\n</body>\n</html>',
  css: '/* Novaryn Workspace */\nbody { font-family: system-ui; }\nh1 { color: #333; }\n',
  json: '{\n  "message": "Hello, Novaryn!"\n}\n',
  markdown: '# Novaryn Workspace\n\nEdit and **download** to use elsewhere.\n',
  sql: '-- Novaryn Workspace\nSELECT 1 AS hello;',
  rust: 'fn main() {\n    println!("Hello, Novaryn!");\n}',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, Novaryn!")\n}\n',
  csharp: 'using System;\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello, Novaryn!");\n  }\n}',
}

// Piston API: map our language id to Piston language + filename
const PISTON_LANG: Record<string, { piston: string; filename: string }> = {
  cpp: { piston: 'c++', filename: 'main.cpp' },
  java: { piston: 'java', filename: 'Main.java' },
  python: { piston: 'python', filename: 'main.py' },
  rust: { piston: 'rust', filename: 'main.rs' },
  go: { piston: 'go', filename: 'main.go' },
  csharp: { piston: 'csharp', filename: 'main.cs' },
  javascript: { piston: 'javascript', filename: 'main.js' },
  typescript: { piston: 'typescript', filename: 'main.ts' },
}

async function runViaPiston(
  langKey: string,
  code: string,
  onOutput: (out: string) => void,
  onError: (err: string) => void
): Promise<void> {
  const mapped = PISTON_LANG[langKey]
  if (!mapped) {
    onError(`No runner for ${langKey}. Use Download to run locally.`)
    return
  }
  try {
    const res = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: mapped.piston,
        version: '*',
        files: [{ name: mapped.filename, content: code }],
      }),
    })
    if (!res.ok) {
      onError(`API error: ${res.status}. Try again or use Download.`)
      return
    }
    const data = await res.json()
    const run = data.run
    const compile = data.compile
    if (compile?.stderr) onError(`Compile: ${compile.stderr}`)
    if (run?.stderr) onError(run.stderr)
    if (run?.stdout) onOutput(run.stdout)
    else if (!compile?.stderr && !run?.stderr) onOutput('(no output)')
  } catch (e) {
    onError(`Network error: ${e instanceof Error ? e.message : 'Unknown'}. Use Download to run locally.`)
  }
}

function getStoredCode(lang: string): string | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${lang}`)
    return raw
  } catch {
    return null
  }
}

function setStoredCode(lang: string, value: string): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${lang}`, value)
  } catch {
    // quota or disabled
  }
}

const languages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'sql', label: 'SQL' },
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
  const [code, setCode] = useState(() => {
    const stored = getStoredCode('typescript')
    return stored ?? defaultByLanguage.typescript
  })
  const [language, setLanguage] = useState('typescript')
  const [runLoading, setRunLoading] = useState(false)
  const [pythonPackages, setPythonPackages] = useState('')
  const [shell, setShell] = useState('bash')

  const [workspaceFiles, setWorkspaceFiles] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(WORKSPACE_FILES_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>
        if (typeof parsed === 'object' && parsed !== null) return parsed
      }
    } catch (_) {}
    return { ...DEFAULT_WORKSPACE_FILES }
  })
  const [openTabs, setOpenTabs] = useState<{ id: string; path: string }[]>([{ id: 'main.js', path: 'main.js' }])
  const [activeTabId, setActiveTabId] = useState<string | null>('main.js')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [activePanel, setActivePanel] = useState<'terminal' | 'output' | 'problems'>('terminal')
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [chatPanelOpen, setChatPanelOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [chatPanelWidth, setChatPanelWidth] = useState(340)
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)
  const [isResizingChat, setIsResizingChat] = useState(false)
  const workspaceSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (workspaceSaveTimeoutRef.current) clearTimeout(workspaceSaveTimeoutRef.current)
    workspaceSaveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(WORKSPACE_FILES_KEY, JSON.stringify(workspaceFiles))
      } catch (_) {}
    }, 600)
    return () => {
      if (workspaceSaveTimeoutRef.current) clearTimeout(workspaceSaveTimeoutRef.current)
    }
  }, [workspaceFiles])

  const activePath = openTabs.find((t) => t.id === activeTabId)?.path ?? null
  const activeFileContent = activePath ? (workspaceFiles[activePath] ?? '') : ''
  const activeLanguage = activePath ? getLanguageFromPath(activePath) : language

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pyodideRef = useRef<{
    runPythonAsync: (code: string) => Promise<void>
    loadPackage: (name: string) => Promise<void>
    setStdout: (opts: { write: (s: string) => void }) => void
    setStderr: (opts: { write: (s: string) => void }) => void
  } | null>(null)

  const handleLanguageChange = useCallback((newLang: string) => {
    setStoredCode(language, code)
    setCode(getStoredCode(newLang) ?? defaultByLanguage[newLang] ?? defaultByLanguage.javascript)
    setLanguage(newLang)
  }, [language, code])

  // Persist code to storage (debounced)
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => setStoredCode(language, code), 800)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [code, language])
  const [editorHeightPercent, setEditorHeightPercent] = useState(60)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const monacoRef = useRef<Parameters<NonNullable<React.ComponentProps<typeof Editor>['onMount']>>[0] | null>(null)

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

  const runCode = activePath ? activeFileContent : code
  const runLanguage = activePath ? activeLanguage : language

  const openFile = useCallback((path: string) => {
    const id = path
    setOpenTabs((prev) => (prev.some((t) => t.id === id) ? prev : [...prev, { id, path }]))
    setActiveTabId(id)
  }, [])
  const closeTab = useCallback((id: string) => {
    const nextTabs = openTabs.filter((t) => t.id !== id)
    if (nextTabs.length === 0) return
    setOpenTabs(nextTabs)
    if (activeTabId === id) setActiveTabId(nextTabs[nextTabs.length - 1].id)
  }, [openTabs, activeTabId])
  const updateActiveFileContent = useCallback(
    (value: string) => {
      if (activePath) setWorkspaceFiles((prev) => ({ ...prev, [activePath]: value }))
    },
    [activePath]
  )

  const addFile = useCallback((path: string, content = '') => {
    const next = path.trim() || `file-${Date.now()}.js`
    setWorkspaceFiles((prev) => ({ ...prev, [next]: content || `// ${next}\n` }))
    openFile(next)
  }, [openFile])

  const deleteFile = useCallback((path: string) => {
    setWorkspaceFiles((prev) => {
      const next = { ...prev }
      delete next[path]
      return next
    })
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.path !== path)
      if (activeTabId === path) setActiveTabId(next.length ? next[next.length - 1].id : null)
      return next.length ? next : [{ id: 'main.js', path: 'main.js' }]
    })
    if (activeTabId === path) setActiveTabId('main.js')
  }, [activeTabId])

  const renameFile = useCallback((oldPath: string, newPath: string) => {
    if (oldPath === newPath) return
    const content = workspaceFiles[oldPath] ?? ''
    setWorkspaceFiles((prev) => {
      const next = { ...prev }
      delete next[oldPath]
      next[newPath] = content
      return next
    })
    setOpenTabs((prev) =>
      prev.map((t) => (t.path === oldPath ? { id: newPath, path: newPath } : t))
    )
    if (activeTabId === oldPath) setActiveTabId(newPath)
  }, [workspaceFiles, activeTabId])

  const handleRun = useCallback(async (entryPath?: string) => {
    const code = entryPath ? (workspaceFiles[entryPath] ?? '') : runCode
    const lang = entryPath ? getLanguageFromPath(entryPath) : runLanguage
    setRunLoading(true)
    try {
      if (lang === 'javascript') {
        const logs: string[] = []
        const captureLog = (...args: unknown[]) => {
          logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '))
        }
        try {
          const run = new Function(
            'console',
            `const __log = console.log; try { ${code} } finally { console.log = __log; }`
          )
          run({ ...console, log: captureLog })
          appendTerminal('output', logs.join('\n') || '(no output)')
        } catch (e: unknown) {
          appendTerminal('error', `Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
        return
      }
      if (lang === 'typescript') {
        try {
          // @ts-expect-error - ESM URL resolved at runtime
          const ts = await import('https://esm.sh/typescript@5.6.3')
          const out = ts.transpileModule(code, {
            compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
          })
          const logs: string[] = []
          const captureLog = (...args: unknown[]) => {
            logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '))
          }
          const run = new Function(
            'console',
            `const __log = console.log; try { ${out.outputText} } finally { console.log = __log; }`
          )
          run({ ...console, log: captureLog })
          appendTerminal('output', logs.join('\n') || '(no output)')
        } catch (e: unknown) {
          appendTerminal('error', `TypeScript: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
        return
      }
      if (lang === 'python') {
        try {
          if (!pyodideRef.current) {
            appendTerminal('output', 'Loading Python runtime (Pyodide)...')
            const loadPyodide = (window as unknown as { loadPyodide?: (opts: { indexURL: string }) => Promise<{ runPythonAsync: (c: string) => Promise<void>; loadPackage: (n: string) => Promise<void> }> }).loadPyodide
            if (!loadPyodide) {
              const script = document.createElement('script')
              script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js'
              script.async = true
              await new Promise<void>((res, rej) => {
                script.onload = () => res()
                script.onerror = () => rej(new Error('Failed to load Pyodide'))
                document.head.appendChild(script)
              })
            }
            const loader = (window as unknown as {
              loadPyodide: (opts: { indexURL: string }) => Promise<{
                runPythonAsync: (c: string) => Promise<void>
                loadPackage: (n: string) => Promise<void>
                setStdout: (o: { write: (s: string) => void }) => void
                setStderr: (o: { write: (s: string) => void }) => void
              }>
            }).loadPyodide
            const pyodide = await loader({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' })
            await pyodide.loadPackage('micropip')
            pyodide.setStdout({ write: (s) => appendTerminal('output', s) })
            pyodide.setStderr({ write: (s) => appendTerminal('error', s) })
            pyodideRef.current = pyodide
          }
          const pyodide = pyodideRef.current
          const pkgs = pythonPackages
            .split(/[\s,]+/)
            .map((p) => p.trim())
            .filter(Boolean)
          if (pkgs.length > 0) {
            appendTerminal('output', `Installing packages: ${pkgs.join(', ')}...`)
            await pyodide.runPythonAsync(
              `import micropip\nawait micropip.install([${pkgs.map((p) => `"${p}"`).join(', ')}])`
            )
          }
          await pyodide.runPythonAsync(code)
          appendTerminal('output', '(Python finished)')
        } catch (e: unknown) {
          appendTerminal('error', `Python: ${e instanceof Error ? e.message : String(e)}`)
        }
        return
      }
      if (lang === 'html') {
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(code)
          win.document.close()
          appendTerminal('output', 'HTML preview opened in new tab.')
        } else {
          appendTerminal('error', 'Allow pop-ups to preview HTML.')
        }
        return
      }
      if (lang === 'css') {
        const html = `<!DOCTYPE html><html><head><style>${code}</style></head><body><h1>CSS Preview</h1><p>Your styles are applied above.</p></body></html>`
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(html)
          win.document.close()
          appendTerminal('output', 'CSS preview opened in new tab.')
        } else {
          appendTerminal('error', 'Allow pop-ups to preview CSS.')
        }
        return
      }
      if (PISTON_LANG[lang]) {
        await runViaPiston(
          lang,
          code,
          (out) => appendTerminal('output', out),
          (err) => appendTerminal('error', err)
        )
        return
      }
      appendTerminal('output', `Run not available for ${lang}. Use Download to save and run locally.`)
    } catch (e: unknown) {
      logger.error('Workspace run failed', 'WorkspacePage', e)
      appendTerminal('error', `Error: ${e instanceof Error ? e.message : 'Unknown'}`)
    } finally {
      setRunLoading(false)
    }
  }, [runCode, runLanguage, workspaceFiles, appendTerminal, shell, pythonPackages])

  const handleRunAll = useCallback(async () => {
    const entry = ['main.js', 'index.js', 'app.js', 'index.ts', 'main.ts'].find((p) => workspaceFiles[p])
    if (entry) {
      openFile(entry)
      await new Promise((r) => setTimeout(r, 50))
      await handleRun(entry)
    } else {
      await handleRun()
    }
  }, [workspaceFiles, openFile, handleRun])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(runCode)
    appendTerminal('output', 'Code copied to clipboard.')
  }

  const handleDownload = () => {
    const extMap: Record<string, string> = {
      typescript: 'ts', javascript: 'js', python: 'py', cpp: 'cpp', java: 'java', csharp: 'cs',
      html: 'html', css: 'css', json: 'json', markdown: 'md', sql: 'sql', rust: 'rs', go: 'go',
    }
    const ext = extMap[runLanguage] ?? getExtension(activePath ?? '') ?? 'txt'
    const filename = activePath ?? `workspace.${ext}`
    const blob = new Blob([runCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
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

  const handleSidebarResize = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !isResizingSidebar) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    setSidebarWidth(Math.min(400, Math.max(140, x)))
  }, [isResizingSidebar])
  const handleChatResize = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !isResizingChat) return
    const rect = containerRef.current.getBoundingClientRect()
    setChatPanelWidth(Math.min(600, Math.max(200, rect.right - e.clientX)))
  }, [isResizingChat])
  useEffect(() => {
    if (!isResizingSidebar && !isResizingChat) return
    const onMove = (e: MouseEvent) => {
      if (isResizingSidebar) handleSidebarResize(e)
      else if (isResizingChat) handleChatResize(e)
    }
    const onUp = () => { setIsResizingSidebar(false); setIsResizingChat(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isResizingSidebar, isResizingChat, handleSidebarResize, handleChatResize])

  const fileTree = pathToTree(workspaceFiles)

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      {/* Main: Activity bar + Sidebar + Editor */}
      <div ref={containerRef} className="flex flex-1 min-h-0">
        {/* Activity bar */}
        <div className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-muted/40 py-2">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className={`mb-1 flex h-10 w-10 items-center justify-center rounded ${sidebarOpen ? 'bg-muted' : ''} hover:bg-muted`}
            title="Explorer"
          >
            <FolderOpen className="h-5 w-5 text-foreground" />
          </button>
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded hover:bg-muted" title="Search">
            <Search className="h-5 w-5 text-muted-foreground" />
          </button>
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded hover:bg-muted" title="Source Control">
            <GitBranch className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => void handleRun()}
            disabled={runLoading}
            className="flex h-10 w-10 items-center justify-center rounded hover:bg-muted disabled:opacity-50"
            title="Run"
          >
            <Play className="h-5 w-5 text-muted-foreground" />
          </button>
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded hover:bg-muted" title="Extensions">
            <Puzzle className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => setChatPanelOpen((o) => !o)}
            className={`mt-1 flex h-10 w-10 items-center justify-center rounded ${chatPanelOpen ? 'bg-muted' : ''} hover:bg-muted`}
            title="Nova (Workspace)"
          >
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Sidebar - Explorer (resizable) */}
        {sidebarOpen && (
          <>
            <div style={{ width: sidebarWidth, minWidth: 120 }} className="flex shrink-0 flex-col border-r border-border bg-muted/20">
              <div className="flex h-9 items-center justify-between border-b border-border px-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explorer</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const p = window.prompt('File path (e.g. script.py or src/helper.js)'); if (p != null && p.trim()) addFile(p.trim()); }} title="New file">
                  <FilePlus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-auto py-2">
              {fileTree.children?.map((node) => (
                <TreeNode
                  key={node.name + (node.path ?? '')}
                  node={node}
                  openFile={openFile}
                  onDeleteFile={deleteFile}
                  onRenameFile={renameFile}
                />
              ))}
              </div>
            </div>
            <div
              role="separator"
              aria-label="Resize sidebar"
              onMouseDown={(e) => { e.preventDefault(); setIsResizingSidebar(true) }}
              className="w-1 shrink-0 cursor-ew-resize border-r border-border bg-transparent hover:bg-primary/20"
            />
          </>
        )}

        {/* Editor area: tabs + Monaco */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Tab bar */}
          <div className="flex shrink-0 items-end border-b border-border bg-muted/20">
            {openTabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex cursor-pointer items-center gap-1 border-r border-border px-3 py-2 text-sm ${activeTabId === tab.id ? 'bg-background font-medium' : 'bg-muted/30 hover:bg-muted/50'}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <FileCode className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="max-w-[120px] truncate">{tab.path.split('/').pop() ?? tab.path}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  className="ml-1 rounded p-0.5 hover:bg-muted"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Toolbar: Run, Copy, Download, Shell, Python packages */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-2 py-1.5">
            <Button size="sm" onClick={() => void handleRun()} disabled={runLoading} title="Run active file">
              <Play className="mr-1.5 h-4 w-4" />
              {runLoading ? 'Running…' : 'Run'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void handleRunAll()} disabled={runLoading} title="Run main / entry file">
              <PlayCircle className="mr-1.5 h-4 w-4" />
              Run all
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy} title="Copy">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
            <Select value={shell} onValueChange={setShell}>
              <SelectTrigger className="h-8 w-[110px]">
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
            {runLanguage === 'python' && (
              <div className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Packages (e.g. numpy)"
                  value={pythonPackages}
                  onChange={(e) => setPythonPackages(e.target.value)}
                  className="h-8 w-48 text-sm"
                />
              </div>
            )}
          </div>

          {/* Editor + resize + Panel column */}
          <div className="flex min-h-0 flex-1 flex-col">
          {/* Monaco editor */}
          <div style={{ flex: editorHeightPercent }} className="min-h-[120px] overflow-hidden">
            {activePath ? (
              <Editor
                key={activeTabId}
                height="100%"
                language={activeLanguage}
                value={activeFileContent}
                onChange={(value) => updateActiveFileContent(value ?? '')}
                theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12 },
                }}
                onMount={(editor) => {
                  monacoRef.current = editor
                  editor.onDidChangeCursorPosition((e) => setCursorPosition({ line: e.position.lineNumber, column: e.position.column }))
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted/20 text-muted-foreground">
                Open a file from the Explorer to edit.
              </div>
            )}
          </div>

          {/* Resize handle between editor and panel */}
          <div
            role="separator"
            aria-label="Resize"
            onMouseDown={() => setIsDragging(true)}
            className={`flex h-2 shrink-0 cursor-ns-resize items-center justify-center border-y border-border bg-muted/50 hover:bg-muted ${isDragging ? 'bg-muted' : ''}`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Bottom panel: Terminal / Output / Problems */}
          <div
            style={panelOpen ? { flex: 100 - editorHeightPercent, minHeight: 80 } : { flex: '0 0 32px' }}
            className="flex min-h-0 flex-col overflow-hidden border-t border-border bg-zinc-950"
          >
            <div className="flex h-8 shrink-0 items-center border-b border-zinc-800">
              <button
                type="button"
                onClick={() => { setActivePanel('terminal'); setPanelOpen(true) }}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs ${activePanel === 'terminal' ? 'border-b-2 border-green-500 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <TerminalIcon className="h-4 w-4 text-green-500" />
                Terminal
              </button>
              <button
                type="button"
                onClick={() => { setActivePanel('output'); setPanelOpen(true) }}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs ${activePanel === 'output' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Output
              </button>
              <button
                type="button"
                onClick={() => { setActivePanel('problems'); setPanelOpen(true) }}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs ${activePanel === 'problems' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Problems
              </button>
              <button
                type="button"
                onClick={() => setPanelOpen((o) => !o)}
                className="ml-auto px-2 text-muted-foreground hover:text-foreground"
                aria-label={panelOpen ? 'Close panel' : 'Open panel'}
              >
                <GripVertical className="h-4 w-4 rotate-90" />
              </button>
            </div>
            {panelOpen && (
              <div className="flex-1 overflow-hidden">
                {activePanel === 'terminal' && (
                  <div
                    ref={terminalRef}
                    className="flex h-full flex-col overflow-auto p-4 font-mono text-sm text-green-400"
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
                )}
                {activePanel === 'output' && (
                  <div className="p-4 text-sm text-muted-foreground">Output (run code to see results in Terminal).</div>
                )}
                {activePanel === 'problems' && (
                  <div className="p-4 text-sm text-muted-foreground">No problems detected.</div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Right: Nova chat panel – collapsed strip or full panel (resizable) */}
        {chatPanelOpen ? (
          <>
            <div
              role="separator"
              aria-label="Resize chat panel"
              onMouseDown={(e) => { e.preventDefault(); setIsResizingChat(true) }}
              className="w-1 shrink-0 cursor-ew-resize border-r border-border bg-transparent hover:bg-primary/20"
            />
            <div style={{ width: chatPanelWidth, minWidth: 200 }} className="flex min-w-0 shrink-0 flex-col">
              <WorkspaceChatPanel
                workspaceContext={{
                  files: workspaceFiles,
                  terminalLines,
                  activePath,
                }}
                onWriteFile={(path, content) => {
                  setWorkspaceFiles((prev) => ({ ...prev, [path]: content }))
                  openFile(path)
                }}
                onRunCommand={(command) => executeCommand(command)}
                onOpenFile={openFile}
                onCollapse={() => setChatPanelOpen(false)}
              />
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setChatPanelOpen(true)}
            className="flex w-8 shrink-0 flex-col items-center justify-center border-l border-border bg-muted/40 py-2 hover:bg-muted"
            title="Open Nova (Workspace)"
          >
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <span className="mt-1 text-[10px] text-muted-foreground">Nova</span>
          </button>
        )}
      </div>

      {/* Status bar */}
      <div className="flex h-6 shrink-0 items-center justify-between border-t border-border bg-muted/40 px-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>main</span>
          <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{activePath ? getLanguageFromPath(activePath) : 'Plain Text'}</span>
          <span>UTF-8</span>
          <span>LF</span>
        </div>
      </div>
    </div>
  )
}

const FILE_EXTENSIONS = ['js', 'ts', 'py', 'html', 'css', 'json', 'md', 'cpp', 'java', 'rs', 'go', 'cs'] as const

function TreeNode({
  node,
  openFile,
  onDeleteFile,
  onRenameFile,
}: {
  node: FileTreeNode
  openFile: (path: string) => void
  onDeleteFile: (path: string) => void
  onRenameFile: (oldPath: string, newPath: string) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const isFile = !!node.path

  if (isFile) {
    const path = node.path!
    const base = path.replace(/\.[^.]+$/, '') || path
    return (
      <div className="group flex w-full items-center gap-0.5 rounded px-2 py-1 text-left text-sm hover:bg-muted/60">
        <button type="button" onClick={() => openFile(path)} className="flex min-w-0 flex-1 items-center gap-2 truncate">
          <FileCode className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{node.name}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {FILE_EXTENSIONS.filter((ext) => `${base}.${ext}` !== path).map((ext) => (
              <DropdownMenuItem key={ext} onClick={() => onRenameFile(path, `${base}.${ext}`)}>
                Save as .{ext}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => onDeleteFile(path)} className="text-destructive">
              Delete file
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }
  return (
    <div className="py-0.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 truncate px-2 py-1 text-left text-sm hover:bg-muted/60"
      >
        <span className="w-4 shrink-0 text-muted-foreground">{open ? '▼' : '▶'}</span>
        <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
      </button>
      {open && hasChildren && (
        <div className="pl-4">
          {node.children!.map((child) => (
            <TreeNode key={child.name + (child.path ?? '')} node={child} openFile={openFile} onDeleteFile={onDeleteFile} onRenameFile={onRenameFile} />
          ))}
        </div>
      )}
    </div>
  )
}
