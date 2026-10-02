import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type EmailOtpType } from "@supabase/supabase-js"
import { getSupabaseConfig } from "@/lib/supabase/config"
import { resolveAuthenticatedDestination } from "@/lib/auth/destination"

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "")
  if (/expired/i.test(message)) return "This authentication link has expired."
  if (/already|used/i.test(message)) return "This authentication link has already been used."
  return "This authentication link is invalid."
}

function isLocalOrigin(origin: string) {
  try {
    const hostname = new URL(origin).hostname
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  } catch {
    return true
  }
}

function getApplicationOrigin(request: Request) {
  const requestOrigin = new URL(request.url).origin
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "")
  if (configuredOrigin && (process.env.NODE_ENV !== "production" || !isLocalOrigin(configuredOrigin))) return configuredOrigin
  return requestOrigin
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const type = url.searchParams.get("type")
  const origin = getApplicationOrigin(request)
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
  if (!user) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Your authentication session could not be established.")}`)
  if (type === "recovery") return NextResponse.redirect(`${origin}/reset-password`)
  const destination = await resolveAuthenticatedDestination(supabase, user.id)
  return NextResponse.redirect(`${origin}${destination}`)
}
