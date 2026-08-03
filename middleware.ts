import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

const PUBLIC_ROUTES = ["/", "/login", "/register"]


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

  // Public routes are always accessible
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  // Create Supabase server client to check session
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session and route is protected, redirect to login
  if (!session) {
    const isProtected =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/library") ||
      pathname.startsWith("/materials") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/courses") ||
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
      return NextResponse.redirect(new URL("/login", request.url))
    }

    return NextResponse.next()
  }

  // If authenticated, check admin access
  if (pathname.startsWith("/admin")) {
    // Check if user has admin role
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role, role_name, is_admin")
      .eq("id", session.user.id)
      .maybeSingle()

    const profile = profileData as Record<string, unknown> | null
    const role = String(
      profile?.role ?? profile?.role_name ?? ""
    ).toLowerCase()
    const isAdmin =
      role === "admin" ||
      role === "super_admin" ||
      Boolean(profile?.is_admin)

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  // If already logged in and visiting login/register, redirect to dashboard
  if (session && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
