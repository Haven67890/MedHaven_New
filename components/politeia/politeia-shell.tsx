"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowRight, BookOpen, BriefcaseBusiness, CalendarDays, ClipboardList, FileQuestion, Library, LibraryBig, Menu, Presentation, Search, Sparkles, Users, Waypoints, X } from "lucide-react"
import { useState } from "react"
import type { EcosystemApp, EcosystemFeature } from "@/lib/jositex"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const defaultFeatures = [
  ["Home", "home", "Overview of your academic workspace", BookOpen],
  ["Courses", "courses", "Browse Political Science courses", Library],
  ["Study Library", "library", "Readings and academic materials", LibraryBig],
  ["Past Questions", "past-questions", "Practice with previous examinations", FileQuestion],
  ["Quizzes", "quizzes", "Test your understanding", ClipboardList],
  ["Flashcards", "flashcards", "Review key concepts", Sparkles],
  ["Timetable", "timetable", "Keep your week organized", CalendarDays],
  ["Academic Calendar", "calendar", "Important academic dates", CalendarDays],
  ["Assignment Guide", "assignments", "Plan and structure assignments", ClipboardList],
  ["Political Dictionary", "dictionary", "Explore political concepts", Search],
  ["Presentations", "presentations", "Academic presentation resources", Presentation],
  ["Staff Directory", "staff", "Find department staff", Users],
  ["Research Hub", "research", "Discover research pathways", Waypoints],
  ["Career Pathways", "careers", "Explore public affairs careers", BriefcaseBusiness],
] as const

function featureHref(feature: EcosystemFeature, fallbackSlug: string) {
  return feature.href || `/politeia?section=${encodeURIComponent(feature.slug || fallbackSlug)}`
}

export function PoliteiaShell({ app, departmentName, features }: { app: EcosystemApp; departmentName: string | null; features: EcosystemFeature[] }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const searchParams = useSearchParams()
  const activeSection = searchParams.get("section") || "home"
  const navItems = features.length ? features.map((feature) => ({ label: feature.name, slug: feature.slug || feature.id, href: featureHref(feature, feature.id), description: feature.description || "Academic workspace", Icon: Library })) : defaultFeatures.map(([label, slug, description, Icon]) => ({ label, slug, description, href: `/politeia?section=${slug}`, Icon }))

  return <div className="min-h-svh bg-slate-950 text-slate-100"><header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"><Link href="/politeia" className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-indigo-400 text-slate-950"><Waypoints className="size-5" /></span><span><span className="block font-bold tracking-tight">POLITEIA</span><span className="block text-[10px] uppercase tracking-[0.2em] text-slate-400">JositeX · {departmentName || "Political Science"}</span></span></Link><div className="hidden items-center gap-3 md:flex"><span className="text-sm text-slate-400">{app.name}</span><Button asChild variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href="/">JositeX home</Link></Button></div><Button variant="ghost" size="icon" className="text-slate-200 md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</Button></div></header><div className="mx-auto grid max-w-7xl md:grid-cols-[250px_1fr]"><aside className={cn("border-r border-white/10 p-4 md:min-h-[calc(100svh-4rem)]", menuOpen ? "block" : "hidden md:block")}><nav className="space-y-1" aria-label="POLITEIA navigation">{navItems.map((item) => <Link key={item.slug} href={item.href} onClick={() => setMenuOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", activeSection === item.slug ? "bg-indigo-400/15 text-indigo-200" : "text-slate-400 hover:bg-white/5 hover:text-white")}><item.Icon className="size-4" /><span>{item.label}</span></Link>)}</nav></aside><main className="p-5 sm:p-8"><div className="mx-auto max-w-5xl"><div className="mb-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">Political Science academic environment</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Welcome to POLITEIA.</h1><p className="mt-3 max-w-2xl text-slate-400">A focused JositeX workspace for learning, research, and professional development in Political Science.</p></div><div className="grid gap-4 sm:grid-cols-3"><Card className="border-white/10 bg-white/[0.04] text-white"><CardHeader><CardTitle className="text-sm text-slate-400">Environment</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">POLITEIA</p><p className="mt-1 text-xs text-slate-500">{departmentName || "Political Science"}</p></CardContent></Card><Card className="border-white/10 bg-white/[0.04] text-white"><CardHeader><CardTitle className="text-sm text-slate-400">Your next step</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">Explore courses</p><p className="mt-1 text-xs text-slate-500">Start with your academic plan</p></CardContent></Card><Card className="border-white/10 bg-white/[0.04] text-white"><CardHeader><CardTitle className="text-sm text-slate-400">JositeX</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">One connected ecosystem</p><p className="mt-1 text-xs text-slate-500">Department-aware by design</p></CardContent></Card></div><Card className="mt-6 border-indigo-300/15 bg-gradient-to-br from-indigo-400/10 to-transparent text-white"><CardHeader><div className="flex items-center justify-between gap-4"><div><CardTitle className="text-xl">{activeSection === "home" ? "Your academic workspace" : navItems.find((item) => item.slug === activeSection)?.label || "Academic workspace"}</CardTitle><p className="mt-2 text-sm text-slate-400">The initial POLITEIA shell is ready. Department content will be connected in the next phase.</p></div><Sparkles className="hidden size-8 text-indigo-200 sm:block" /></div></CardHeader><CardContent><div className="rounded-xl border border-white/10 bg-black/10 p-4 text-sm text-slate-300">This area is intentionally content-light while the Political Science database and materials are being populated. Use the navigation to explore the available academic sections.</div><Button asChild className="mt-5 bg-indigo-300 text-slate-950 hover:bg-indigo-200"><Link href="/politeia?section=courses">Open Courses <ArrowRight className="size-4" /></Link></Button></CardContent></Card></div></main></div></div>
}
