import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseConfig } from "@/lib/supabase/config"

const PUBLIC_ROUTES = ["/", "/login", "/register", "/features", "/courses", "/about"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public assets and Next.js internals through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // Create mutable response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Get Supabase config
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  // Create Supabase server client
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const redirectWithCookies = (url: string | URL) => {
    const redirectResponse = NextResponse.redirect(typeof url === "string" ? new URL(url, request.url) : url)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
      })
    })
    return redirectResponse
  }

  // Securely verify session by fetching user info
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check route protection
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  // If already logged in and visiting login/register, redirect to dashboard
  if (user && (pathname === "/login" || pathname === "/register")) {
    return redirectWithCookies("/dashboard")
  }

  // Force onboarding details completion only for Google Sign-In and incomplete profiles
  if (user && !pathname.startsWith("/api")) {
    const isGoogleUser = user.app_metadata?.provider === "google" ||
                         user.app_metadata?.providers?.includes("google")

    if (isGoogleUser) {
      if (pathname !== "/profile/complete") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("department, current_level")
          .eq("id", user.id)
          .maybeSingle()

        if (!profile || !profile.department || !profile.current_level) {
          return redirectWithCookies("/profile/complete")
        }
      }
    } else {
      // Email signups and non-Google users should never be routed to /profile/complete
      if (pathname === "/profile/complete") {
        return redirectWithCookies("/dashboard")
      }
    }
  }

  // If no user and route is protected, redirect to login
  if (!user && !isPublicRoute) {
    const isProtected =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/library") ||
      pathname.startsWith("/materials") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/notifications") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/past-questions") ||
      pathname.startsWith("/lectures") ||
      pathname.startsWith("/flashcards") ||
      pathname.startsWith("/quizzes") ||
      pathname.startsWith("/timetable") ||
      pathname.startsWith("/progress") ||
      pathname.startsWith("/marketplace") ||
      pathname.startsWith("/clinical-guides") ||
      pathname.startsWith("/tutorials") ||
      pathname.startsWith("/directory")

    if (isProtected) {
      const loginUrl = new URL("/login", request.url)
      return redirectWithCookies(loginUrl)
    }
  }

  // If authenticated, check admin access
  if (user && pathname.startsWith("/admin")) {
    // Check if user has admin role
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const profile = profileData as Record<string, unknown> | null
    const role = String(profile?.role ?? "").toLowerCase()
    const isAdmin =
      role === "admin" ||
      role === "super_admin" ||
      role === "moderator"

    if (!isAdmin) {
      return redirectWithCookies("/dashboard")
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
