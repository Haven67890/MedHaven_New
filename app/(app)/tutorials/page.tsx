import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CalendarDays, Clock, ListFilter as Filter, GraduationCap, Search, Users } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"

export const metadata: Metadata = {
  title: "Tutorials",
  description: "Group and peer tutorial sessions.",
}

const upcoming = [
  { id: "u1", title: "Pathology — Neoplasia", tutor: "Dr. Mensah", tutorInitials: "DM", time: "Tomorrow · 10:00", duration: "90 min", seats: "6 / 12 left", subject: "Pathology", level: "Intermediate" },
  { id: "u2", title: "Pharmacology Drug Reactions", tutor: "Dr. Adeyemi", tutorInitials: "DA", time: "Thu · 14:00", duration: "60 min", seats: "3 / 15 left", subject: "Pharmacology", level: "Beginner" },
  { id: "u3", title: "Clinical Skills Refresher", tutor: "Prof. Boateng", tutorInitials: "PB", time: "Fri · 09:00", duration: "120 min", seats: "9 / 20 left", subject: "Clinical Skills", level: "All levels" },
  { id: "u4", title: "Anatomy Spot Test Prep", tutor: "Dr. Owusu", tutorInitials: "DO", time: "Mon · 15:00", duration: "75 min", seats: "10 / 10 left", subject: "Anatomy", level: "Advanced" },
] as const

const past = [
  { id: "pa1", title: "Cardiac Cycle Deep Dive", tutor: "Prof. Boateng", date: "28 Jul", attended: true },
  { id: "pa2", title: "Inflammation Review", tutor: "Dr. Mensah", date: "25 Jul", attended: true },
  { id: "pa3", title: "OSCE Mock Stations", tutor: "Prof. Boateng", date: "21 Jul", attended: false },
] as const

const levelVariant: Record<string, "success" | "warning" | "destructive" | "muted"> = {
  Beginner: "success",
  Intermediate: "warning",
  Advanced: "destructive",
  "All levels": "muted",
}

export default function TutorialsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Tutorials" description="Join group and peer-led sessions to strengthen weak areas together.">
        <Button variant="outline"><Filter data-icon="inline-start" />Filter</Button>
        <Button>Request a tutorial</Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Upcoming sessions" value="4" icon={CalendarDays} accent="primary" />
        <StatCard label="Attended" value="18" icon={GraduationCap} accent="secondary" />
        <StatCard label="Hours logged" value="22h" icon={Clock} accent="accent" />
        <StatCard label="Tutors available" value="12" icon={Users} accent="warning" />
      </section>

      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" placeholder="Search tutorials by subject or tutor…" className="pl-9" aria-label="Search tutorials" />
        </div>
      </section>

      <section>
        <SectionHeading title="Upcoming sessions" description="Reserve your spot before they fill up." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {upcoming.map((session) => (
            <Card key={session.id} className="gap-3">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar initials={session.tutorInitials} className="size-11" />
                  <div className="flex flex-col gap-0.5">
                    <CardTitle className="text-base">{session.title}</CardTitle>
                    <CardDescription>{session.tutor}</CardDescription>
                  </div>
                </div>
                <CardAction>
                  <Badge variant={levelVariant[session.level]}>{session.level}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarDays className="size-3" aria-hidden="true" /> {session.time}</span>
                  <span className="flex items-center gap-1"><Clock className="size-3" aria-hidden="true" /> {session.duration}</span>
                  <span className="flex items-center gap-1"><Users className="size-3" aria-hidden="true" /> {session.seats}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="accent">{session.subject}</Badge>
                  <Button size="sm" asChild>
                    <Link href="/tutorials">Reserve <ArrowRight data-icon="inline-end" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Past sessions" description="Tutorials you've attended or missed." />
        <div className="mt-4 flex flex-col gap-2">
          {past.map((session) => (
            <div key={session.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <GraduationCap className="size-4" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-medium text-foreground">{session.title}</p>
                <p className="text-xs text-muted-foreground">{session.tutor} · {session.date}</p>
              </div>
              <Badge variant={session.attended ? "success" : "muted"} className="shrink-0">
                {session.attended ? "Attended" : "Missed"}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
