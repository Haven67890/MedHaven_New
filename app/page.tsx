import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen, GraduationCap, Landmark, ShieldCheck, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { getAvailableEcosystemApps } from "@/lib/jositex"

export const metadata: Metadata = {
  title: "JositeX — University of Jos Digital Academic Ecosystem",
  description: "One university-level digital ecosystem for the academic communities of the University of Jos.",
}

const fallbackApps = [
  {
    slug: "medhaven",
    name: "MedHaven",
    departmentName: "Medicine & Surgery",
    description: "A focused academic workspace for medical students, from core courses to clinical preparation.",
    icon: ShieldCheck,
    className: "from-emerald-500/15 to-cyan-500/10",
  },
  {
    slug: "politeia",
    name: "POLITEIA",
    departmentName: "Political Science",
    description: "A structured study environment for political theory, public affairs, research, and academic growth.",
    icon: Landmark,
    className: "from-indigo-500/15 to-violet-500/10",
  },
]

export default async function HomePage() {
  const supabase = await createClient()
  const apps = await getAvailableEcosystemApps(supabase)
  const appCards = apps.length
    ? apps.map((app) => ({ ...app, icon: app.slug === "politeia" ? Landmark : ShieldCheck, className: app.slug === "politeia" ? "from-indigo-500/15 to-violet-500/10" : "from-emerald-500/15 to-cyan-500/10" }))
    : fallbackApps

  return (
    <main className="min-h-svh overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.18),transparent_38%)]" />
      <div className="relative mx-auto flex min-h-svh w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="JositeX home">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-teal-300 text-slate-950 shadow-lg shadow-teal-300/20"><GraduationCap className="size-5" /></span>
            <span><span className="block text-lg font-bold tracking-tight">JositeX</span><span className="block text-[10px] uppercase tracking-[0.24em] text-slate-400">University of Jos</span></span>
          </Link>
          <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href="/login">Sign in <ArrowRight className="size-4" /></Link></Button>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-teal-200"><Sparkles className="size-3.5" /> Digital academic ecosystem</div>
            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">One university. <span className="text-teal-200">Many paths</span> to possibility.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">JositeX connects the University of Jos academic community to focused digital environments built around the needs of each department.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="bg-teal-300 text-slate-950 hover:bg-teal-200"><Link href="/login">Enter JositeX <ArrowRight className="size-4" /></Link></Button><Button asChild size="lg" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href="#environments">Explore environments</Link></Button></div>
            <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400"><span className="inline-flex items-center gap-2"><BookOpen className="size-4 text-teal-200" /> Department-aware learning</span><span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-teal-200" /> Secure by design</span></div>
          </div>
          <div id="environments" className="scroll-mt-8">
            <div className="mb-5"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Available academic environments</p><p className="mt-2 text-slate-300">Choose the environment connected to your department.</p></div>
            <div className="grid gap-4">
              {appCards.map((app) => { const Icon = app.icon; return <Card key={app.slug} className={`border-white/10 bg-gradient-to-br ${app.className} text-white backdrop-blur-xl`}><CardHeader><div className="flex items-start justify-between gap-4"><span className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-teal-100"><Icon className="size-5" /></span><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">{app.departmentName ?? "University community"}</span></div><CardTitle className="pt-2 text-2xl">{app.name}</CardTitle><CardDescription className="text-slate-300">{app.description}</CardDescription></CardHeader><CardContent><Button asChild variant="outline" className="w-full border-white/15 bg-black/10 text-white hover:bg-white/10 hover:text-white"><Link href="/login">Continue to {app.name} <ArrowRight className="size-4" /></Link></Button></CardContent></Card> })}
            </div>
            {!apps.length && <p className="mt-4 text-xs leading-5 text-slate-500">Application availability is managed by the JositeX academic directory.</p>}
          </div>
        </section>
        <footer className="border-t border-white/10 py-5 text-xs text-slate-500">JositeX · University of Jos Digital Academic Ecosystem</footer>
      </div>
    </main>
  )
}
