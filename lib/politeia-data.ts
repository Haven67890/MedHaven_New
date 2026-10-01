import type { SupabaseClient } from "@supabase/supabase-js"

export type PoliteiaQueryResult = {
  rows: Record<string, unknown>[]
  error: string | null
}

export async function getPoliteiaRows(supabase: SupabaseClient, table: string, limit = 100): Promise<PoliteiaQueryResult> {
  const { data, error } = await supabase.from(table).select("*").limit(limit)
  if (error) {
    console.warn(`Unable to load POLITEIA ${table}:`, error.message)
    return { rows: [], error: "This section is temporarily unavailable." }
  }
  return { rows: (data ?? []) as Record<string, unknown>[], error: null }
}
