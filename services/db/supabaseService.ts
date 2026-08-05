import { createClient } from '../../lib/supabase/client'

export function getSupabase() {
  return createClient()
}
