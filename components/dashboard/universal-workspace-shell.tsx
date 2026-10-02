"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Briefcase, Brain, Calendar, CalendarDays, ClipboardList, FileQuestion, GraduationCap, LayoutDashboard, Library, LogOut, Menu, NotebookPen, Settings, TrendingUp, Users, Waypoints, X } from "lucide-react"
import { useState } from "react"
import type { EcosystemApp, EcosystemFeature } from "@/lib/jositex"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

const icons: Record<string, typeof Library> = {
  courses: Library, "study-library": Library, "past-questions": FileQuestion, quizzes: ClipboardList,
  flashcards: Brain, tutorials: GraduationCap, assignments: NotebookPen, "assignment-guide": NotebookPen,
  timetable: CalendarDays, "academic-calendar": Calendar, calendar: Calendar, progress: TrendingUp,
  notifications: Calendar, research: Waypoints, "research-hub": Waypoints, staff: Users,
  "staff-directory": Users, careers: Briefcase, "career-pathways": Briefcase,
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function UniversalWorkspaceShell({
  app,
  departmentName,
  facultyName,
  universityName,
  features,
  children,
}: {
  app: EcosystemApp
  departmentName: string | null
  facultyName: string | null
  universityName: string | null
  features: EcosystemFeature[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const navItems = features.filter((feature) => feature.href).map((feature) => ({ ...feature, Icon: icons[feature.slug] || Library }))

  const closeMenu = () => setMenuOpen(false)
  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      closeMenu()
      router.replace("/login")
      router.refresh()
      setLoggingOut(false)
    }
  }

  const linkClass = (href: string, extra = "") => cn(
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
    isActivePath(pathname, href) ? "bg-cyan-300/15 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-white",
    extra,
  )

  return <div className="min-h-svh bg-slate-950 text-slate-100">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3" onClick={closeMenu}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950"><LayoutDashboard className="size-5" /></span>
          <span className="min-w-0"><span className="block truncate font-bold tracking-tight">{app.name}</span><span className="block truncate text-[10px] uppercase tracking-[0.18em] text-slate-400">JositeX · {departmentName || "Department workspace"}</span></span>
        </Link>
        <div className="flex items-center gap-2"><span className="hidden text-right text-xs text-slate-500 sm:block">{facultyName || universityName ? `${facultyName || ""}${facultyName && universityName ? " · " : ""}${universityName || ""}` : "Department workspace"}</span><Button variant="ghost" size="icon" className="text-slate-200 md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="universal-workspace-nav" aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</Button></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl md:grid-cols-[250px_1fr]">
      <aside id="universal-workspace-nav" className={cn("border-r border-white/10 p-4 md:min-h-[calc(100svh-4rem)]", menuOpen ? "block" : "hidden md:block")}>
        <nav className="space-y-1" aria-label={`${app.name} navigation`}>
          <Link href="/dashboard" onClick={closeMenu} className={linkClass("/dashboard", "mb-3")} aria-current={pathname === "/dashboard" ? "page" : undefined}><LayoutDashboard className="size-4" /><span>Dashboard</span></Link>
          {navItems.map((item) => <Link key={item.id} href={item.href!} onClick={closeMenu} className={linkClass(item.href!)} aria-current={isActivePath(pathname, item.href!) ? "page" : undefined}><item.Icon className="size-4" /><span>{item.name}</span></Link>)}
          <Link href="/profile" onClick={closeMenu} className={linkClass("/profile", "mt-3")} aria-current={isActivePath(pathname, "/profile") ? "page" : undefined}><Users className="size-4" /><span>Profile</span></Link>
          <Link href="/settings" onClick={closeMenu} className={linkClass("/settings")} aria-current={isActivePath(pathname, "/settings") ? "page" : undefined}><Settings className="size-4" /><span>Settings</span></Link>
          <button type="button" onClick={handleLogout} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-wait disabled:opacity-60"><LogOut className="size-4" /><span>{loggingOut ? "Logging out…" : "Logout"}</span></button>
        </nav>
      </aside>
      <main className="min-w-0 p-5 sm:p-8"><div className="mx-auto max-w-6xl">{children}</div></main>
    </div>
  </div>
}
