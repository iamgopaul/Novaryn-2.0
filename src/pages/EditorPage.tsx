import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from 'next-themes'
import { Play, Copy, Download, Code2 } from 'lucide-react'
import { logger } from '@/lib/logger'

const defaultCode = `// Welcome to Novaryn Code Editor
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
]

export function EditorPage() {
  const { resolvedTheme } = useTheme()
  const [code, setCode] = useState(defaultCode)
  const [language, setLanguage] = useState('typescript')
  const [output, setOutput] = useState('')

  const handleCopy = async () => { await navigator.clipboard.writeText(code) }
  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code.${language === 'typescript' ? 'ts' : language === 'javascript' ? 'js' : language}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRun = () => {
    try {
      if (language === 'javascript' || language === 'typescript') {
        const logs: string[] = []
        const captureLog = (...args: unknown[]) => {
          logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '))
        }
        try {
          const run = new Function('console', `
            const __log = console.log;
            try {
              ${code}
            } finally {
              console.log = __log;
            }
          `)
          run({ ...console, log: captureLog })
          setOutput(logs.join('\n'))
        } catch (e: unknown) {
          logger.debug('Editor run: user code threw', 'EditorPage', e)
          logs.push(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
          setOutput(logs.join('\n'))
        }
      } else {
        setOutput(`Running ${language} code requires a backend runtime.`)
      }
    } catch (e: unknown) {
      logger.error('Editor run failed', 'EditorPage', e)
      setOutput(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Code Editor</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {languages.map((lang) => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleCopy} title="Copy code"><Copy className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={handleDownload} title="Download"><Download className="h-4 w-4" /></Button>
          <Button onClick={handleRun}><Play className="mr-2 h-4 w-4" />Run</Button>
        </div>
      </div>
      <div className="grid flex-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="h-full p-0">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
              options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', roundedSelection: true, scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 16 } }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Output</CardTitle></CardHeader>
          <CardContent>
            <pre className="min-h-[200px] rounded-lg bg-muted p-4 font-mono text-sm">{output || 'Click "Run" to execute your code...'}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
