import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, BookOpen, GraduationCap } from "lucide-react"
import { getEcosystemFeatures, getUserEcosystemContext, workspacePath } from "@/lib/jositex"
import { createClient } from "@/lib/supabase/server"

export default async function DestinationWorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/workspace/${slug}`)
  const context = await getUserEcosystemContext(supabase, user.id)
  if (!context) redirect("/profile/complete")
  if (context.workspace.type === "specialized") redirect(workspacePath(context.workspace))
  if (context.programmeSlug !== slug) redirect(workspacePath(context.workspace))
  const features = await getEcosystemFeatures(supabase, context.app.id)
  return <div className="mx-auto max-w-5xl"><div className="rounded-3xl border border-cyan-200/15 bg-gradient-to-br from-cyan-300/10 to-transparent p-6 sm:p-10"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">Universal JositeX workspace</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{context.programmeName}</h1><p className="mt-3 max-w-2xl text-slate-300">{context.collegeName ? `${context.collegeName} · ` : ""}{context.facultyName} · {context.universityName}</p><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{features.filter((feature) => feature.href).map((feature) => <Link key={feature.id} href={feature.href!} className="group rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-cyan-200/30 hover:bg-white/[0.06]"><div className="flex items-center justify-between gap-3"><span className="font-medium">{feature.name}</span><ArrowRight className="size-4 text-slate-500 group-hover:text-cyan-200" /></div><p className="mt-2 text-xs text-slate-500">{feature.description || "Open this destination-scoped academic feature."}</p></Link>)}</div><div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-400"><span className="inline-flex items-center gap-2"><GraduationCap className="size-4 text-cyan-200" /> {context.programmeName}</span><span className="inline-flex items-center gap-2"><BookOpen className="size-4 text-cyan-200" /> Current level is enforced by your profile</span></div></div></div>
}
