"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, ChevronDown, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AcademicDirectory, AcademicDirectoryFaculty } from "@/lib/jositex"

export function filterAcademicFaculties(faculties: AcademicDirectoryFaculty[], query: string): AcademicDirectoryFaculty[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return faculties
  return faculties.flatMap((faculty) => {
    const facultyMatches = faculty.name.toLowerCase().includes(normalized)
    const programmes = faculty.programmes.filter((programme) => programme.name.toLowerCase().includes(normalized))
    return facultyMatches ? [faculty] : programmes.length ? [{ ...faculty, programmes }] : []
  })
}

export function AcademicExplorer({ directory }: { directory: AcademicDirectory | null }) {
  const [query, setQuery] = useState("")
  const [openFaculties, setOpenFaculties] = useState<Set<string>>(new Set())
  const filteredFaculties = useMemo(() => filterAcademicFaculties(directory?.faculties ?? [], query), [directory?.faculties, query])
  const programmeCount = directory?.faculties.reduce((count, faculty) => count + faculty.programmes.length, 0) ?? 0

  function updateQuery(value: string) {
    setQuery(value)
    if (value.trim()) setOpenFaculties(new Set(filterAcademicFaculties(directory?.faculties ?? [], value).map((faculty) => faculty.id)))
  }
  function toggleFaculty(id: string) { setOpenFaculties((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }

  return <section id="academic-explorer" aria-labelledby="academic-explorer-title" className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/10 sm:mt-14 sm:p-8">
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-200">Academic directory</p><h2 id="academic-explorer-title" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Explore JositeX</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">University of Jos → college where applicable → faculty → undergraduate destination → workspace.</p></div>
      <div className="flex shrink-0 gap-6 text-sm text-slate-300"><div><strong className="block text-xl text-white">{directory?.faculties.length ?? 0}</strong>Faculties</div><div><strong className="block text-xl text-white">{programmeCount}</strong>Undergraduate destinations</div></div>
    </div>
    <div className="mt-7 flex gap-2"><div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Search faculty or undergraduate programme..." aria-label="Search faculty or undergraduate programme" className="h-11 border-white/15 bg-slate-950/50 pl-9 text-white placeholder:text-slate-500" /></div>{query ? <Button type="button" variant="outline" size="icon" onClick={() => updateQuery("")} aria-label="Clear academic search" className="h-11 w-11 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"><X className="size-4" /></Button> : null}</div>
    <div className="mt-6 grid gap-3 lg:grid-cols-2">{filteredFaculties.map((faculty) => { const isOpen = openFaculties.has(faculty.id); const panelId = `faculty-panel-${faculty.id}`; return <div key={faculty.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35"><h3><button id={`faculty-${faculty.id}`} type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggleFaculty(faculty.id)} className="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:ring-inset"><span className="min-w-0"><span className="block truncate font-semibold text-white">{faculty.name}</span><span className="mt-1 block text-xs text-slate-400">{faculty.college ? `${faculty.college.name} · ` : ""}{faculty.programmes.length} {faculty.programmes.length === 1 ? "destination" : "destinations"}</span></span><ChevronDown aria-hidden="true" className={`size-5 shrink-0 text-teal-200 transition-transform ${isOpen ? "rotate-180" : ""}`} /></button></h3>{isOpen ? <div id={panelId} role="region" aria-labelledby={`faculty-${faculty.id}`} className="border-t border-white/10 px-3 py-2">{faculty.programmes.length ? faculty.programmes.map((programme) => <div key={programme.id} className="flex flex-col gap-3 rounded-xl px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><div className="min-w-0"><span className="block break-words text-sm text-slate-200">{programme.name}</span><span className="mt-1 block text-xs text-slate-500">{programme.award ? `${programme.award} · ` : ""}{programme.durationYears ? `${programme.durationYears} years` : "Duration unresolved from current official source"}</span></div><div className="flex shrink-0 items-center gap-3"><span className="text-xs text-slate-500">{programme.workspace.type === "specialized" ? "Specialized workspace" : "Universal workspace"}</span><Button asChild size="sm" variant="outline" className="border-teal-200/20 bg-transparent text-teal-100 hover:bg-teal-200/10 hover:text-white"><Link href={programme.workspace.href}>Open workspace <ArrowRight className="size-3.5" /></Link></Button></div></div>) : <p className="px-3 py-4 text-sm text-slate-500">No verified undergraduate destinations are currently listed.</p>}</div> : null}</div> })}</div>
    {!filteredFaculties.length ? <div className="mt-6 rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center text-sm text-slate-400">No faculties or undergraduate destinations match “{query}”.</div> : null}
    <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-slate-500">Only canonical student-facing undergraduate destinations appear here. Institutional, specialist, and postgraduate units remain available internally without becoming admission destinations.</p><Button asChild variant="link" className="h-auto justify-start px-0 text-teal-200 hover:text-teal-100"><Link href="/academics">View full academic directory <ArrowRight className="size-4" /></Link></Button></div>
  </section>
}
