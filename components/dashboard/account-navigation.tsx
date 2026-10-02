"use client"

import Link from "next/link"
import { LogOut, Settings, UserRound } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import useAuth from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

type AccountNavigationProps = {
  accentClassName?: string
  className?: string
  onNavigate?: () => void
}

export function AccountNavigation({
  accentClassName = "bg-cyan-300/15 text-cyan-200",
  className,
  onNavigate,
}: AccountNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const linkClass = (href: string) => cn(
    "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
    pathname === href || pathname.startsWith(`${href}/`) ? accentClassName : "text-slate-400 hover:bg-white/5 hover:text-white",
    className,
  )

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      onNavigate?.()
      router.replace("/login")
      router.refresh()
      setLoggingOut(false)
    }
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-3" aria-label="Account navigation">
      <Link href="/profile" onClick={onNavigate} className={linkClass("/profile")} aria-current={pathname.startsWith("/profile") ? "page" : undefined}>
        <UserRound className="size-4 shrink-0" />
        <span>Profile</span>
      </Link>
      <Link href="/settings" onClick={onNavigate} className={linkClass("/settings")} aria-current={pathname.startsWith("/settings") ? "page" : undefined}>
        <Settings className="size-4 shrink-0" />
        <span>Settings</span>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-wait disabled:opacity-60"
      >
        <LogOut className="size-4 shrink-0" />
        <span>{loggingOut ? "Logging out…" : "Logout"}</span>
      </button>
    </div>
  )
}
