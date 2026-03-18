/**
 * Vercel serverless: POST /api/chat – streaming chat with Groq (Nova).
 * Set GROQ_API_KEY in Vercel env.
 */
import { groq } from '@ai-sdk/groq'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'

const SYSTEM_PROMPT = `You are Nova, the friendly and knowledgeable AI assistant for Novaryn, a developer hub platform. You help users with coding, debugging, documentation, best practices, and general programming questions. Be concise, clear, and supportive. When relevant, mention Novaryn's tools (projects, code editor, terminal, teams, community).`

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'GROQ_API_KEY is not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await req.json()
    const messages = (body?.messages ?? []) as UIMessage[]
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: 'messages array is required' },
        { status: 400 }
      )
    }

    const modelMessages = await convertToModelMessages(messages)
    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
    })

    return result.toUIMessageStreamResponse()
  } catch (e) {
    console.error('Chat API error:', e)
    return Response.json(
      { error: e instanceof Error ? e.message : 'Chat failed' },
      { status: 500 }
    )
  }
}
