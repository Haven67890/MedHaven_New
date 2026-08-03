"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { MedHavenLogo } from "@/components/brand/medhaven-logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import useAuth from "@/hooks/useAuth"
import { supabase } from "@/lib/auth/supabaseClient"

function normalizeRole(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim().toLowerCase()
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (loading) return

    const redirectAuthenticatedUser = async () => {
      if (!user) {
        setReady(true)
        return
      }

      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id ?? user.id
      const userEmail = authData?.user?.email ?? user.email

      let role = "student"
      if (userId || userEmail) {
        let query = supabase.from("profiles").select("role, role_name, level, is_admin").limit(1)
        if (userId) query = query.eq("id", userId)
        else if (userEmail) query = query.eq("email", userEmail)

        const { data } = await query.maybeSingle()
        const profile = (data ?? {}) as Record<string, unknown>
        const detectedRole = normalizeRole(profile.role ?? profile.role_name ?? profile.user_role ?? profile.access_role)
        if (detectedRole === "admin" || detectedRole === "super_admin") {
          role = detectedRole
        }
      }

      if (pathname === "/login" || pathname === "/register") {
        router.replace(role === "admin" || role === "super_admin" ? "/admin" : "/dashboard")
        return
      }

      setReady(true)
    }

    void redirectAuthenticatedUser()
  }, [loading, pathname, router, user])

  if (loading || !ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Preparing your session...
      </div>
    )
  }

  return (
    <div className="relative flex min-h-svh bg-background">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <aside className="hidden w-[42%] flex-col justify-between border-r border-border bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
        <MedHavenLogo href="/" inverse />
        <div className="flex max-w-md flex-col gap-5">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/70">MedHaven</p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight xl:text-5xl">A thoughtful foundation for care, connection, and progress.</h1>
          <p className="text-pretty text-lg leading-relaxed text-primary-foreground/75">A modern platform is taking shape—built to be clear, dependable, and easy to use from the very beginning.</p>
        </div>
        <p className="text-sm text-primary-foreground/65">Secure foundation. Human-centered design.</p>
      </aside>
      <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-20 sm:px-8">
        <div className="flex w-full max-w-md flex-col gap-8">
          <div className="lg:hidden">
            <MedHavenLogo href="/" />
          </div>
          {children}
          <Link href="/" className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Return to home
          </Link>
        </div>
      </main>
    </div>
  )
}
