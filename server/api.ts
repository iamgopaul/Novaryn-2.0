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

    return new Response('Not Found', { status: 404 })
  },
})

console.log(`API server running at http://127.0.0.1:${server.port}`)
