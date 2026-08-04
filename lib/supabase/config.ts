export function getSupabaseConfig() {
  const envUrl = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined
  const envKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined

  // Base URL specified by task: https://fexsfbdvewlmvzfnwqul.supabase.co
  const supabaseUrl = envUrl?.trim() || "https://fexsfbdvewlmvzfnwqul.supabase.co"
  const supabaseAnonKey = envKey?.trim() || "placeholder-anon-key"

  return { supabaseUrl, supabaseAnonKey }
}
