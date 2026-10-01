"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/politeia/section-list"

type Course = { id: string; code: string | null; name: string | null; title: string | null; level: string | number | null; description: string | null }
export function CourseBrowser({ courses }: { courses: Course[] }) {
  const [query, setQuery] = useState("")
  const [level, setLevel] = useState("all")
  const levels = useMemo(() => Array.from(new Set(courses.map((course) => String(course.level || "").trim()).filter(Boolean))).sort(), [courses])
  const filtered = courses.filter((course) => { const text = `${course.code || ""} ${course.name || ""} ${course.title || ""}`.toLowerCase(); return (level === "all" || String(course.level) === level) && text.includes(query.toLowerCase().trim()) })
  return <div><div className="mb-6 grid gap-3 sm:grid-cols-[1fr_180px]"><div className="relative"><Search className="absolute left-3 top-3 size-4 text-slate-500" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search course code or title" aria-label="Search courses" className="border-white/10 bg-white/[0.05] pl-9 text-white placeholder:text-slate-500" /></div><select value={level} onChange={(event) => setLevel(event.target.value)} aria-label="Filter courses by level" className="h-10 rounded-md border border-white/10 bg-slate-900 px-3 text-sm text-white"><option value="all">All levels</option>{levels.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>{filtered.length ? <div className="grid gap-4 sm:grid-cols-2">{filtered.map((course) => <Card key={course.id} className="border-white/10 bg-white/[0.04] text-white"><CardHeader><div className="flex items-center justify-between gap-2"><Badge className="bg-indigo-300 text-slate-950">{course.code || "COURSE"}</Badge><span className="text-xs text-slate-500">{course.level || "Level not set"}</span></div><CardTitle className="pt-2 text-lg">{course.title || course.name || "Untitled course"}</CardTitle></CardHeader>{course.description && <CardContent><p className="text-sm text-slate-400">{course.description}</p></CardContent>}</Card>)}</div> : <EmptyState message={courses.length ? "No courses match those filters." : "Political Science courses are being prepared for JositeX."} />}</div>
}
