// Supabase client for browser-side operations
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env')
}

export function createClient() {
  return createSupabaseClient(
    supabaseUrl!,
    supabaseAnonKey!
  )
}
