import Link from "next/link"
import { ArrowLeft, BookOpen, FileQuestion, Library, Sparkles } from "lucide-react"
import { notFound, redirect } from "next/navigation"
import { getEcosystemFeatures, getUserEcosystemContext } from "@/lib/jositex"
import { createClient } from "@/lib/supabase/server"

const icons = { courses: BookOpen, "study-library": Library, "past-questions": FileQuestion, quizzes: Sparkles, flashcards: Sparkles }

export default async function DepartmentFeaturePage({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/dashboard/${feature}`)
  const context = await getUserEcosystemContext(supabase, user.id)
  if (!context) redirect("/profile/complete")
  if (context.app.slug === "medhaven") notFound()
  const features = await getEcosystemFeatures(supabase, context.app.id)
  const configured = features.find((item) => item.slug === feature && item.href === `/dashboard/${feature}`)
  if (!configured) notFound()
  const Icon = icons[feature as keyof typeof icons] || Sparkles

  return <div className="mx-auto max-w-3xl"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="size-4" /> Back to dashboard</Link><div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-8"><Icon className="size-8 text-cyan-200" /><p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">{context.departmentName || "Department"}</p><h1 className="mt-2 text-3xl font-semibold">{configured.name}</h1><p className="mt-3 text-slate-400">{configured.description || "This department feature is enabled for your workspace."}</p><div className="mt-8 rounded-xl border border-dashed border-white/15 bg-slate-950/40 p-6"><p className="font-medium">No materials available yet for your department.</p><p className="mt-2 text-sm text-slate-500">This shared workspace is ready for department courses, resources, and academic content to be configured.</p></div></div></div>
}
