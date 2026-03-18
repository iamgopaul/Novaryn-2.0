/**
 * Vercel serverless: POST /api/auth/verify-2fa
 * Verifies 2FA code. Requires SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL in Vercel env.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return Response.json(
      { error: 'Server missing Supabase env vars' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })

  try {
    const { userId, code } = (await request.json()) as { userId?: string; code?: string }
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
