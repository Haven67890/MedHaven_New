import { createClient as createJSClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/lib/supabase/config'

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

export const supabase = createJSClient(supabaseUrl, supabaseAnonKey)
