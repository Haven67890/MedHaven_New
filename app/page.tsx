import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen, GraduationCap, Landmark, ShieldCheck, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { appHomePath, getAvailableEcosystemApps, getUserEcosystemContext } from "@/lib/jositex"

export const metadata: Metadata = {
  title: "JositeX — University of Jos Digital Academic Ecosystem",
  description: "One university-level digital ecosystem for the academic communities of the University of Jos.",
}

const fallbackApps = [
  { slug: "medhaven", name: "MedHaven", departmentName: "Medicine & Surgery", description: "A focused academic workspace for medical students, from core courses to clinical preparation.", icon: ShieldCheck, className: "from-emerald-500/15 to-cyan-500/10" },
  { slug: "politeia", name: "POLITEIA", departmentName: "Political Science", description: "A structured study environment for political theory, public affairs, research, and academic growth.", icon: Landmark, className: "from-indigo-500/15 to-violet-500/10" },
]

export default async function HomePage() {
  const supabase = await createClient()
  const apps = await getAvailableEcosystemApps(supabase)
  const { data: { user } } = await supabase.auth.getUser()
  const context = user ? await getUserEcosystemContext(supabase, user.id) : null
  const { data: profile } = user && !context ? await supabase.from("profiles").select("department").eq("id", user.id).maybeSingle() : { data: null }
  const appCards = apps.length
    ? apps.map((app) => ({ ...app, icon: app.slug === "politeia" ? Landmark : ShieldCheck, className: app.slug === "politeia" ? "from-indigo-500/15 to-violet-500/10" : "from-emerald-500/15 to-cyan-500/10" }))
    : fallbackApps

  return (
    <main className="min-h-svh overflow-x-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.18),transparent_38%)]" />
      <div className="relative mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-5 sm:px-8 sm:py-6 lg:px-12">
        <header className="flex min-w-0 items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="JositeX home"><span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-teal-300 text-slate-950 shadow-lg shadow-teal-300/20 sm:size-10"><GraduationCap className="size-5" /></span><span className="min-w-0"><span className="block text-lg font-bold tracking-tight">JositeX</span><span className="block truncate text-[9px] uppercase tracking-[0.18em] text-slate-400 sm:text-[10px] sm:tracking-[0.24em]">University of Jos</span></span></Link>
          <Button asChild size="sm" variant="outline" className="shrink-0 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:h-10 sm:px-4"><Link href={user ? (context ? appHomePath(context.app.slug) : "/profile/complete") : "/login"}>{user ? (context ? "Open workspace" : "Complete profile") : "Sign in"} <ArrowRight className="size-4" /></Link></Button>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 sm:gap-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="min-w-0 max-w-2xl"><div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-200 sm:mb-6 sm:text-xs sm:tracking-[0.16em]"><Sparkles className="size-3.5 shrink-0" /> Digital academic ecosystem</div><h1 className="text-[2.65rem] font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl sm:leading-tight lg:text-7xl">One university. <span className="text-teal-200">Many paths</span> to possibility.</h1><p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:mt-7 sm:text-lg sm:leading-8">JositeX connects the University of Jos academic community to focused digital environments built around the needs of each department.</p><div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row"><Button asChild size="lg" className="w-full bg-teal-300 text-slate-950 hover:bg-teal-200 sm:w-auto"><Link href={user ? (context ? appHomePath(context.app.slug) : "/profile/complete") : "/login"}>{user ? (context ? "Open your workspace" : "Complete your profile") : "Enter JositeX"} <ArrowRight className="size-4" /></Link></Button><Button asChild size="lg" variant="outline" className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:w-auto"><Link href="#environments">Explore environments</Link></Button></div><div className="mt-9 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-400 sm:mt-12 sm:gap-x-6"><span className="inline-flex items-center gap-2"><BookOpen className="size-4 shrink-0 text-teal-200" /> Department-aware learning</span><span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 shrink-0 text-teal-200" /> Secure by design</span></div></div>
          <div id="environments" className="scroll-mt-8"><div className="mb-5"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400 sm:tracking-[0.18em]">Available academic environments</p><p className="mt-2 text-sm leading-6 text-slate-300 sm:text-base">{user && context ? `Your connected workspace is ${context.app.name}.` : "Choose the environment connected to your department."}</p></div><div className="grid min-w-0 gap-4">
            {appCards.map((app) => { const Icon = app.icon; const isCurrent = Boolean(user && context && context.app.slug === app.slug); const href = user ? (context ? appHomePath(context.app.slug) : "/profile/complete") : `/login?next=${encodeURIComponent(appHomePath(app.slug))}`; return <Card key={app.slug} className={`min-w-0 border-white/10 bg-gradient-to-br ${app.className} text-white backdrop-blur-xl`}><CardHeader><div className="flex items-start justify-between gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-100"><Icon className="size-5" /></span><span className="max-w-[70%] rounded-full border border-white/10 px-2.5 py-1 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-300">{app.departmentName ?? "University community"}</span></div><CardTitle className="break-words pt-2 text-2xl">{app.name}</CardTitle><CardDescription className="text-slate-300">{app.description}</CardDescription></CardHeader><CardContent>{user && context && !isCurrent ? <Button disabled variant="outline" className="w-full border-white/15 bg-black/10 text-white/60">Not your workspace</Button> : <Button asChild variant="outline" className="w-full border-white/15 bg-black/10 text-white hover:bg-white/10 hover:text-white"><Link href={href}>{user ? (context ? `Open ${app.name}` : "Complete profile") : `Continue to ${app.name}`} <ArrowRight className="size-4" /></Link></Button>}</CardContent></Card> })}
            {user && !context && <Card className="border-amber-200/20 bg-amber-200/5 text-white"><CardHeader><CardTitle className="text-xl">Complete your institutional profile</CardTitle><CardDescription className="text-slate-300">{profile?.department ? `${profile.department} is in the JositeX institutional catalogue, but its dedicated application is not active yet.` : "Choose your university, faculty, department, and level to resolve your JositeX workspace."}</CardDescription></CardHeader><CardContent><Button asChild variant="outline" className="border-amber-100/20 bg-transparent text-white hover:bg-white/10"><Link href="/profile/complete">Complete profile <ArrowRight className="size-4" /></Link></Button></CardContent></Card>}
          </div>{!apps.length && <p className="mt-4 text-xs leading-5 text-slate-500">Application availability is managed by the JositeX academic directory.</p>}</div>
        </section>
        <footer className="border-t border-white/10 py-5 text-xs leading-5 text-slate-500">JositeX · University of Jos Digital Academic Ecosystem</footer>
      </div>
    </main>
  )
}
