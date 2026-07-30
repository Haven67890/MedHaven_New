import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Clapperboard, ListFilter as Filter, Play, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"

export const metadata: Metadata = {
  title: "Lecture Videos",
  description: "Recorded lectures and video lessons.",
}

const lectures = [
  { id: "v1", title: "Cardiac Cycle — Lecture 04", lecturer: "Prof. Boateng", subject: "Physiology", duration: "42 min", views: 1240, watched: 45 },
  { id: "v2", title: "Pharmacokinetics Basics", lecturer: "Dr. Adeyemi", subject: "Pharmacology", duration: "38 min", views: 980, watched: 100 },
  { id: "v3", title: "Neoplasia — Introduction", lecturer: "Dr. Mensah", subject: "Pathology", duration: "51 min", views: 860, watched: 0 },
  { id: "v4", title: "Cranial Nerves Anatomy", lecturer: "Dr. Owusu", subject: "Anatomy", duration: "46 min", views: 720, watched: 100 },
  { id: "v5", title: "Health Promotion Models", lecturer: "Dr. Larbi", subject: "Community Medicine", duration: "34 min", views: 540, watched: 0 },
  { id: "v6", title: "OSCE Skills Demonstration", lecturer: "Prof. Boateng", subject: "Clinical Skills", duration: "58 min", views: 1100, watched: 72 },
] as const

export default function LectureVideosPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Lecture Videos" description="Watch and rewatch recorded lectures at your own pace.">
        <Button variant="outline"><Filter data-icon="inline-start" />Filter</Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total lectures" value="184" icon={Clapperboard} accent="primary" />
        <StatCard label="Hours of content" value="120h" icon={Clapperboard} accent="secondary" />
        <StatCard label="Watched by you" value="42" icon={Play} accent="accent" />
        <StatCard label="In progress" value="6" icon={Play} accent="warning" />
      </section>

      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" placeholder="Search lectures by title, subject, or lecturer…" className="pl-9" aria-label="Search lecture videos" />
        </div>
      </section>

      <section>
        <SectionHeading title="Continue watching" description="Pick up your in-progress lectures." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lectures.filter((l) => l.watched > 0 && l.watched < 100).map((lecture) => (
            <Card key={lecture.id} className="gap-0 overflow-hidden p-0">
              <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-primary/20 to-muted">
                <span className="flex size-12 items-center justify-center rounded-full bg-background/90 text-primary shadow-md">
                  <Play className="size-5" aria-hidden="true" />
                </span>
                <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-1.5 py-0.5 text-xs font-medium text-foreground backdrop-blur">{lecture.duration}</span>
              </div>
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{lecture.title}</CardTitle>
                  <Badge variant="accent" className="shrink-0">{lecture.subject}</Badge>
                </div>
                <CardDescription>{lecture.lecturer} · {lecture.views} views</CardDescription>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${lecture.watched}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{lecture.watched}%</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="All lectures" description="Browse the full lecture library." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lectures.map((lecture) => (
            <Card key={lecture.id} className="gap-0 overflow-hidden p-0">
              <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-primary/20 to-muted">
                <span className="flex size-12 items-center justify-center rounded-full bg-background/90 text-primary shadow-md">
                  <Play className="size-5" aria-hidden="true" />
                </span>
                <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-1.5 py-0.5 text-xs font-medium text-foreground backdrop-blur">{lecture.duration}</span>
                {lecture.watched === 100 ? (
                  <span className="absolute top-2 right-2"><Badge variant="success">Watched</Badge></span>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{lecture.title}</CardTitle>
                  <Badge variant="accent" className="shrink-0">{lecture.subject}</Badge>
                </div>
                <CardDescription>{lecture.lecturer} · {lecture.views} views</CardDescription>
                <Button variant="outline" size="sm" asChild className="mt-1">
                  <Link href="/lectures">Watch now <ArrowRight data-icon="inline-end" /></Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
