/**
 * Vercel: POST /api/chat/workspace – Nova with workspace context (files, terminal).
 * Set GROQ_API_KEY in Vercel env.
 */
import { groq } from '@ai-sdk/groq'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'GROQ_API_KEY is not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await req.json() as {
      messages?: UIMessage[]
      workspaceContext?: {
        files?: Record<string, string>
        terminalLines?: string[]
        activePath?: string | null
      }
    }
    const messages = body?.messages ?? []
    const ctx = body?.workspaceContext ?? {}
    const files = ctx.files ?? {}
    const terminalLines = ctx.terminalLines ?? []
    const activePath = ctx.activePath ?? null

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: 'messages array is required' },
        { status: 400 }
      )
    }

    const filesSummary = Object.entries(files)
      .map(([path, content]) => `\n--- ${path} ---\n${String(content).slice(0, 8000)}${String(content).length > 8000 ? '\n... (truncated)' : ''}`)
      .join('')
    const terminalSummary = terminalLines.slice(-80).join('')
    const system = `You are Nova, the AI assistant integrated into the Novaryn Workspace. You have full control to:
1. READ – all open files and terminal output.
2. WRITE – create or replace any file (paths with slashes create folders, e.g. src/utils.js). You can create dotfiles like .env, .gitignore, etc.
3. DELETE – remove files from the workspace.
4. RUN – execute commands in the user's terminal.

Always use the exact language and file types the user asks for: TypeScript → .ts (not .js), Java → .java, Python → .py, C++ → .cpp. Do not substitute another language.
You MUST scaffold full applications when asked. Create ALL necessary files in the requested language and correct extensions: HTML, CSS, and the right code files (.ts, .java, .py, .cpp, etc.), plus .env when needed. For .env use placeholder values (e.g. API_KEY=your_key_here) and tell the user to replace with real secrets. Create multiple WRITE_FILE blocks in one response so the user sees the full project in the chat and can Accept to apply everything.

Current state:
- Active file: ${activePath ?? '(none)'}
- Files:${filesSummary || ' (none)'}
- Terminal:\n${terminalSummary || ' (empty)'}

To write or create a file you MUST output this exact line first, then a fenced code block containing ONLY the file contents (the actual code or text to save). Never put program output or "example output" inside a WRITE_FILE block – only the source code that should be saved to that file.
WRITE_FILE path="path/to/file.ext"
\`\`\`language
<actual file content only - the code that belongs in the file, not example output>
\`\`\`
If you want to show what the program will print, describe it in plain text (e.g. "When run, it will print: ...") and do NOT use another WRITE_FILE or a code block that looks like a file path. Only use WRITE_FILE for the real source code.
DELETE_FILE path="path/to/file.ext". RUN_CMD your command. Multiple WRITE_FILE/DELETE_FILE/RUN_CMD allowed. Reply in natural language. Be concise.`

    const modelMessages = await convertToModelMessages(messages)
    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system,
      messages: modelMessages,
    })

    return result.toUIMessageStreamResponse()
  } catch (e) {
    console.error('Workspace chat API error:', e)
    return Response.json(
      { error: e instanceof Error ? e.message : 'Workspace chat failed' },
      { status: 500 }
    )
  }
}
