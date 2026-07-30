import { createClient } from '@supabase/supabase-js'

// Supabase client used throughout the app. Reads from NEXT_PUBLIC_* env vars so it is safe on the client.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
