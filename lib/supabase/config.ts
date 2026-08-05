export function getSupabaseConfig() {
  const envUrl = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined
  const envKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined

  const supabaseUrl = envUrl?.trim()
  const supabaseAnonKey = envKey?.trim()

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL environment variable is missing!")
  }
  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is missing!")
  }

  return { supabaseUrl, supabaseAnonKey }
}
