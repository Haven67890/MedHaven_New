"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { ApplicationShell } from "@/components/layout/application-shell"
import useAuth from "@/hooks/useAuth"
import { supabase } from "@/lib/auth/supabaseClient"

function normalizeRole(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim().toLowerCase()
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (loading) return

    const verifyAccess = async () => {
      if (!user) {
        if (pathname !== "/") {
          router.replace("/login")
        }
        setReady(true)
        return
      }

      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id ?? user.id
      const userEmail = authData?.user?.email ?? user.email

      let profileRole = "student"

      if (userId || userEmail) {
        let query = supabase.from("profiles").select("role, role_name, role_id, level, is_admin").limit(1)
        if (userId) query = query.eq("id", userId)
        else if (userEmail) query = query.eq("email", userEmail)

        const { data } = await query.maybeSingle()
        const profile = (data ?? {}) as Record<string, unknown>
        const detectedRole = normalizeRole(profile.role ?? profile.role_name ?? profile.user_role ?? profile.access_role)
        if (detectedRole === "admin" || detectedRole === "super_admin") {
          profileRole = detectedRole
        }
      }

      const isAdmin = profileRole === "admin" || profileRole === "super_admin"

      if (pathname.startsWith("/admin") && !isAdmin) {
        router.replace("/dashboard")
        return
      }

      setReady(true)
    }

    void verifyAccess()
  }, [loading, pathname, router, user])

  if (loading || !ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Checking access...
      </div>
    )
  }

  return <ApplicationShell>{children}</ApplicationShell>
}
