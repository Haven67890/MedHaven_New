import { NextResponse } from "next/server"

/**
 * Phase 1 pass-through middleware.
 * Authentication and session refresh will be introduced in a future phase.
 */
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
