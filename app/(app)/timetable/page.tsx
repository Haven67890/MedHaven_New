import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, Clock, MapPin } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Timetable",
  description: "Your weekly schedule.",
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const

const schedule: Record<string, Array<{ id: string; time: string; title: string; room: string; color: string }>> = {
  Monday: [
    { id: "m1", time: "08:00", title: "Anatomy Lecture", room: "Hall A", color: "primary" },
    { id: "m2", time: "10:00", title: "Biochemistry Lab", room: "Lab 2", color: "secondary" },
    { id: "m3", time: "14:00", title: "Self-study", room: "Library", color: "muted" },
  ],
  Tuesday: [
    { id: "t1", time: "09:00", title: "Physiology Lecture", room: "Hall B", color: "primary" },
    { id: "t2", time: "11:00", title: "Pathology Tutorial", room: "Lab 3", color: "secondary" },
    { id: "t3", time: "15:00", title: "Clinical Posting", room: "Ward 4", color: "accent" },
  ],
  Wednesday: [
    { id: "w1", time: "08:00", title: "Pharmacology Lecture", room: "Hall A", color: "primary" },
    { id: "w2", time: "10:00", title: "Pathology Tutorial", room: "Lab 3", color: "secondary" },
    { id: "w3", time: "12:00", title: "Clinical Skills Lab", room: "Skills Centre", color: "accent" },
    { id: "w4", time: "14:00", title: "Community Medicine", room: "Hall C", color: "primary" },
    { id: "w5", time: "16:00", title: "Self-study block", room: "Library", color: "muted" },
  ],
  Thursday: [
    { id: "th1", time: "09:00", title: "Pharmacology Tutorial", room: "Lab 1", color: "secondary" },
    { id: "th2", time: "11:00", title: "Anatomy Dissection", room: "Dissection Room", color: "primary" },
    { id: "th3", time: "14:00", title: "Library Research", room: "Library", color: "muted" },
  ],
  Friday: [
    { id: "f1", time: "08:00", title: "Community Medicine", room: "Hall C", color: "primary" },
    { id: "f2", time: "10:00", title: "OSCE Practice", room: "Skills Centre", color: "accent" },
    { id: "f3", time: "13:00", title: "Group Study", room: "Seminar Room", color: "muted" },
  ],
}

const colorBar: Record<string, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
  muted: "bg-muted-foreground",
}

export default function TimetablePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Timetable" description="Your weekly academic schedule at a glance.">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Clock className="size-4 text-primary" aria-hidden="true" /> Total hours</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-semibold">28h / week</p></CardContent>
        </Card>
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="size-4 text-primary" aria-hidden="true" /> Lectures</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-semibold">12 sessions</p></CardContent>
        </Card>
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><MapPin className="size-4 text-primary" aria-hidden="true" /> Clinical</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-semibold">4 postings</p></CardContent>
        </Card>
      </section>

      <section>
        <SectionHeading title="This week" description="Wednesday is highlighted as today." />
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {days.map((day) => {
            const isToday = day === "Wednesday"
            return (
              <Card key={day} className={cn("gap-3", isToday && "border-primary ring-1 ring-primary/20")}>
                <CardHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{day}</CardTitle>
                    {isToday ? <Badge variant="default">Today</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {schedule[day].map((item) => (
                    <div key={item.id} className="flex items-start gap-2.5">
                      <span className="mt-0.5 w-10 shrink-0 text-xs font-medium text-muted-foreground">{item.time}</span>
                      <span className={cn("mt-1 h-full w-1 shrink-0 rounded-full self-stretch", colorBar[item.color])} />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.room}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
