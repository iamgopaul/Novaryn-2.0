// Supabase client for browser-side operations
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { logger } from '@/lib/logger'

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env', 'Supabase')
}

export function createClient() {
  return createSupabaseClient(
    supabaseUrl!,
    supabaseAnonKey!
  )
}
