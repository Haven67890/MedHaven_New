import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, GraduationCap } from "lucide-react"
import { AcademicExplorer } from "@/components/home/academic-explorer"
import { getAcademicDirectory } from "@/lib/jositex"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Academic Directory",
  description: "Explore University of Jos faculties and departments in JositeX.",
}

export default async function AcademicsPage() {
  const directory = await getAcademicDirectory(await createClient())
  return <main className="min-h-svh bg-slate-950 px-4 py-6 text-white sm:px-8 lg:px-12"><div className="mx-auto max-w-7xl"><header className="flex items-center justify-between gap-4"><Link href="/" className="flex items-center gap-2 font-semibold"><GraduationCap className="size-5 text-teal-200" /> JositeX</Link><Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft className="size-4" /> Home</Link></header><div className="mt-12"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-200">University of Jos</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Academic directory</h1><p className="mt-3 max-w-2xl text-slate-300">Explore the university through its faculty and department structure.</p><AcademicExplorer directory={directory} /></div></div></main>
}
