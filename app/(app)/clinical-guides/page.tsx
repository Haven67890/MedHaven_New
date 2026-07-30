import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Clock, MapPin, Search, Stethoscope } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"

export const metadata: Metadata = {
  title: "Clinical Posting Guides",
  description: "References for your clinical postings.",
}

const postings = [
  { id: "p1", title: "Internal Medicine — Ward Round Guide", department: "Internal Medicine", duration: "4 weeks", location: "Ward 4, Main Block", status: "Current" },
  { id: "p2", title: "Surgery — Theatre Etiquette", department: "Surgery", duration: "6 weeks", location: "Theatre 2", status: "Upcoming" },
  { id: "p3", title: "Paediatrics — History Taking", department: "Paediatrics", duration: "4 weeks", location: "Children's Ward", status: "Upcoming" },
  { id: "p4", title: "Obstetrics & Gynaecology — Labour Ward", department: "O&G", duration: "6 weeks", location: "Labour Ward", status: "Completed" },
  { id: "p5", title: "Psychiatry — Mental State Examination", department: "Psychiatry", duration: "4 weeks", location: "Psych Unit", status: "Upcoming" },
  { id: "p6", title: "Community Health — Field Posting", department: "Community Medicine", duration: "4 weeks", location: "Riverside Clinic", status: "Completed" },
] as const

const statusVariant: Record<string, "success" | "warning" | "muted"> = {
  Current: "success",
  Upcoming: "warning",
  Completed: "muted",
}

const checklists = [
  { id: "cl1", title: "Pre-posting checklist", items: 12, completed: 12 },
  { id: "cl2", title: "Ward round essentials", items: 8, completed: 6 },
  { id: "cl3", title: "Case presentation format", items: 10, completed: 4 },
] as const

export default function ClinicalPostingGuidesPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Clinical Posting Guides" description="Everything you need for each clinical rotation — checklists, locations, and expectations.">
        <Button>Download all guides</Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active postings" value="1" icon={Stethoscope} accent="primary" />
        <StatCard label="Upcoming" value="3" icon={Clock} accent="warning" />
        <StatCard label="Completed" value="2" icon={Stethoscope} accent="secondary" />
      </section>

      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" placeholder="Search guides by department…" className="pl-9" aria-label="Search clinical guides" />
        </div>
      </section>

      <section>
        <SectionHeading title="Posting guides" description="Detailed references for each rotation." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {postings.map((posting) => (
            <Card key={posting.id} className="gap-3">
              <CardHeader>
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Stethoscope className="size-5" aria-hidden="true" />
                </div>
                <CardTitle className="pt-2 text-base">{posting.title}</CardTitle>
                <CardDescription>{posting.department}</CardDescription>
                <CardAction>
                  <Badge variant={statusVariant[posting.status]}>{posting.status}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3" aria-hidden="true" /> {posting.duration}
                </p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="size-3" aria-hidden="true" /> {posting.location}
                </p>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link href="/clinical-guides">Open guide <ArrowRight data-icon="inline-end" /></Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Posting checklists" description="Make sure you're prepared." />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {checklists.map((checklist) => {
            const pct = Math.round((checklist.completed / checklist.items) * 100)
            return (
              <Card key={checklist.id} className="gap-3">
                <CardHeader>
                  <CardTitle className="text-base">{checklist.title}</CardTitle>
                  <CardDescription>{checklist.completed} of {checklist.items} items</CardDescription>
                  <CardAction>
                    <Badge variant={pct === 100 ? "success" : "warning"}>{pct}%</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
