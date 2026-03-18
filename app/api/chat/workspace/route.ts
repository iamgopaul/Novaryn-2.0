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

You MUST scaffold full applications when asked (e.g. "create a fitness web app", "build a todo app"). Create ALL necessary files: HTML, CSS, JavaScript/TypeScript, assets, config files, and .env when the app needs API keys or environment variables. For .env use placeholder values (e.g. API_KEY=your_key_here) and tell the user to replace with real secrets. Create multiple WRITE_FILE blocks in one response so the user sees the full project in the chat and can Accept to apply everything.

Current state:
- Active file: ${activePath ?? '(none)'}
- Files:${filesSummary || ' (none)'}
- Terminal:\n${terminalSummary || ' (empty)'}

To write or create a file you MUST output this exact line first, then a fenced code block with the FULL file content on the next line. The code block will be shown in the chat so the user can see exactly what will be written before they Accept.
WRITE_FILE path="path/to/file.ext"
\`\`\`language
<entire file content - no placeholders, no "..." - the real code>
\`\`\`
You can create: index.html, style.css, app.js or main.ts, .env, .gitignore, README.md, and any other files. Use WRITE_FILE for each file. The user sees each code block in the chat and can Accept or Decline.
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
