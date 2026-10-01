import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type EmailOtpType } from "@supabase/supabase-js"
import { getSupabaseConfig } from "@/lib/supabase/config"
import { safeNextPath } from "@/lib/auth/redirects"

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "")
  if (/expired/i.test(message)) return "This authentication link has expired."
  if (/already|used/i.test(message)) return "This authentication link has already been used."
  return "This authentication link is invalid."
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const type = url.searchParams.get("type")
  const requestedNext = safeNextPath(url.searchParams.get("next"), type === "recovery" ? "/reset-password" : "/verify-email")
  const next = type === "recovery" ? "/reset-password" : requestedNext
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "")
  const origin = configuredOrigin || url.origin
  const cookieStore = await cookies()
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { /* middleware persists refreshed cookies */ }
      },
    },
  })

  const code = url.searchParams.get("code")
  const tokenHash = url.searchParams.get("token_hash")
  let error: unknown = null

  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code))
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash }))
  } else {
    error = new Error("missing authentication token")
  }

  if (error) {
    const target = type === "recovery" ? "/reset-password" : "/login"
    return NextResponse.redirect(`${origin}${target}?error=${encodeURIComponent(safeErrorMessage(error))}`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  const isGoogleUser = user?.app_metadata?.provider === "google" || user?.app_metadata?.providers?.includes("google")
  if (user && isGoogleUser && next !== "/reset-password") {
    const { data: profile } = await supabase.from("profiles").select("department_id, current_level").eq("id", user.id).maybeSingle()
    if (!profile?.department_id || !profile?.current_level) return NextResponse.redirect(`${origin}/profile/complete`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
