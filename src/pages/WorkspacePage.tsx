import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
import { Play, Copy, Download, Terminal as TerminalIcon, Trash2, GripVertical, Package, FolderOpen, FileCode, Search, GitBranch, Puzzle, X, MessageSquare, FilePlus, PlayCircle, MoreHorizontal, Maximize2, Minimize2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { WorkspaceChatPanel } from '@/components/workspace/WorkspaceChatPanel'
import { zipSync, strToU8 } from 'fflate'

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
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["**/*.ts", "**/*.tsx"]
}\n`,
  'package.json': '{\n  "name": "workspace",\n  "type": "module"\n}\n',
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

const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute'

// Judge0 CE: language_id from https://ce.judge0.com/languages (used when run-command unavailable, e.g. Vercel)
const JUDGE0_LANG: Record<string, number> = {
  java: 91,   // Java (JDK 17.0.6)
  cpp: 54,    // C++ (GCC 9.2.0)
  python: 71, // Python (3.8.1)
  c: 50,      // C (GCC 9.2.0)
  rust: 73,
  go: 95,
  csharp: 51,
  javascript: 93,
  typescript: 94,
}
const JUDGE0_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JUDGE0_BASE_URL) || 'https://ce.judge0.com'
const JUDGE0_AUTH = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_JUDGE0_AUTH_TOKEN : undefined
const JUDGE0_MULTI_FILE_LANG_ID = 89

/** Resolve import spec relative to fromPath; return workspace path (no leading slash). */
function resolveImportPath(fromPath: string, importSpec: string): string {
  const spec = importSpec.replace(/^["']|["']$/g, '').trim()
  const fromDir = fromPath.includes('/') ? fromPath.replace(/\/[^/]+$/, '') : ''
  const combined = fromDir ? `${fromDir}/${spec}` : spec
  const parts = combined.split('/').filter(Boolean)
  const out: string[] = []
  for (const p of parts) {
    if (p === '.') continue
    if (p === '..') {
      out.pop()
      continue
    }
    out.push(p)
  }
  return out.join('/')
}

/** Find workspace path for resolved path (try with .ts, .tsx, .js). */
function findWorkspacePath(files: Record<string, string>, resolved: string): string | null {
  if (files[resolved]) return resolved
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    const p = resolved.endsWith(ext) ? resolved : `${resolved}${ext}`
    if (files[p]) return p
  }
  return null
}

/** Collect import specs from TS/JS source (relative and same-dir). */
function collectImports(source: string): string[] {
  const specs: string[] = []
  const re = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^"']+)["']|require\s*\(\s*["']([^"']+)["']\s*\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) {
    const spec = m[1] ?? m[2]
    if (!spec || (!spec.startsWith('.') && !spec.startsWith('/'))) continue
    if (!spec.match(/^[a-z]+:/)) specs.push(spec)
  }
  return specs
}

/** Topological order of paths so dependencies come first (only workspace .ts/.tsx/.js). */
function orderTsEntry(files: Record<string, string>, entryPath: string): string[] {
  const order: string[] = []
  const seen = new Set<string>()
  const visit = (path: string) => {
    if (seen.has(path)) return
    seen.add(path)
    const content = files[path]
    if (!content) return
    const fromPath = path
    for (const spec of collectImports(content)) {
      const resolved = resolveImportPath(fromPath, spec)
      const target = findWorkspacePath(files, resolved)
      if (target) visit(target)
    }
    order.push(path)
  }
  visit(entryPath)
  return order
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
  const langLabel = mapped.piston === 'c++' ? 'C++' : mapped.piston.charAt(0).toUpperCase() + mapped.piston.slice(1)
  onOutput(`Running ${langLabel}...\n`)
  try {
    const res = await fetch(PISTON_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: mapped.piston,
        version: '*',
        files: [{ name: mapped.filename, content: code }],
      }),
    })
    const text = await res.text()
    if (!res.ok) {
      onError(`API error: ${res.status}. ${text || 'Try again or use Download.'}`)
      return
    }
    let data: { run?: { stdout?: string; stderr?: string; output?: string }; compile?: { stdout?: string; stderr?: string; output?: string }; message?: string }
    try {
      data = JSON.parse(text)
    } catch {
      onError(`Invalid API response. Use Download to run locally.`)
      return
    }
    const run = data.run
    const compile = data.compile
    if (data.message) onError(data.message)
    if (compile?.stderr?.trim()) onError(`Compile stderr:\n${compile.stderr}`)
    if (compile?.stdout?.trim()) onOutput(`Compile stdout:\n${compile.stdout}`)
    if (run?.stderr?.trim()) onError(run.stderr)
    const out = (run?.stdout ?? run?.output ?? '').trim()
    if (out) onOutput(out)
    else if (!run?.stderr?.trim() && !compile?.stderr?.trim() && !data.message) onOutput('(Program ran with no output)')
  } catch (e) {
    onError(`Network error: ${e instanceof Error ? e.message : 'Unknown'}. Check connection or use Download to run locally.`)
  }
}

/** Judge0 uses Main.java for Java; normalize public class Name to Main so it compiles. */
function normalizeJavaForJudge0(code: string): string {
  const match = code.match(/\bpublic\s+class\s+(\w+)\b/)
  if (match && match[1] !== 'Main') {
    return code.replace(/\bpublic\s+class\s+\w+/, 'public class Main')
  }
  return code
}

/** Judge0 CE: run code when run-command API is unavailable (e.g. on Vercel). Status 3 = Accepted. */
async function runViaJudge0(
  langKey: string,
  code: string,
  onOutput: (out: string) => void,
  onError: (err: string) => void
): Promise<void> {
  const languageId = JUDGE0_LANG[langKey]
  if (languageId == null) {
    onError(`Judge0 has no runner for ${langKey}. Use Download to run locally.`)
    return
  }
  const label = langKey === 'cpp' ? 'C++' : langKey.charAt(0).toUpperCase() + langKey.slice(1)
  onOutput(`Running ${label} (Judge0)...\n`)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (JUDGE0_AUTH) headers['X-Auth-Token'] = JUDGE0_AUTH
  const sourceCode = langKey === 'java' ? normalizeJavaForJudge0(code) : code
  try {
    const res = await fetch(
      `${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ source_code: sourceCode, language_id: languageId }),
      }
    )
    const text = await res.text()
    if (!res.ok) {
      onError(`Judge0 API error: ${res.status}. ${text || 'Try again or use Download.'}`)
      return
    }
    let data: {
      stdout?: string | null
      stderr?: string | null
      compile_output?: string | null
      message?: string | null
      status?: { id: number; description?: string }
    }
    try {
      data = JSON.parse(text)
    } catch {
      onError('Invalid Judge0 response. Use Download to run locally.')
      return
    }
    const statusId = data.status?.id
    if (data.compile_output?.trim()) onOutput(`Compile:\n${data.compile_output.trim()}\n`)
    if (data.stderr?.trim()) onError(data.stderr)
    if (data.message?.trim() && statusId !== 3) onError(data.message)
    if (statusId === 3) {
      const out = (data.stdout ?? '').trim()
      onOutput(out || '(Program ran with no output)')
    } else if (statusId !== 6 && !data.stderr?.trim() && !data.compile_output?.trim()) {
      onError(data.status?.description ?? `Execution failed (status ${statusId}). Use Download to run locally.`)
    }
  } catch (e) {
    onError(`Judge0: ${e instanceof Error ? e.message : 'Network error'}. Check connection or use Download.`)
  }
}

function uint8ArrayToBase64(u8: Uint8Array): string {
  const chunkSize = 8192
  let binary = ''
  for (let i = 0; i < u8.length; i += chunkSize) {
    const chunk = u8.subarray(i, Math.min(i + chunkSize, u8.length))
    binary += String.fromCharCode.apply(null, chunk as unknown as number[])
  }
  return btoa(binary)
}

/** Judge0 multi-file (language_id 89): zip of all .java + compile + run scripts. */
async function runViaJudge0MultiFile(
  workspaceFiles: Record<string, string>,
  entryPath: string,
  onOutput: (out: string) => void,
  onError: (err: string) => void
): Promise<void> {
  const javaPaths = Object.keys(workspaceFiles).filter((p) => /\.java$/i.test(p))
  if (javaPaths.length < 2) return
  const mainClass = entryPath.replace(/\.java$/i, '')
  onOutput(`Running Java (Judge0, ${javaPaths.length} files)...\n`)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (JUDGE0_AUTH) headers['X-Auth-Token'] = JUDGE0_AUTH
  const zipObj: Record<string, Uint8Array> = {
    compile: strToU8('#!/bin/bash\nset -e\njavac *.java\n'),
    run: strToU8(`#!/bin/bash\njava ${mainClass}\n`),
  }
  for (const path of javaPaths) {
    zipObj[path] = strToU8(workspaceFiles[path] ?? '')
  }
  let zipBytes: Uint8Array
  try {
    zipBytes = zipSync(zipObj, { level: 0 })
  } catch (e) {
    onError(`Zip failed: ${e instanceof Error ? e.message : 'Unknown'}`)
    return
  }
  const additionalFilesBase64 = uint8ArrayToBase64(zipBytes)
  try {
    const res = await fetch(
      `${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          language_id: JUDGE0_MULTI_FILE_LANG_ID,
          additional_files: additionalFilesBase64,
        }),
      }
    )
    const text = await res.text()
    if (!res.ok) {
      onError(`Judge0 API error: ${res.status}. ${text || 'Try again or use Download.'}`)
      return
    }
    let data: {
      stdout?: string | null
      stderr?: string | null
      compile_output?: string | null
      message?: string | null
      status?: { id: number; description?: string }
    }
    try {
      data = JSON.parse(text)
    } catch {
      onError('Invalid Judge0 response. Use Download to run locally.')
      return
    }
    const statusId = data.status?.id
    if (data.compile_output?.trim()) onOutput(`Compile:\n${data.compile_output.trim()}\n`)
    if (data.stderr?.trim()) onError(data.stderr)
    if (data.message?.trim() && statusId !== 3) onError(data.message)
    if (statusId === 3) {
      const out = (data.stdout ?? '').trim()
      onOutput(out || '(Program ran with no output)')
    } else if (statusId !== 6 && !data.stderr?.trim() && !data.compile_output?.trim()) {
      onError(data.status?.description ?? `Execution failed (status ${statusId}). Use Download to run locally.`)
    }
  } catch (e) {
    onError(`Judge0: ${e instanceof Error ? e.message : 'Network error'}. Check connection or use Download.`)
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
  version  - Show Novaryn version
  npm, npx, bun, node, yarn - Package runners (need: bun run server)
  java, javac, python3, g++, gcc - Run code (need: bun run server + JDK/Python/gcc)`

export function WorkspacePage({ fullScreen = false }: { fullScreen?: boolean }) {
  const { resolvedTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const isFullScreen = fullScreen || location.pathname === '/workspace/full'
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
        if (typeof parsed === 'object' && parsed !== null) {
          const merged = { ...parsed }
          if (!merged['tsconfig.json']) merged['tsconfig.json'] = DEFAULT_WORKSPACE_FILES['tsconfig.json']
          if (!merged['package.json']) merged['package.json'] = DEFAULT_WORKSPACE_FILES['package.json']
          return merged
        }
      }
    } catch (_) {}
    return { ...DEFAULT_WORKSPACE_FILES }
  })
  const [openTabs, setOpenTabs] = useState<{ id: string; path: string }[]>([{ id: 'main.js', path: 'main.js' }])
  const [activeTabId, setActiveTabId] = useState<string | null>('main.js')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [activePanel, setActivePanel] = useState<'terminal' | 'output' | 'problems'>('terminal')
  const [editorMarkers, setEditorMarkers] = useState<Array<{ resource: string; severity: number; line: number; column: number; message: string }>>([])
  const [outputContent, setOutputContent] = useState('')
  const [outputCopied, setOutputCopied] = useState(false)
  const [problemsCopied, setProblemsCopied] = useState(false)
  const [terminalCopied, setTerminalCopied] = useState(false)
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
  const monacoInstanceRef = useRef<typeof import('monaco-editor') | null>(null)
  const markersDisposableRef = useRef<{ dispose: () => void } | null>(null)

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

  // Sync Monaco TypeScript with workspace files so imports resolve (e.g. main.ts -> ./Calculator.ts)
  useEffect(() => {
    const monaco = monacoInstanceRef.current as unknown as { languages: { typescript: { typescriptDefaults: { setExtraLibs: (libs: { content: string; filePath?: string }[]) => void; setCompilerOptions: (opts: Record<string, unknown>) => void }; ScriptTarget: { ES2020: number }; ModuleKind: { ESNext: number }; ModuleResolutionKind: { NodeJs: number } } } } | null
    if (!monaco?.languages?.typescript) return
    const ts = monaco.languages.typescript.typescriptDefaults
    const libs: { content: string; filePath?: string }[] = []
    for (const [path, content] of Object.entries(workspaceFiles)) {
      const ext = getExtension(path)
      if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
        libs.push({ content, filePath: `file:///workspace/${path}` })
        if (ext === 'ts' || ext === 'tsx') {
          const pathNoExt = path.slice(0, -ext.length - 1)
          libs.push({ content, filePath: `file:///workspace/${pathNoExt}` })
        }
      }
    }
    ts.setExtraLibs(libs)
    const tsconfigStr = workspaceFiles['tsconfig.json']
    const { ScriptTarget, ModuleKind, ModuleResolutionKind } = monaco.languages.typescript
    if (tsconfigStr) {
      try {
        const tsconfig = JSON.parse(tsconfigStr) as { compilerOptions?: Record<string, unknown> }
        const opts = tsconfig.compilerOptions ?? {}
        ts.setCompilerOptions({
          target: (opts.target as number) ?? ScriptTarget.ES2020,
          module: (opts.module as number) ?? ModuleKind.ESNext,
          moduleResolution: ModuleResolutionKind.NodeJs,
          strict: opts.strict !== false,
          esModuleInterop: opts.esModuleInterop !== false,
          skipLibCheck: true,
        })
      } catch (_) {
        ts.setCompilerOptions({
          target: ScriptTarget.ES2020,
          module: ModuleKind.ESNext,
          moduleResolution: ModuleResolutionKind.NodeJs,
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        })
      }
    }
  }, [workspaceFiles])

  const appendTerminal = useCallback((type: TerminalLine['type'], content: string) => {
    setTerminalLines((prev) => [...prev, { type, content, timestamp: new Date() }])
  }, [])

  const executeCommand = useCallback(
    async (cmd: string) => {
      const trimmed = cmd.trim()
      const args = trimmed.split(' ')
      const command = args[0]?.toLowerCase() ?? ''
      const params = args.slice(1).join(' ')
      const runAllowed = ['npm', 'npx', 'bun', 'node', 'yarn', 'java', 'javac', 'python3', 'python', 'g++', 'gcc', 'sh']
      const appendInput = () => {
        setTerminalLines((prev) => [...prev, { type: 'input', content: `${prompt}${cmd}`, timestamp: new Date() }])
      }
      if (!trimmed) return
      if (command === 'clear') {
        setTerminalLines([])
        return
      }
      let output: string
      let isError = false
      switch (command) {
        case 'help':
          output = helpText
          break
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
          if (runAllowed.includes(command)) {
            appendInput()
            setTerminalLines((prev) => [...prev, { type: 'output', content: 'Running...', timestamp: new Date() }])
            try {
              const res = await fetch('/api/workspace/run-command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: trimmed, workspaceFiles }),
              })
              const data = await res.json().catch(() => ({}))
              setTerminalLines((prev) => prev.slice(0, -1))
              if (!res.ok) {
                const msg = res.status === 404 || res.status === 502
                  ? 'Run-command server not available. Start it with "bun run server" in a separate terminal. For Java install JDK; for C++ install g++.'
                  : (data?.error ?? `Request failed (${res.status})`)
                setTerminalLines((p) => [...p, { type: 'error', content: msg, timestamp: new Date() }])
                return
              }
              if (data.stdout?.trim()) {
                setTerminalLines((p) => [...p, { type: 'output', content: data.stdout.trim(), timestamp: new Date() }])
              }
              if (data.stderr?.trim()) {
                const stderr = data.stderr.trim()
                setTerminalLines((p) => [...p, { type: 'error', content: stderr, timestamp: new Date() }])
                if (/command not found.*\b(javac|java|g\+\+|gcc)\b/i.test(stderr)) {
                  setTerminalLines((p) => [
                    ...p,
                    { type: 'output', content: 'Tip: Install JDK for Java (javac/java) or g++ for C++, then start the API server with "bun run server".', timestamp: new Date() },
                  ])
                }
              }
              if (!data.stdout?.trim() && !data.stderr?.trim() && data.exitCode === 0) {
                setTerminalLines((p) => [...p, { type: 'output', content: '(command completed)', timestamp: new Date() }])
              }
            } catch (err) {
              setTerminalLines((prev) => prev.slice(0, -1))
              setTerminalLines((p) => [
                ...p,
                { type: 'error', content: `Failed to run: ${err instanceof Error ? err.message : 'Network or server error'}. Start the API server with "bun run server" (and install JDK for Java, g++ for C++).`, timestamp: new Date() },
              ])
            }
            return
          }
          output = `Command not found: ${command}. Type "help" for available commands.`
          isError = true
      }
      appendInput()
      setTerminalLines((prev) => [...prev, { type: isError ? 'error' : 'output', content: output, timestamp: new Date() }])
    },
    [prompt, shell, workspaceFiles]
  )

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cmd = terminalInput.trim()
    if (cmd) {
      setTerminalHistory((prev) => [...prev, cmd])
      setTerminalHistoryIndex(-1)
      void executeCommand(cmd)
    }
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
    const runLabel = entryPath ?? activePath ?? 'entry'
    const entryFile = entryPath ?? activePath
    setRunLoading(true)
    setActivePanel('terminal')
    setPanelOpen(true)
    const runOut = (type: 'output' | 'error', content: string) => {
      appendTerminal(type, content)
      setOutputContent((prev) => prev + content + '\n')
    }
    setOutputContent((prev) => prev + `\n--- Run (${runLabel}) ${new Date().toLocaleTimeString()} ---\n`)
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
          runOut('output', logs.join('\n') || '(no output)')
        } catch (e: unknown) {
          runOut('error', `Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
        return
      }
      if (lang === 'typescript') {
        try {
          // @ts-expect-error - ESM URL resolved at runtime
          const ts = await import('https://esm.sh/typescript@5.6.3')
          const entry = entryPath ?? activePath ?? 'main.ts'
          const ordered = orderTsEntry(workspaceFiles, entry)
          const transpiled: Record<string, string> = {}
          const compilerOpts = {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            esModuleInterop: true,
            allowJs: true,
          }
          for (const path of ordered) {
            const src = workspaceFiles[path] ?? ''
            const out = ts.transpileModule(src, { compilerOptions: compilerOpts })
            transpiled[path] = out.outputText
          }
          const modules: Record<string, { exports: Record<string, unknown> }> = {}
          const logs: string[] = []
          const captureLog = (...args: unknown[]) => {
            logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '))
          }
          for (const path of ordered) {
            const mod = { exports: {} as Record<string, unknown> }
            modules[path] = mod
            const req = (spec: string) => {
              const r = resolveImportPath(path, spec)
              const t = findWorkspacePath(workspaceFiles, r)
              if (!t || !(t in modules)) throw new Error(`Cannot find module '${spec}' (resolved: ${r})`)
              return modules[t].exports
            }
            try {
              const runModule = new Function('exports', 'require', 'console', transpiled[path])
              runModule(mod.exports, req, { ...console, log: captureLog })
            } catch (err) {
              throw new Error(`In ${path}: ${err instanceof Error ? err.message : String(err)}`)
            }
          }
          runOut('output', logs.join('\n') || '(no output)')
        } catch (e: unknown) {
          runOut('error', `TypeScript: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
        return
      }
      if (lang === 'python') {
        try {
          runOut('output', 'Running Python...\n')
          if (!pyodideRef.current) {
            runOut('output', 'Loading Python runtime (Pyodide)...\n')
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
            pyodide.setStdout({ write: (s) => runOut('output', s) })
            pyodide.setStderr({ write: (s) => runOut('error', s) })
            pyodideRef.current = pyodide
          }
          const pyodide = pyodideRef.current
          const pkgs = pythonPackages
            .split(/[\s,]+/)
            .map((p) => p.trim())
            .filter(Boolean)
          if (pkgs.length > 0) {
            runOut('output', `Installing packages: ${pkgs.join(', ')}...`)
            await pyodide.runPythonAsync(
              `import micropip\nawait micropip.install([${pkgs.map((p) => `"${p}"`).join(', ')}])`
            )
          }
          await pyodide.runPythonAsync(code)
          runOut('output', '(Python finished)')
        } catch (e: unknown) {
          runOut('error', `Python: ${e instanceof Error ? e.message : String(e)}`)
        }
        return
      }
      if (lang === 'html') {
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(code)
          win.document.close()
          runOut('output', 'HTML preview opened in new tab.')
        } else {
          runOut('error', 'Allow pop-ups to preview HTML.')
        }
        return
      }
      if (lang === 'css') {
        const html = `<!DOCTYPE html><html><head><style>${code}</style></head><body><h1>CSS Preview</h1><p>Your styles are applied above.</p></body></html>`
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(html)
          win.document.close()
          runOut('output', 'CSS preview opened in new tab.')
        } else {
          runOut('error', 'Allow pop-ups to preview CSS.')
        }
        return
      }
      if (lang === 'java' && entryFile) {
        const baseName = entryFile.replace(/\.java$/i, '')
        const runCmd = `javac ${entryFile} && java ${baseName}`
        const javaPaths = Object.keys(workspaceFiles).filter((p) => /\.java$/i.test(p))
        const isMultiFile = javaPaths.length >= 2
        try {
          runOut('output', 'Running Java...\n')
          const res = await fetch('/api/workspace/run-command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: isMultiFile ? `javac ${javaPaths.join(' ')} && java ${baseName}` : runCmd,
              workspaceFiles,
            }),
          })
          const data = await res.json().catch(() => ({}))
          if (res.ok) {
            if (data.stdout?.trim()) runOut('output', data.stdout.trim())
            if (data.stderr?.trim()) runOut('error', data.stderr.trim())
            if (!data.stdout?.trim() && !data.stderr?.trim() && data.exitCode === 0) runOut('output', '(completed)')
            return
          }
        } catch (_) {}
        if (isMultiFile) {
          await runViaJudge0MultiFile(workspaceFiles, entryFile, (o) => runOut('output', o), (e) => runOut('error', e))
        } else {
          await runViaJudge0('java', code, (o) => runOut('output', o), (e) => runOut('error', e))
        }
        return
      }
      if (lang === 'cpp' && entryFile) {
        const runCmd = `g++ -o main ${entryFile} && ./main`
        try {
          runOut('output', 'Running C++...\n')
          const res = await fetch('/api/workspace/run-command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: runCmd, workspaceFiles }),
          })
          const data = await res.json().catch(() => ({}))
          if (res.ok) {
            if (data.stdout?.trim()) runOut('output', data.stdout.trim())
            if (data.stderr?.trim()) runOut('error', data.stderr.trim())
            if (!data.stdout?.trim() && !data.stderr?.trim() && data.exitCode === 0) runOut('output', '(completed)')
            return
          }
        } catch (_) {}
        await runViaJudge0('cpp', code, (o) => runOut('output', o), (e) => runOut('error', e))
        return
      }
      if (PISTON_LANG[lang]) {
        await runViaPiston(
          lang,
          code,
          (out) => runOut('output', out),
          (err) => {
            const msg = err.includes('401') || err.includes('whitelist')
              ? 'Java/C++/etc. run via cloud API is restricted. Start the API server with "bun run server" and install JDK/g++ on your machine to run from the terminal or Run button.'
              : err
            runOut('error', msg)
          }
        )
        return
      }
      runOut('output', `Run not available for ${lang}. Use Download to save and run locally.`)
    } catch (e: unknown) {
      logger.error('Workspace run failed', 'WorkspacePage', e)
      runOut('error', `Error: ${e instanceof Error ? e.message : 'Unknown'}`)
    } finally {
      setRunLoading(false)
    }
  }, [runCode, runLanguage, workspaceFiles, appendTerminal, shell, pythonPackages, activePath])

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
    <div
      className={cn(
        'flex w-full flex-col min-h-0',
        isFullScreen ? 'h-screen min-h-dvh' : 'h-[calc(100vh-5rem)]'
      )}
    >
      {/* Main: Activity bar + Sidebar + Editor */}
      <div ref={containerRef} className="flex flex-1 min-h-0">
        {/* Activity bar */}
        <div className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-muted/40 py-2">
          {isFullScreen && (
            <button
              type="button"
              onClick={() => navigate('/workspace')}
              className="mb-1 flex h-10 w-10 items-center justify-center rounded hover:bg-muted"
              title="Back to app"
            >
              <Minimize2 className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
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
          {!isFullScreen && (
            <button
              type="button"
              onClick={() => navigate('/workspace/full')}
              className="mt-1 flex h-10 w-10 items-center justify-center rounded hover:bg-muted"
              title="Expand to full page"
            >
              <Maximize2 className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
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
                path={`file:///workspace/${activePath}`}
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
                onMount={(editor, monaco) => {
                  monacoRef.current = editor
                  monacoInstanceRef.current = monaco
                  editor.onDidChangeCursorPosition((e) => setCursorPosition({ line: e.position.lineNumber, column: e.position.column }))
                  const updateMarkers = () => {
                    try {
                      const all = (monaco.editor as { getModelMarkers: (f?: { resource?: unknown; owner?: string }) => Array<{ resource: { path: string }; severity: number; startLineNumber: number; startColumn: number; message: string }> }).getModelMarkers?.({})
                      if (Array.isArray(all)) {
                        setEditorMarkers(
                          all.map((m) => ({
                            resource: m.resource?.path ?? String(m.resource),
                            severity: m.severity ?? 8,
                            line: m.startLineNumber ?? 1,
                            column: m.startColumn ?? 1,
                            message: m.message ?? '',
                          }))
                        )
                      }
                    } catch (_) {}
                  }
                  markersDisposableRef.current?.dispose()
                  markersDisposableRef.current = (monaco.editor as { onDidChangeMarkers: (l: (uris: unknown) => void) => { dispose: () => void } }).onDidChangeMarkers?.(() => updateMarkers()) ?? null
                  updateMarkers()
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
                  <div className="flex h-full flex-col overflow-hidden">
                    <div className="flex justify-end border-b border-border px-2 py-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={async () => {
                          const text = terminalLines.map((l) => l.content).join('')
                          if (text) await navigator.clipboard.writeText(text)
                          setTerminalCopied(true)
                          setTimeout(() => setTerminalCopied(false), 2000)
                        }}
                        disabled={terminalLines.length === 0}
                        title="Copy all terminal output"
                      >
                        {terminalCopied ? <span className="text-green-400">Copied!</span> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                      </Button>
                    </div>
                    <div
                      ref={terminalRef}
                      className="flex min-h-0 flex-1 flex-col overflow-auto p-4 font-mono text-sm text-green-400 select-text"
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
                )}
                {activePanel === 'output' && (
                  <div className="flex h-full flex-col overflow-hidden p-2">
                    <div className="flex justify-end gap-2 pb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={async () => {
                          const text = outputContent || ''
                          if (text) await navigator.clipboard.writeText(text)
                          setOutputCopied(true)
                          setTimeout(() => setOutputCopied(false), 2000)
                        }}
                        disabled={!outputContent}
                        title="Copy all output"
                      >
                        {outputCopied ? <span className="text-green-400">Copied!</span> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOutputContent('')}>
                        Clear
                      </Button>
                    </div>
                    <pre className="min-h-0 flex-1 overflow-auto rounded border border-border bg-zinc-900/50 p-3 font-mono text-xs text-green-400 whitespace-pre-wrap select-text">
                      {outputContent || 'Run code to see output here. Same run output also appears in the Terminal.'}
                    </pre>
                  </div>
                )}
                {activePanel === 'problems' && (
                  <div className="flex h-full flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
                      <span className="text-xs text-muted-foreground">
                        {editorMarkers.length} problem{editorMarkers.length !== 1 ? 's' : ''}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={async () => {
                          const lines = editorMarkers.map((m) => {
                            const path = m.resource.replace(/^file:\/\/\/workspace\//, '').replace(/^\/workspace\//, '') || m.resource
                            const sev = m.severity === 8 ? 'Error' : m.severity === 4 ? 'Warning' : 'Info'
                            return `${path}:${m.line}:${m.column} - ${sev}: ${m.message}`
                          })
                          const text = lines.join('\n')
                          if (text) await navigator.clipboard.writeText(text)
                          setProblemsCopied(true)
                          setTimeout(() => setProblemsCopied(false), 2000)
                        }}
                        disabled={editorMarkers.length === 0}
                        title="Copy all problems"
                      >
                        {problemsCopied ? <span className="text-green-400">Copied!</span> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                      </Button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto p-2">
                      {editorMarkers.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">No problems detected.</p>
                      ) : (
                        <ul className="space-y-1">
                          {editorMarkers.map((m, i) => {
                            const path = m.resource.replace(/^file:\/\/\/workspace\//, '').replace(/^\/workspace\//, '') || m.resource
                            const severityLabel = m.severity === 8 ? 'Error' : m.severity === 4 ? 'Warning' : 'Info'
                            return (
                              <li key={i}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    openFile(path)
                                    setTimeout(() => {
                                      monacoRef.current?.revealLineInCenter?.(m.line)
                                      monacoRef.current?.setPosition?.({ lineNumber: m.line, column: m.column })
                                    }, 100)
                                  }}
                                  className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted/80 select-text"
                                >
                                  <span className={`shrink-0 ${m.severity === 8 ? 'text-red-400' : m.severity === 4 ? 'text-amber-400' : 'text-blue-400'}`}>
                                    {severityLabel}
                                  </span>
                                  <span className="shrink-0 font-mono text-muted-foreground">{path}:{m.line}:{m.column}</span>
                                  <span className="min-w-0 flex-1 break-words">{m.message}</span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
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
                  appendTerminal('output', `[Nova] Wrote to \`${path}\``)
                  setWorkspaceFiles((prev) => ({ ...prev, [path]: content }))
                  openFile(path)
                }}
                onDeleteFile={deleteFile}
                onRunCommand={(command) => {
                  appendTerminal('output', `[Nova] Running: ${command}`)
                  executeCommand(command)
                }}
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
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const hasChildren = node.children && node.children.length > 0
  const isFile = !!node.path

  if (isFile) {
    const path = node.path!
    const startRename = () => {
      setRenameValue(path)
      setIsRenaming(true)
    }
    const submitRename = () => {
      const next = renameValue.trim()
      if (next && next !== path) onRenameFile(path, next)
      setIsRenaming(false)
    }
    const cancelRename = () => {
      setRenameValue(path)
      setIsRenaming(false)
    }

    if (isRenaming) {
      return (
        <div className="flex w-full items-center gap-1 px-2 py-1">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename()
              if (e.key === 'Escape') cancelRename()
            }}
            onBlur={submitRename}
            className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            autoFocus
            data-testid="rename-input"
          />
        </div>
      )
    }

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
            <DropdownMenuItem onClick={startRename}>Rename (edit name and type)</DropdownMenuItem>
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
