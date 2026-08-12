import { createBrowserClient } from "@supabase/ssr"

import { getSupabaseConfig } from "@/lib/supabase/config"

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (typeof window === "undefined") {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  if (browserClient) return browserClient

  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)

  return browserClient
}
