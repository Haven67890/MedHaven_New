"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Briefcase, Brain, Calendar, CalendarDays, ClipboardList, FileQuestion, GraduationCap, LayoutDashboard, Library, Menu, NotebookPen, TrendingUp, Users, Waypoints, X } from "lucide-react"
import { useState } from "react"
import type { EcosystemApp, EcosystemFeature } from "@/lib/jositex"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const icons: Record<string, typeof Library> = {
  courses: Library, "study-library": Library, "past-questions": FileQuestion, quizzes: ClipboardList,
  flashcards: Brain, tutorials: GraduationCap, assignments: NotebookPen, "assignment-guide": NotebookPen,
  timetable: CalendarDays, "academic-calendar": Calendar, calendar: Calendar, progress: TrendingUp,
  notifications: Calendar, research: Waypoints, "research-hub": Waypoints, staff: Users,
  "staff-directory": Users, careers: Briefcase, "career-pathways": Briefcase,
}

export function UniversalWorkspaceShell({ app, departmentName, features, children }: { app: EcosystemApp; departmentName: string | null; features: EcosystemFeature[]; children: React.ReactNode }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const navItems = features.filter((feature) => feature.href).map((feature) => ({ ...feature, Icon: icons[feature.slug] || Library }))

  return <div className="min-h-svh bg-slate-950 text-slate-100">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950"><LayoutDashboard className="size-5" /></span>
          <span className="min-w-0"><span className="block truncate font-bold tracking-tight">{app.name}</span><span className="block truncate text-[10px] uppercase tracking-[0.18em] text-slate-400">JositeX · {departmentName || "Department workspace"}</span></span>
        </Link>
        <div className="flex items-center gap-2"><span className="hidden text-sm text-slate-400 sm:inline">Department workspace</span><Button variant="ghost" size="icon" className="text-slate-200 md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</Button></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl md:grid-cols-[250px_1fr]">
      <aside className={cn("border-r border-white/10 p-4 md:min-h-[calc(100svh-4rem)]", menuOpen ? "block" : "hidden md:block")}>
        <nav className="space-y-1" aria-label={`${app.name} navigation`}>
          <Link href="/dashboard" onClick={() => setMenuOpen(false)} className={cn("mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", pathname === "/dashboard" ? "bg-cyan-300/15 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-white")}><LayoutDashboard className="size-4" /><span>Dashboard</span></Link>
          {navItems.map((item) => <Link key={item.id} href={item.href!} onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", pathname === item.href || pathname.startsWith(`${item.href}/`) ? "bg-cyan-300/15 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-white")}><item.Icon className="size-4" /><span>{item.name}</span></Link>)}
          <Link href="/profile" onClick={() => setMenuOpen(false)} className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"><Users className="size-4" /><span>Profile</span></Link>
        </nav>
      </aside>
      <main className="min-w-0 p-5 sm:p-8"><div className="mx-auto max-w-6xl">{children}</div></main>
    </div>
  </div>
}
