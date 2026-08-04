import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  // Dynamic Host resolution as requested by fallback redirect logic
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const finalOrigin = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL || 'https://medhaven.onrender.com')

  // Initialize Supabase Client
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  // 1. Handle Google OAuth (PKCE Code)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Resolve first-time Google sign-in details completion check
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('department, level')
            .eq('id', user.id)
            .maybeSingle()

          if (!profile || !profile.department || !profile.level) {
            // Skeleton profile upsert to allow client RLS and updating
            if (!profile) {
              await supabase.from('profiles').upsert({
                id: user.id,
                email: user.email?.trim().toLowerCase(),
                full_name: user.user_metadata?.full_name || '',
                role: 'student'
              }, { onConflict: 'id' })
            }
            return NextResponse.redirect(`${finalOrigin}/profile/complete`)
          }
        }
      } catch (profileErr) {
        console.warn("Profile checking gracefully ignored on callback:", profileErr)
      }

      return NextResponse.redirect(`${finalOrigin}${next}`)
    }
    return NextResponse.redirect(`${finalOrigin}/login?error=${encodeURIComponent(error.message)}`)
  }

  // 2. Handle Email Verification (Token Hash)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    })
    if (!error) {
      return NextResponse.redirect(`${finalOrigin}${next}`)
    }
    return NextResponse.redirect(`${finalOrigin}/login?error=${encodeURIComponent(error.message)}`)
  }

  // 3. Fallback Error (Neither code nor token_hash found)
  return NextResponse.redirect(`${finalOrigin}/login?error=Invalid+or+expired+authentication+link`)
}
