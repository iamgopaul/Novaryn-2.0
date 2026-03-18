'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string
  const username = formData.get('username') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || 
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      data: {
        display_name: displayName,
        username: username,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/auth/sign-up-success')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Check if user has 2FA enabled
  const { data: profile } = await supabase
    .from('profiles')
    .select('two_factor_enabled')
    .eq('id', data.user.id)
    .single()

  if (profile?.two_factor_enabled) {
    // Generate and send 2FA code
    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await supabase.from('two_factor_codes').insert({
      user_id: data.user.id,
      code,
      expires_at: expiresAt.toISOString(),
    })

    // Send email with code
    await resend.emails.send({
      from: 'Novaryn <noreply@novaryn.dev>',
      to: email,
      subject: 'Your Novaryn 2FA Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #06b6d4;">Novaryn Verification Code</h1>
          <p>Your two-factor authentication code is:</p>
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0891b2;">${code}</span>
          </div>
          <p style="color: #666;">This code will expire in 10 minutes.</p>
          <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    })

    // Sign out temporarily until 2FA is verified
    await supabase.auth.signOut()
    
    return { requires2FA: true, email }
  }

  redirect('/dashboard')
}

export async function verify2FA(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const code = formData.get('code') as string
  const password = formData.get('password') as string

  // First sign in to get user ID
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    return { error: 'Authentication failed' }
  }

  // Verify the code
  const { data: codeData, error: codeError } = await supabase
    .from('two_factor_codes')
    .select('*')
    .eq('user_id', authData.user.id)
    .eq('code', code)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (codeError || !codeData) {
    await supabase.auth.signOut()
    return { error: 'Invalid or expired code' }
  }

  // Mark code as used
  await supabase
    .from('two_factor_codes')
    .update({ used: true })
    .eq('id', codeData.id)

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function enable2FA() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ two_factor_enabled: true })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function disable2FA() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ two_factor_enabled: false })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
