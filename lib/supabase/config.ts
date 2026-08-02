const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://placeholder.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "placeholder-anon-key"

export function getSupabaseConfig() {
  return { supabaseUrl, supabaseAnonKey }
}
