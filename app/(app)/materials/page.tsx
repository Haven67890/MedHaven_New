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

export const metadata: Metadata = {
  title: "Study Materials",
  description: "Notes, handouts, and study resources.",
}

const categories = [
  { id: "cat1", name: "Lecture Notes", count: 142 },
  { id: "cat2", name: "Handouts", count: 86 },
  { id: "cat3", name: "Summaries", count: 54 },
  { id: "cat4", name: "Diagrams", count: 38 },
] as const

const materials = [
  { id: "m1", title: "Antibiotic Classification Chart", subject: "Pharmacology", type: "PDF", size: "1.2 MB", rating: 4.8, downloads: 1240, time: "Today" },
  { id: "m2", title: "Pathology — Neoplasia Notes", subject: "Pathology", type: "PDF", size: "3.4 MB", rating: 4.6, downloads: 980, time: "Today" },
  { id: "m3", title: "Cardiac Cycle Summary", subject: "Physiology", type: "PDF", size: "780 KB", rating: 4.9, downloads: 1520, time: "Yesterday" },
  { id: "m4", title: "Anatomy of the Cranial Nerves", subject: "Anatomy", type: "PDF", size: "2.1 MB", rating: 4.5, downloads: 760, time: "Yesterday" },
  { id: "m5", title: "Community Health Indicators", subject: "Community Medicine", type: "PDF", size: "640 KB", rating: 4.3, downloads: 420, time: "2 days ago" },
  { id: "m6", title: "OSCE Checklist Compilation", subject: "Clinical Skills", type: "PDF", size: "1.8 MB", rating: 4.7, downloads: 1100, time: "3 days ago" },
  { id: "m7", title: "Drug Interactions Reference", subject: "Pharmacology", type: "PDF", size: "2.6 MB", rating: 4.8, downloads: 890, time: "4 days ago" },
  { id: "m8", title: "Inflammation & Repair Diagrams", subject: "Pathology", type: "PDF", size: "4.2 MB", rating: 4.6, downloads: 640, time: "5 days ago" },
] as const

export default function StudyMaterialsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Study Materials" description="Curated notes, handouts, and references shared by lecturers and peers.">
        <Button variant="outline"><Filter data-icon="inline-start" />Filter</Button>
        <Button>Upload material</Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total materials" value="320" icon={FileText} accent="primary" />
        <StatCard label="Downloaded by you" value="48" icon={Download} accent="secondary" />
        <StatCard label="Your uploads" value="6" icon={FileText} accent="accent" />
        <StatCard label="Avg. rating" value="4.6" icon={Star} accent="warning" />
      </section>

      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" placeholder="Search materials by title or subject…" className="pl-9" aria-label="Search study materials" />
        </div>
      </section>

      <section>
        <SectionHeading title="Categories" description="Filter materials by type." />
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge key={category.id} variant="outline" className="cursor-default px-3 py-1.5 text-sm">
              {category.name}
              <span className="ml-1.5 text-muted-foreground">{category.count}</span>
            </Badge>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="All materials" description="Recently shared resources." />
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
      </section>
    </div>
  )
}
