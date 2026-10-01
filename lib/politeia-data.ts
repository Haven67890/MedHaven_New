import type { SupabaseClient } from "@supabase/supabase-js"

export async function getPoliteiaRows(supabase: SupabaseClient, table: string, limit = 100): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from(table).select("*").limit(limit)
  if (error) {
    console.warn(`Unable to load POLITEIA ${table}:`, error.message)
    return []
  }
  return (data ?? []) as Record<string, unknown>[]
}
