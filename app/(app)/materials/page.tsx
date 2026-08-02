import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Download, FileText, ListFilter as Filter, Search, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Study Materials",
  description: "Notes, handouts, and study resources.",
}

export default async function StudyMaterialsPage() {
  const supabase = await createClient()
  const { data: courses } = await supabase
    .from("courses")
    .select("id, code, name, title, level, parent_id, department_id, faculty_id, university_id, description")
    .order("name", { ascending: true })
    .limit(100)

  const materials = (courses ?? []).map((course, index) => ({
    id: String(course.id ?? `material-${index}`),
    title: String(course.name ?? course.title ?? course.code ?? "Untitled material"),
    subject: String(course.parent_id ?? course.name ?? "General"),
    type: "PDF",
    size: "Live",
    rating: 4.8,
    downloads: 0,
    time: course.level ? String(course.level) : "Recently added",
  }))

  const categories = Array.from(new Set(materials.map((material) => material.subject))).slice(0, 6).map((subject, index) => ({
    id: `cat${index + 1}`,
    name: subject,
    count: materials.filter((item) => item.subject === subject).length,
  }))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Study Materials" description="Curated notes, handouts, and references shared by lecturers and peers.">
        <Button variant="outline"><Filter data-icon="inline-start" />Filter</Button>
        <Button>Upload material</Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total materials" value={String(materials.length || 0)} icon={FileText} accent="primary" />
        <StatCard label="Downloaded by you" value="0" icon={Download} accent="secondary" />
        <StatCard label="Your uploads" value="0" icon={FileText} accent="accent" />
        <StatCard label="Avg. rating" value={materials.length ? "4.8" : "0.0"} icon={Star} accent="warning" />
      </section>

      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" placeholder="Search materials by title or subject…" className="pl-9" aria-label="Search study materials" />
        </div>
      </section>

      <section>
        <SectionHeading title="Categories" description="Filter materials by type." />
        {categories.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge key={category.id} variant="outline" className="cursor-default px-3 py-1.5 text-sm">
                {category.name}
                <span className="ml-1.5 text-muted-foreground">{category.count}</span>
              </Badge>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No uploaded materials are available yet.
          </div>
        )}
      </section>

      <section>
        <SectionHeading title="All materials" description="Recently shared resources." />
        {materials.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map((material) => (
              <Card key={material.id} className="gap-3">
                <CardHeader>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="size-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="pt-2 text-base">{material.title}</CardTitle>
                  <CardDescription>{material.subject} · {material.type} · {material.size}</CardDescription>
                  <CardAction>
                    <Badge variant="muted">{material.time}</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                    {material.rating} · {material.downloads} downloads
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Download data-icon="inline-start" /></Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/materials">Open <ArrowRight data-icon="inline-end" /></Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No material records exist in Supabase yet. Add resources to the live course library to populate this page.
          </div>
        )}
      </section>
    </div>
  )
}
