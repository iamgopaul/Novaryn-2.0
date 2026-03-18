/**
 * Bun API server for 2FA and chat (Nova / Groq). Run with: bun run server
 * Vite dev proxy forwards /api/* to this server.
 *
 * 2FA: Supabase (two_factor_codes) + Resend (email). Env: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.
 * Chat: Groq. Env: GROQ_API_KEY.
 */
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { groq } from '@ai-sdk/groq'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const resendApiKey = process.env.RESEND_API_KEY!

// Service role key is required for 2FA: RLS on two_factor_codes only allows SELECT where auth.uid() = user_id,
// so the server (no user context) must use service role to read/update codes.
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  supabaseServiceKey ? { auth: { persistSession: false } } : undefined
)
if (!supabaseServiceKey && (process.env.NODE_ENV !== 'test')) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set: 2FA verify may fail due to RLS. Set it in .env for production.')
}
const resend = new Resend(resendApiKey)

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const server = Bun.serve({
  port: 5001,
  hostname: '127.0.0.1',
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/api/auth/send-2fa' && req.method === 'POST') {
      try {
        const { userId, email } = (await req.json()) as { userId?: string; email?: string }
        if (!userId || !email) {
          return Response.json(
            { error: 'User ID and email are required' },
            { status: 400 }
          )
        }
        const code = generateCode()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
        await supabase.from('two_factor_codes').delete().eq('user_id', userId).eq('used', false)
        const { error: insertError } = await supabase.from('two_factor_codes').insert({
          user_id: userId,
          code,
          expires_at: expiresAt.toISOString(),
        })
        if (insertError) {
          console.error('Error inserting 2FA code:', insertError)
          return Response.json({ error: 'Failed to generate verification code' }, { status: 500 })
        }
        const { error: emailError } = await resend.emails.send({
          from: 'Novaryn <noreply@resend.dev>',
          to: email,
          subject: 'Your Novaryn Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #0891b2;">Novaryn</h1>
              <h2 style="color: #1f2937;">Your Verification Code</h2>
              <p style="color: #4b5563;">Use the following code to complete your sign-in. This code expires in 10 minutes.</p>
              <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px; text-align: center;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
              </div>
            </div>
          `,
        })
        if (emailError) {
          console.error('Error sending email:', emailError)
          return Response.json({ error: 'Failed to send verification email' }, { status: 500 })
        }
        return Response.json({ success: true })
      } catch (e) {
        console.error('2FA send error:', e)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
      }
    }

    if (url.pathname === '/api/auth/verify-2fa' && req.method === 'POST') {
      try {
        const { userId, code } = (await req.json()) as { userId?: string; code?: string }
        if (!userId || !code) {
          return Response.json(
            { error: 'User ID and code are required' },
            { status: 400 }
          )
        }
        const { data: codeRecord, error: fetchError } = await supabase
          .from('two_factor_codes')
          .select('*')
          .eq('user_id', userId)
          .eq('code', code)
          .eq('used', false)
          .gt('expires_at', new Date().toISOString())
          .single()
        if (fetchError || !codeRecord) {
          return Response.json({ error: 'Invalid or expired verification code' }, { status: 400 })
        }
        await supabase.from('two_factor_codes').update({ used: true }).eq('id', codeRecord.id)
        return Response.json({ success: true })
      } catch (e) {
        console.error('2FA verify error:', e)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
      }
    }

    if (url.pathname === '/api/chat' && req.method === 'POST') {
      const groqKey = process.env.GROQ_API_KEY
      if (!groqKey) {
        return Response.json(
          { error: 'GROQ_API_KEY is not set. Add it to .env for Nova chat.' },
          { status: 500 }
        )
      }
      try {
        const body = (await req.json()) as { messages?: UIMessage[] }
        const messages = body?.messages ?? []
        if (!Array.isArray(messages) || messages.length === 0) {
          return Response.json({ error: 'messages array is required' }, { status: 400 })
        }
        const modelMessages = await convertToModelMessages(messages)
        const result = streamText({
          model: groq('llama-3.3-70b-versatile'),
          system: `You are Nova, the friendly and knowledgeable AI assistant for Novaryn, a developer hub platform. You help users with coding, debugging, documentation, best practices, and general programming questions. Be concise, clear, and supportive. When relevant, mention Novaryn's tools (projects, code editor, terminal, teams, community).`,
          messages: modelMessages,
        })
        return result.toUIMessageStreamResponse()
      } catch (e) {
        console.error('Chat error:', e)
        return Response.json(
          { error: e instanceof Error ? e.message : 'Chat failed' },
          { status: 500 }
        )
      }
    }

    if (url.pathname === '/api/workspace/run-command' && req.method === 'POST') {
      const ALLOWED = ['npm', 'npx', 'bun', 'node', 'yarn', 'java', 'javac', 'python3', 'python', 'g++', 'gcc', 'sh']
      try {
        const body = (await req.json()) as { command?: string; workspaceFiles?: Record<string, string> }
        const raw = typeof body?.command === 'string' ? body.command.trim() : ''
        const parts = raw.split(/\s+/).filter(Boolean)
        const bin = parts[0]?.toLowerCase()
        if (!bin || !ALLOWED.includes(bin)) {
          return Response.json(
            { error: 'Allowed: npm, npx, bun, node, yarn, java, javac, python3, g++, gcc, sh.' },
            { status: 400 }
          )
        }
        const workspaceFiles = (body?.workspaceFiles && typeof body.workspaceFiles === 'object') ? body.workspaceFiles as Record<string, string> : {}
        const fs = await import('fs')
        const path = await import('path')
        const tmpBase = process.env.TMPDIR || '/tmp'
        const dir = fs.mkdtempSync(path.join(tmpBase, 'novaryn-ws-'))
        try {
          for (const [filePath, content] of Object.entries(workspaceFiles)) {
            const full = path.join(dir, filePath)
            const parent = path.dirname(full)
            fs.mkdirSync(parent, { recursive: true })
            fs.writeFileSync(full, content)
          }
          const useShell = raw.includes('&&') || raw.includes(';')
          const cmd = useShell ? ['sh', '-c', raw] : [bin, ...parts.slice(1)]
          const proc = Bun.spawn(cmd, {
            cwd: dir,
            stdout: 'pipe',
            stderr: 'pipe',
            env: { ...process.env, CI: '1' },
          })
          const [stdout, stderr] = await Promise.all([
            new Response(proc.stdout).text(),
            new Response(proc.stderr).text(),
          ])
          await proc.exited
          const exitCode = proc.exitCode ?? -1
          return Response.json({ stdout, stderr, exitCode })
        } finally {
          try {
            fs.rmSync(dir, { recursive: true })
          } catch (_) {}
        }
      } catch (e) {
        console.error('Workspace run-command error:', e)
        return Response.json(
          { error: e instanceof Error ? e.message : 'Command execution failed' },
          { status: 500 }
        )
      }
    }

    if (url.pathname === '/api/chat/workspace' && req.method === 'POST') {
      const groqKey = process.env.GROQ_API_KEY
      if (!groqKey) {
        return Response.json(
          { error: 'GROQ_API_KEY is not set. Add it to .env for Nova chat.' },
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
          return Response.json({ error: 'messages array is required' }, { status: 400 })
        }
        const filesSummary = Object.entries(files)
          .map(([path, content]) => `\n--- ${path} ---\n${(content as string).slice(0, 8000)}${(content as string).length > 8000 ? '\n... (truncated)' : ''}`)
          .join('')
        const terminalSummary = terminalLines.slice(-80).join('')
        const system = `You are Nova, the AI assistant integrated into the Novaryn Workspace. You have full control to:

1. READ – all open files and terminal output.
2. WRITE – create or replace any file (paths with slashes for folders, e.g. src/utils.js). You can create dotfiles like .env, .gitignore.
3. DELETE – remove files from the workspace.
4. RUN – execute commands in the user's terminal.

Always use the exact language and file types the user asks for: TypeScript → .ts (not .js), Java → .java, Python → .py, C++ → .cpp. Do not substitute a different language.
For single-file Java programs, use "public class Main" and save as Main.java so Run works in the workspace.
You MUST scaffold full applications when asked. Create ALL necessary files in the requested language and correct extensions. Add .env when needed (placeholder values). Use multiple WRITE_FILE blocks so the user sees every file and can Accept to apply all.

Current workspace state:
- Active file: ${activePath ?? '(none)'}
- All files and their contents:${filesSummary || ' (no files)'}
- Recent terminal output:\n${terminalSummary || ' (empty)'}

To WRITE or create a file, output exactly:
WRITE_FILE path="path/to/file.ext"
Then on the next line a fenced code block with ONLY the actual file content (the source code to save). Never put program output or "example output" in a WRITE_FILE block – only the code that belongs in that file. To show example output, describe it in text; do not use another code block with a filename.
DELETE_FILE path="path/to/file.ext". RUN_CMD your command. Multiple WRITE_FILE/DELETE_FILE/RUN_CMD allowed. Reply in natural language. Be concise and helpful.`

        const modelMessages = await convertToModelMessages(messages)
        const result = streamText({
          model: groq('llama-3.3-70b-versatile'),
          system,
          messages: modelMessages,
        })
        return result.toUIMessageStreamResponse()
      } catch (e) {
        console.error('Workspace chat error:', e)
        return Response.json(
          { error: e instanceof Error ? e.message : 'Workspace chat failed' },
          { status: 500 }
        )
      }
    }

    return new Response('Not Found', { status: 404 })
  },
})

console.log(`API server running at http://127.0.0.1:${server.port}`)
