import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseConfig } from "@/lib/supabase/config"
import { isEmailVerified, safeNextPath } from "@/lib/auth/redirects"
import { appHomePath, getUserEcosystemContext } from "@/lib/jositex"

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/features", "/courses", "/about", "/contact", "/medhaven/landing"]
const PUBLIC_API_ROUTES = ["/api/auth/callback", "/api/donations/verify", "/api/image-proxy", "/api/slideshare-embed"]
const LEGACY_APP_PREFIXES = [
  "/dashboard", "/library", "/materials", "/profile", "/admin", "/notifications", "/settings",
  "/past-questions", "/lectures", "/flashcards", "/quizzes", "/timetable", "/progress", "/marketplace",
  "/clinical-guides", "/tutorials", "/directory", "/donate", "/osce", "/practical",
]

function isPublicApi(pathname: string) {
  return PUBLIC_API_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname.startsWith("/_next") || pathname.includes(".") || pathname === "/favicon.ico") return NextResponse.next()
  if (pathname === "/api/auth/callback") return NextResponse.next()

  let response = NextResponse.next({ request: { headers: request.headers } })
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const redirectWithCookies = (target: string | URL) => {
    const redirectResponse = NextResponse.redirect(typeof target === "string" ? new URL(target, request.url) : target)
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie.name, cookie.value, {
      path: cookie.path, domain: cookie.domain, maxAge: cookie.maxAge, secure: cookie.secure,
      sameSite: cookie.sameSite, expires: cookie.expires, httpOnly: cookie.httpOnly,
    }))
    return redirectResponse
  }

  const { data: { user } } = await supabase.auth.getUser()
  const isApi = pathname.startsWith("/api")

  if (isApi) {
    if (isPublicApi(pathname)) return response
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isEmailVerified(user)) return NextResponse.json({ error: "Email verification required" }, { status: 403 })
    return response
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  const isAuthFlowRoute = pathname === "/verify-email" || pathname === "/forgot-password" || pathname === "/reset-password"
  if (user && !isEmailVerified(user) && !isAuthFlowRoute) {
    return redirectWithCookies(`/verify-email?email=${encodeURIComponent(user.email ?? "")}&next=${encodeURIComponent(safeNextPath(pathname))}`)
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const context = await getUserEcosystemContext(supabase, user.id)
    if (context) return redirectWithCookies(appHomePath(context.app.slug))
    const { data: profile } = await supabase.from("profiles").select("department_id, current_level").eq("id", user.id).maybeSingle()
    if (!profile?.department_id || !profile.current_level) return redirectWithCookies("/profile/complete")
    return redirectWithCookies("/")
  }

  if (user && pathname === "/profile/complete") {
    const { data: profile } = await supabase.from("profiles").select("department_id, current_level").eq("id", user.id).maybeSingle()
    if (profile?.department_id && profile.current_level) {
      const context = await getUserEcosystemContext(supabase, user.id)
      return redirectWithCookies(appHomePath(context?.app.slug))
    }
  }

  const isLegacyAppRoute = LEGACY_APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const isMedHavenRoute = pathname === "/medhaven" || (pathname.startsWith("/medhaven/") && !pathname.startsWith("/medhaven/landing"))
  const isPoliteiaRoute = pathname === "/politeia" || pathname.startsWith("/politeia/")

  if (user && (isLegacyAppRoute || isMedHavenRoute || isPoliteiaRoute)) {
    const context = await getUserEcosystemContext(supabase, user.id)
    if (!context) {
      const { data: profileState } = await supabase.from("profiles").select("department_id, current_level").eq("id", user.id).maybeSingle()
      if (!profileState?.department_id || !profileState?.current_level) {
        if (pathname !== "/profile/complete") return redirectWithCookies("/profile/complete")
      } else if (pathname !== "/") {
        return redirectWithCookies("/")
      }
    } else if (isPoliteiaRoute && context.app.slug !== "politeia") {
      return redirectWithCookies(appHomePath(context.app.slug))
    } else if ((isMedHavenRoute || isLegacyAppRoute) && context.app.slug !== "medhaven") {
      return redirectWithCookies(appHomePath(context.app.slug))
    } else if (isMedHavenRoute && pathname !== "/medhaven/landing") {
      return redirectWithCookies("/dashboard")
    }
  }

  if (!user && !isPublicRoute && (isLegacyAppRoute || isMedHavenRoute || isPoliteiaRoute)) {
    return redirectWithCookies(`/login?next=${encodeURIComponent(safeNextPath(pathname))}`)
  }

  if (user && pathname.startsWith("/admin")) {
    const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    const role = String(profileData?.role ?? "").toLowerCase()
    if (!["admin", "super_admin", "moderator"].includes(role)) return redirectWithCookies("/dashboard")
  }

  return response
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] }
