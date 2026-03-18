import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Delete any existing unused codes for this user
    await supabase
      .from('two_factor_codes')
      .delete()
      .eq('user_id', userId)
      .eq('used', false)

    // Insert new code
    const { error: insertError } = await supabase
      .from('two_factor_codes')
      .insert({
        user_id: userId,
        code,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('Error inserting 2FA code:', insertError)
      return NextResponse.json(
        { error: 'Failed to generate verification code' },
        { status: 500 }
      )
    }

    // Send email with Resend
    const { error: emailError } = await resend.emails.send({
      from: 'Novaryn <noreply@resend.dev>',
      to: email,
      subject: 'Your Novaryn Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0891b2; margin-bottom: 24px;">Novaryn</h1>
          <h2 style="color: #1f2937; margin-bottom: 16px;">Your Verification Code</h2>
          <p style="color: #4b5563; margin-bottom: 24px;">
            Use the following code to complete your sign-in. This code expires in 10 minutes.
          </p>
          <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    })

    if (emailError) {
      console.error('Error sending email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('2FA send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
