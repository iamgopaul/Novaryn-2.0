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
2. WRITE – create or replace any file (paths with slashes create folders, e.g. src/utils.js).
3. DELETE – remove files from the workspace.
4. RUN – execute commands in the user's terminal.

You can restructure the workspace, refactor code across multiple files, build/scaffold workspaces, and create or delete files. Current state:
- Active file: ${activePath ?? '(none)'}
- Files:${filesSummary || ' (none)'}
- Terminal:\n${terminalSummary || ' (empty)'}

WRITE_FILE path="path/to/file.ext" then a fenced code block with content. DELETE_FILE path="path/to/file.ext". RUN_CMD your command. Multiple WRITE_FILE/DELETE_FILE/RUN_CMD in one response are allowed. All executed automatically. Reply in natural language. Be concise and helpful.`

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
