/**
 * Vercel serverless: POST /api/chat/workspace – Nova with workspace context (Groq).
 * Set GROQ_API_KEY in Vercel project Environment Variables.
 */
import { groq } from '@ai-sdk/groq'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'GROQ_API_KEY is not configured. Add it in Vercel Project Settings → Environment Variables.' },
      { status: 500 }
    )
  }

  try {
    const body = (await req.json()) as {
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
      .map(
        ([path, content]) =>
          `\n--- ${path} ---\n${String(content).slice(0, 8000)}${String(content).length > 8000 ? '\n... (truncated)' : ''}`
      )
      .join('')
    const terminalSummary = terminalLines.slice(-80).join('')
    const system = `You are Nova, the AI assistant integrated into the Novaryn Workspace. You have full control to:

1. READ – all open files and terminal output.
2. WRITE – create or replace any file (use path with slashes for folders, e.g. src/utils.js).
3. DELETE – remove files from the workspace.
4. RUN – execute commands in the user's terminal.

You can: restructure the workspace (create folders, move/rename files by writing to new path and deleting old), refactor code across multiple files (use multiple WRITE_FILE blocks), build or scaffold workspaces (create many files at once), and create or delete files as needed.

Current workspace state:
- Active file: ${activePath ?? '(none)'}
- All files and their contents:${filesSummary || ' (no files)'}
- Recent terminal output:\n${terminalSummary || ' (empty)'}

To WRITE or create a file, output exactly on a single line:
WRITE_FILE path="path/to/file.ext"
Then on the next line start a fenced code block with triple backticks (optionally with a language). Put the full file content inside the block. You can output multiple WRITE_FILE blocks to create or update several files (e.g. refactor or scaffold a project).

To DELETE a file, output exactly on a line:
DELETE_FILE path="path/to/file.ext"
You can output multiple DELETE_FILE lines to remove several files. Use this to clean up, move (write new path then delete old), or restructure.

To RUN a command in the user's terminal, output exactly on a line:
RUN_CMD your command here

All WRITE_FILE, DELETE_FILE, and RUN_CMD lines are executed automatically. Also reply in natural language so the user understands what you did. Be concise and helpful.`

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
