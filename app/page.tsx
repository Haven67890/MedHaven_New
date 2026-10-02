import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen, GraduationCap, ShieldCheck, Sparkles } from "lucide-react"

import { AcademicExplorer } from "@/components/home/academic-explorer"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { getAcademicDirectory, getUserEcosystemContext, workspacePath } from "@/lib/jositex"

export const metadata: Metadata = {
  title: "JositeX — University of Jos Digital Academic Ecosystem",
  description: "One university-level digital ecosystem for the academic communities of the University of Jos.",
}

export default async function HomePage() {
  const supabase = await createClient()
  const [{ data: { user } }, directory] = await Promise.all([
    supabase.auth.getUser(),
    getAcademicDirectory(supabase),
  ])
  const context = user ? await getUserEcosystemContext(supabase, user.id) : null
  const { data: profile } = user && !context ? await supabase.from("profiles").select("department").eq("id", user.id).maybeSingle() : { data: null }
  const workspaceHref = user ? (context ? workspacePath(context.workspace) : "/profile/complete") : "/login"
  const workspaceLabel = user ? (context ? "Open your workspace" : "Complete your profile") : "Enter JositeX"

  return (
    <main className="min-h-svh overflow-x-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.18),transparent_38%)]" />
      <div className="relative mx-auto flex min-h-svh w-full max-w-7xl flex-col px-4 py-5 sm:px-8 sm:py-6 lg:px-12">
        <header className="flex min-w-0 items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="JositeX home"><span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-teal-300 text-slate-950 shadow-lg shadow-teal-300/20 sm:size-10"><GraduationCap className="size-5" /></span><span className="min-w-0"><span className="block text-lg font-bold tracking-tight">JositeX</span><span className="block truncate text-[9px] uppercase tracking-[0.18em] text-slate-400 sm:text-[10px] sm:tracking-[0.24em]">University of Jos</span></span></Link>
          <Button asChild size="sm" variant="outline" className="shrink-0 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href={workspaceHref}>{workspaceLabel} <ArrowRight className="size-4" /></Link></Button>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 sm:gap-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="min-w-0 max-w-2xl"><div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-200 sm:mb-6 sm:text-xs sm:tracking-[0.16em]"><Sparkles className="size-3.5 shrink-0" /> Digital academic ecosystem</div><h1 className="text-[2.65rem] font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl sm:leading-tight lg:text-7xl">One university. <span className="text-teal-200">Many paths</span> to possibility.</h1><p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:mt-7 sm:text-lg sm:leading-8">JositeX connects the University of Jos academic community to focused digital environments built around the needs of each department.</p><div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row"><Button asChild size="lg" className="w-full bg-teal-300 text-slate-950 hover:bg-teal-200 sm:w-auto"><Link href={workspaceHref}>{workspaceLabel} <ArrowRight className="size-4" /></Link></Button><Button asChild size="lg" variant="outline" className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:w-auto"><Link href="#academic-explorer">Explore academic community</Link></Button></div><div className="mt-9 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-400 sm:mt-12 sm:gap-x-6"><span className="inline-flex items-center gap-2"><BookOpen className="size-4 shrink-0 text-teal-200" /> Faculty-to-department discovery</span><span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 shrink-0 text-teal-200" /> Secure by design</span></div></div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-200">University of Jos</p><h2 className="mt-3 text-2xl font-semibold">Your academic community, clearly connected.</h2><p className="mt-3 text-sm leading-6 text-slate-300">Start with your faculty, find your department, and then open its JositeX workspace when one is registered.</p>{user && context ? <div className="mt-6 rounded-2xl border border-teal-200/20 bg-teal-200/10 p-4"><p className="text-xs uppercase tracking-wider text-teal-200">Welcome back</p><p className="mt-2 font-semibold">{context.departmentName ?? "Your department"}</p><p className="mt-1 text-sm text-slate-300">{context.app.name} is ready to open.</p><Button asChild size="sm" className="mt-4 bg-teal-300 text-slate-950 hover:bg-teal-200"><Link href={workspaceHref}>Open your workspace <ArrowRight className="size-4" /></Link></Button></div> : <p className="mt-6 text-sm text-slate-400">{profile?.department ? `${profile.department} is in the academic catalogue.` : "Explore the academic hierarchy below."}</p>}</div>
        </section>
        <AcademicExplorer directory={directory} />
        <footer className="border-t border-white/10 py-5 text-xs leading-5 text-slate-500">JositeX · University of Jos Digital Academic Ecosystem</footer>
      </div>
    </main>
  )
}
