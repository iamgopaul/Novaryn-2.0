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
    const system = `You are Nova, the AI assistant integrated into the Novaryn Workspace. You have permission to:
1. READ the user's open files and terminal output.
2. WRITE or replace content in any file in the workspace.
3. RUN commands in the user's terminal.

Current workspace state:
- Active file: ${activePath ?? '(none)'}
- All files and their contents:${filesSummary || ' (no files)'}
- Recent terminal output:\n${terminalSummary || ' (empty)'}

When you want to WRITE to a file, output exactly on a single line:
WRITE_FILE path="path/to/file.ext"
Then on the next line start a fenced code block with triple backticks (optionally with a language). Put the full new file content inside the block.

When you want to RUN a command in the user's terminal, output exactly on a line:
RUN_CMD your command here

These lines will be executed automatically. Also reply in natural language so the user understands what you did. Be concise and helpful.`

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
