export function getSupabaseConfig() {
  const envUrl = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined
  const envKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined

  const supabaseUrl = envUrl?.trim()
  const supabaseAnonKey = envKey?.trim()

  // Throw clear errors if missing, but fallback gracefully to avoid crashing during static build step
  const isStaticBuild = typeof process !== 'undefined' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl) {
    if (isStaticBuild) {
      return {
        supabaseUrl: "https://fexsfbdvewlmvzfnwqul.supabase.co",
        supabaseAnonKey: supabaseAnonKey || "placeholder-anon-key"
      }
    }
    throw new Error("NEXT_PUBLIC_SUPABASE_URL environment variable is missing!")
  }
  if (!supabaseAnonKey) {
    if (isStaticBuild) {
      return {
        supabaseUrl,
        supabaseAnonKey: "placeholder-anon-key"
      }
    }
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is missing!")
  }

  return { supabaseUrl, supabaseAnonKey }
}
