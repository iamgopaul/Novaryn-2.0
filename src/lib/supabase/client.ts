// Supabase client for browser-side operations (singleton to avoid multiple GoTrueClient instances)
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import { logger } from '@/lib/logger'

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env', 'Supabase')
}

let client: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient(supabaseUrl!, supabaseAnonKey!)
  }
  return client
}
