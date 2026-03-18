'use server'

import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendTwoFactorCode(userId: string, email: string) {
  const supabase = await createClient()
  const code = generateCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  // Invalidate any existing codes
  await supabase
    .from('two_factor_codes')
    .update({ used: true })
    .eq('user_id', userId)
    .eq('used', false)

  // Create new code
  const { error: insertError } = await supabase
    .from('two_factor_codes')
    .insert({
      user_id: userId,
      code,
      expires_at: expiresAt.toISOString(),
    })

  if (insertError) {
    return { success: false, error: 'Failed to generate verification code' }
  }

  // Send email via Resend
  try {
    await resend.emails.send({
      from: 'Novaryn <noreply@resend.dev>',
      to: email,
      subject: 'Your Novaryn Verification Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0891b2;">Novaryn</h1>
          <h2>Your Verification Code</h2>
          <p>Enter this code to complete your sign in:</p>
          <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #18181b;">${code}</span>
          </div>
          <p style="color: #71717a;">This code expires in 10 minutes.</p>
          <p style="color: #71717a;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to send verification email' }
  }
}

export async function verifyTwoFactorCode(userId: string, code: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('two_factor_codes')
    .select('*')
    .eq('user_id', userId)
    .eq('code', code)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) {
    return { success: false, error: 'Invalid or expired verification code' }
  }

  // Mark code as used
  await supabase
    .from('two_factor_codes')
    .update({ used: true })
    .eq('id', data.id)

  return { success: true }
}

export async function enableTwoFactor(userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ two_factor_enabled: true })
    .eq('id', userId)

  if (error) {
    return { success: false, error: 'Failed to enable 2FA' }
  }

  return { success: true }
}

export async function disableTwoFactor(userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ two_factor_enabled: false })
    .eq('id', userId)

  if (error) {
    return { success: false, error: 'Failed to disable 2FA' }
  }

  return { success: true }
}
