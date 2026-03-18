import { streamText, convertToModelMessages, tool } from 'ai'
import { z } from 'zod'

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: 'openai/gpt-5-mini',
    system: `You are Novaryn AI, a helpful coding assistant for developers. You help with:
- Writing and debugging code
- Explaining programming concepts
- Suggesting best practices
- Helping with documentation
- Answering technical questions

Be concise, helpful, and provide code examples when relevant. Use markdown formatting for code blocks.`,
    messages: await convertToModelMessages(messages),
    tools: {
      generateCode: tool({
        description: 'Generate code snippets for the user',
        inputSchema: z.object({
          language: z.string().describe('The programming language'),
          task: z.string().describe('What the code should do'),
        }),
        execute: async ({ language, task }) => {
          return {
            language,
            task,
            suggestion: `Here's a ${language} snippet for: ${task}`,
          }
        },
      }),
      explainConcept: tool({
        description: 'Explain a programming concept',
        inputSchema: z.object({
          concept: z.string().describe('The concept to explain'),
          level: z.enum(['beginner', 'intermediate', 'advanced']).describe('Explanation complexity level'),
        }),
        execute: async ({ concept, level }) => {
          return {
            concept,
            level,
            explanation: `Explaining ${concept} at ${level} level`,
          }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
