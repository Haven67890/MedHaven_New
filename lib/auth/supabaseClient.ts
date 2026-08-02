import { createClient } from '@supabase/supabase-js'

// Supabase client used throughout the app. Reads from NEXT_PUBLIC_* env vars so it is safe on the client.
// Fallback values allow the app to compile in CI/build environments where these secrets are not configured yet.
// A non-empty fallback keeps the app buildable in environments where live credentials are not configured,
// while still using the real values automatically when they are present.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://placeholder.supabase.cohttps://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'placeholder-anon-keyplaceholder-anon-key'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
