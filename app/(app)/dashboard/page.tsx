import Link from "next/link"
import { ArrowRight, BookOpen, CalendarDays, FileQuestion, Library, Sparkles, TrendingUp } from "lucide-react"
import { redirect } from "next/navigation"
import { getEcosystemFeatures, getUserEcosystemContext } from "@/lib/jositex"
import { createClient } from "@/lib/supabase/server"
import JuthDashboard from "@/medhaven_juth_hub"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/dashboard")

  const context = await getUserEcosystemContext(supabase, user.id)
  if (!context) redirect("/profile/complete")
  if (context.app.slug === "medhaven") return <JuthDashboard />

  const [{ data: profile }, features, courses, materials, quizzes] = await Promise.all([
    supabase.from("profiles").select("full_name, current_level").eq("id", user.id).maybeSingle(),
    getEcosystemFeatures(supabase, context.app.id),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("department_id", context.departmentId),
    supabase.from("materials").select("id, courses!inner(department_id)", { count: "exact", head: true }).eq("courses.department_id", context.departmentId),
    supabase.from("quizzes").select("id, courses!inner(department_id)", { count: "exact", head: true }).eq("courses.department_id", context.departmentId),
  ])
  const name = profile?.full_name?.split(" ")[0] || "Student"
  const cards = [
    ["Courses", courses.count ?? 0, "Your department curriculum", BookOpen],
    ["Study materials", materials.count ?? 0, "Published resources", Library],
    ["Quizzes", quizzes.count ?? 0, "Available practice tests", FileQuestion],
    ["Features", features.length, "Enabled in your workspace", Sparkles],
  ] as const

  return <div>
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">{context.app.name} workspace</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back, {name}.</h1><p className="mt-3 max-w-2xl text-slate-400">Your academic workspace for {context.departmentName || "your department"}{profile?.current_level ? ` · ${profile.current_level}` : ""}.</p></div><Link href="/profile" className="inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">View profile <ArrowRight className="size-4" /></Link></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, description, Icon]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><Icon className="size-5 text-cyan-200" /><p className="mt-5 text-2xl font-semibold">{value}</p><p className="mt-1 text-sm text-slate-300">{label}</p><p className="mt-1 text-xs text-slate-500">{description}</p></div>)}</div>
    <section className="mt-8 rounded-2xl border border-cyan-200/15 bg-gradient-to-br from-cyan-300/10 to-transparent p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">Start studying</p><h2 className="mt-2 text-xl font-semibold">Your department dashboard</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Choose a workspace feature below. Content is scoped to your department and will show a useful empty state while materials are being added.</p></div><TrendingUp className="hidden size-8 text-cyan-200 sm:block" /></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{features.slice(0, 6).map((feature) => feature.href && <Link key={feature.id} href={feature.href} className="group rounded-xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-cyan-200/30 hover:bg-white/[0.06]"><div className="flex items-center justify-between gap-3"><span className="font-medium">{feature.name}</span><ArrowRight className="size-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-200" /></div><p className="mt-2 text-xs text-slate-500">{feature.description || "Open this department feature."}</p></Link>)}</div></section>
    <div className="mt-6 flex items-center gap-2 text-xs text-slate-500"><CalendarDays className="size-4" /> Dashboard content is resolved from your department workspace configuration.</div>
  </div>
}
