import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseConfig } from "@/lib/supabase/config"
import { appHomePath, getUserEcosystemContext } from "@/lib/jositex"

const PUBLIC_ROUTES = ["/", "/login", "/register", "/features", "/courses", "/about", "/contact", "/medhaven/landing"]

const LEGACY_APP_PREFIXES = [
  "/dashboard", "/library", "/materials", "/profile", "/admin", "/notifications", "/settings",
  "/past-questions", "/lectures", "/flashcards", "/quizzes", "/timetable", "/progress", "/marketplace",
  "/clinical-guides", "/tutorials", "/directory", "/donate", "/osce", "/practical",
]

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

  // If already logged in and visiting login/register, let the app resolver choose the destination.
  if (user && (pathname === "/login" || pathname === "/register")) {
    const context = await getUserEcosystemContext(supabase, user.id)
    return redirectWithCookies(appHomePath(context?.app.slug))
  }

  // Force onboarding details completion only for Google Sign-In and incomplete profiles
  if (user && !pathname.startsWith("/api")) {
    const isGoogleUser = user.app_metadata?.provider === "google" ||
                         user.app_metadata?.providers?.includes("google")

    if (isGoogleUser) {
      if (pathname !== "/profile/complete") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("department_id, current_level")
          .eq("id", user.id)
          .maybeSingle()

        if (!profile || !profile.department_id || !profile.current_level) {
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

  const isLegacyAppRoute = LEGACY_APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const isMedHavenRoute = pathname === "/medhaven" || (pathname.startsWith("/medhaven/") && !pathname.startsWith("/medhaven/landing"))
  const isPoliteiaRoute = pathname === "/politeia" || pathname.startsWith("/politeia/")

  // If authenticated, enforce the department/application mapping for both new and legacy routes.
  if (user && (isLegacyAppRoute || isMedHavenRoute || isPoliteiaRoute)) {
    const context = await getUserEcosystemContext(supabase, user.id)
    if (!context) {
      const { data: profileState } = await supabase
        .from("profiles")
        .select("department_id, current_level")
        .eq("id", user.id)
        .maybeSingle()
      const hasCompleteInstitutionalProfile = Boolean(profileState?.department_id && profileState?.current_level)
      if (!hasCompleteInstitutionalProfile) {
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

  // If no user and route is protected, redirect to login
  if (!user && !isPublicRoute) {
    const isProtected =
      isLegacyAppRoute || isMedHavenRoute || isPoliteiaRoute

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
