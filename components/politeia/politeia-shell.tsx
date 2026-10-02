"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BriefcaseBusiness, CalendarDays, ClipboardList, FileQuestion, Library, Menu, Presentation, Search, Sparkles, Users, Waypoints, X } from "lucide-react"
import { useState } from "react"

import type { EcosystemApp, EcosystemFeature } from "@/lib/jositex"
import { AccountNavigation } from "@/components/dashboard/account-navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const fallbackFeatures = [
  ["Courses", "courses", "/politeia/courses", Library], ["Study Library", "study-library", "/politeia/study-library", Library],
  ["Past Questions", "past-questions", "/politeia/past-questions", FileQuestion], ["Quizzes", "quizzes", "/politeia/quizzes", ClipboardList],
  ["Flashcards", "flashcards", "/politeia/flashcards", Sparkles], ["Timetable", "timetable", "/politeia/timetable", CalendarDays],
  ["Academic Calendar", "calendar", "/politeia/calendar", CalendarDays], ["Assignment Guide", "assignment-guide", "/politeia/assignment-guide", ClipboardList],
  ["Political Dictionary", "political-dictionary", "/politeia/political-dictionary", Search], ["Presentations", "presentations", "/politeia/presentations", Presentation],
  ["Staff Directory", "staff-directory", "/politeia/staff-directory", Users], ["Research Hub", "research", "/politeia/research", Waypoints],
  ["Career Pathways", "careers", "/politeia/careers", BriefcaseBusiness],
] as const

const iconByKey: Record<string, typeof Library> = { courses: Library, "study-library": Library, "past-questions": FileQuestion, quizzes: ClipboardList, flashcards: Sparkles, timetable: CalendarDays, calendar: CalendarDays, "assignment-guide": ClipboardList, "political-dictionary": Search, presentations: Presentation, "staff-directory": Users, research: Waypoints, careers: BriefcaseBusiness }

export function PoliteiaShell({ app, departmentName, features, children }: { app: EcosystemApp; departmentName: string | null; features: EcosystemFeature[]; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const closeMenu = () => setMenuOpen(false)
  const navItems = (features.length ? features.map((feature) => ({ label: feature.name, slug: feature.slug, href: feature.href || `/politeia/${feature.slug}`, Icon: iconByKey[feature.slug] || Library })) : fallbackFeatures.map(([label, slug, href, Icon]) => ({ label, slug, href, Icon }))).filter((item) => item.href.startsWith("/politeia"))
  const isActive = (href: string) => pathname === href || (href !== "/politeia" && pathname.startsWith(`${href}/`))

  return (
    <div className="min-h-svh overflow-x-hidden bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
          <Link href="/politeia" className="flex min-w-0 items-center gap-2.5" onClick={closeMenu}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-400 text-slate-950"><Waypoints className="size-5" /></span>
            <span className="min-w-0"><span className="block font-bold tracking-tight">POLITEIA</span><span className="block max-w-[58vw] truncate text-[10px] uppercase tracking-[0.14em] text-slate-400 sm:max-w-none sm:tracking-[0.2em]">JositeX · {departmentName || "Political Science"}</span></span>
          </Link>
          <div className="flex min-w-0 items-center gap-2"><span className="hidden max-w-[24vw] truncate text-sm text-slate-400 md:block">{app.name}</span><Button asChild variant="outline" size="sm" className="hidden border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white md:inline-flex"><Link href="/">JositeX home</Link></Button><Button variant="ghost" size="icon" className="shrink-0 text-slate-200 md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="politeia-navigation" aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</Button></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl min-w-0 md:grid-cols-[250px_minmax(0,1fr)]">
        <aside id="politeia-navigation" className={cn("max-h-[calc(100svh-4rem)] overflow-y-auto border-r border-white/10 p-3 sm:p-4 md:min-h-[calc(100svh-4rem)]", menuOpen ? "block" : "hidden md:block")}>
          <nav className="space-y-1" aria-label="POLITEIA navigation">
            <Link href="/politeia" onClick={closeMenu} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", isActive("/politeia") ? "bg-indigo-400/15 text-indigo-200" : "text-slate-400 hover:bg-white/5 hover:text-white")}><Waypoints className="size-4 shrink-0" /><span>Overview</span></Link>
            {navItems.map((item) => <Link key={item.slug} href={item.href} onClick={closeMenu} className={cn("flex min-h-11 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", isActive(item.href) ? "bg-indigo-400/15 text-indigo-200" : "text-slate-400 hover:bg-white/5 hover:text-white")} aria-current={isActive(item.href) ? "page" : undefined}><item.Icon className="size-4 shrink-0" /><span className="min-w-0 truncate">{item.label}</span></Link>)}
            <AccountNavigation accentClassName="bg-indigo-400/15 text-indigo-200" onNavigate={closeMenu} />
          </nav>
        </aside>
        <main className="min-w-0 p-4 sm:p-8"><div className="mx-auto max-w-5xl min-w-0">{children}</div></main>
      </div>
    </div>
  )
}
