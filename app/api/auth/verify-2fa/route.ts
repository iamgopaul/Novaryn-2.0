import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, code } = await request.json()

    if (!userId || !code) {
      return NextResponse.json(
        { error: 'User ID and code are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find valid code
    const { data: codeRecord, error: fetchError } = await supabase
      .from('two_factor_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (fetchError || !codeRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Mark code as used
    await supabase
      .from('two_factor_codes')
      .update({ used: true })
      .eq('id', codeRecord.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('2FA verify error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
