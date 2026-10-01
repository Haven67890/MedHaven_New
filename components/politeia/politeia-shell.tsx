"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BriefcaseBusiness, CalendarDays, ClipboardList, FileQuestion, Library, Menu, Presentation, Search, Sparkles, Users, Waypoints, X } from "lucide-react"
import { useState } from "react"
import type { EcosystemApp, EcosystemFeature } from "@/lib/jositex"
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
  const navItems = (features.length ? features.map((feature) => ({ label: feature.name, slug: feature.slug, href: feature.href || `/politeia/${feature.slug}`, Icon: iconByKey[feature.slug] || Library })) : fallbackFeatures.map(([label, slug, href, Icon]) => ({ label, slug, href, Icon }))).filter((item) => item.href.startsWith("/politeia"))
  return <div className="min-h-svh bg-slate-950 text-slate-100"><header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"><Link href="/politeia" className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-indigo-400 text-slate-950"><Waypoints className="size-5" /></span><span><span className="block font-bold tracking-tight">POLITEIA</span><span className="block text-[10px] uppercase tracking-[0.2em] text-slate-400">JositeX · {departmentName || "Political Science"}</span></span></Link><div className="hidden items-center gap-3 md:flex"><span className="text-sm text-slate-400">{app.name}</span><Button asChild variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href="/">JositeX home</Link></Button></div><Button variant="ghost" size="icon" className="text-slate-200 md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</Button></div></header><div className="mx-auto grid max-w-7xl md:grid-cols-[250px_1fr]"><aside className={cn("border-r border-white/10 p-4 md:min-h-[calc(100svh-4rem)]", menuOpen ? "block" : "hidden md:block")}><nav className="space-y-1" aria-label="POLITEIA navigation">{navItems.map((item) => <Link key={item.slug} href={item.href} onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", pathname === item.href || (item.href !== "/politeia" && pathname.startsWith(`${item.href}/`)) ? "bg-indigo-400/15 text-indigo-200" : "text-slate-400 hover:bg-white/5 hover:text-white")}><item.Icon className="size-4" /><span>{item.label}</span></Link>)}</nav></aside><main className="p-5 sm:p-8"><div className="mx-auto max-w-5xl">{children}</div></main></div></div>
}
