/**
 * Vercel serverless: POST /api/auth/send-2fa
 * Sends 2FA code via Resend. Requires RESEND_API_KEY, SUPABASE_*, NEXT_PUBLIC_SUPABASE_* in Vercel env.
 */
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const resendApiKey = process.env.RESEND_API_KEY!

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: Request) {
  if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
    return Response.json(
      { error: 'Server missing RESEND_API_KEY or Supabase env vars' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  const resend = new Resend(resendApiKey)

  try {
    const { userId, email } = (await request.json()) as { userId?: string; email?: string }
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
