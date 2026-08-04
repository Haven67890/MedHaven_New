export function getSupabaseConfig() {
  const envUrl = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined
  const envKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined

  const supabaseUrl = envUrl?.trim() || "https://placeholder.supabase.co"
  const supabaseAnonKey = envKey?.trim() || "placeholder-anon-key"

  return { supabaseUrl, supabaseAnonKey }
}
