import type { Metadata } from "next"
import Link from "next/link"
import { Bell, BellRing, CheckCheck, ListFilter as Filter } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Notifications",
  description: "Your recent notifications.",
}

type Notification = {
  id: string
  title: string
  body: string
  time: string
  category: "Academics" | "Clinical" | "Community" | "System"
  unread: boolean
}

const today: Notification[] = [
  { id: "n1", title: "Anatomy spot test rescheduled", body: "Moved from Friday to Monday at 10:00 in Hall B.", time: "2h ago", category: "Academics", unread: true },
  { id: "n2", title: "New clinical posting rota", body: "Your next four-week rotation schedule is now available.", time: "5h ago", category: "Clinical", unread: true },
  { id: "n3", title: "Dr. Mensah replied to your question", body: "See the answer in the Pathology tutorial thread.", time: "6h ago", category: "Academics", unread: true },
]

const earlier: Notification[] = [
  { id: "n4", title: "Library maintenance window", body: "Smart Library will be briefly unavailable Saturday 2:00–2:30 AM.", time: "1d ago", category: "System", unread: false },
  { id: "n5", title: "New marketplace listing", body: "A new Pharmacology notes pack was listed by Kwame A.", time: "1d ago", category: "Community", unread: false },
  { id: "n6", title: "Tutorial seat confirmed", body: "You're registered for Pathology — Neoplasia tomorrow at 10:00.", time: "2d ago", category: "Academics", unread: false },
  { id: "n7", title: "Quiz milestone reached", body: "You've completed 48 quizzes — just 2 away from your term goal!", time: "3d ago", category: "System", unread: false },
]

const categoryVariant: Record<Notification["category"], "default" | "secondary" | "accent" | "muted"> = {
  Academics: "default",
  Clinical: "secondary",
  Community: "accent",
  System: "muted",
}

function NotificationItem({ item }: { item: Notification }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border border-border p-3 transition-colors", item.unread ? "bg-primary/5" : "bg-card")}>
      <span className={cn("mt-1 flex size-2.5 shrink-0 rounded-full", item.unread ? "bg-primary" : "bg-transparent")} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          <Badge variant={categoryVariant[item.category]} className="shrink-0">{item.category}</Badge>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{item.body}</p>
        <span className="text-xs text-muted-foreground/70">{item.time}</span>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Notifications" description="Stay on top of announcements, replies, and reminders.">
        <Button variant="outline"><Filter data-icon="inline-start" />Filter</Button>
        <Button variant="secondary"><CheckCheck data-icon="inline-start" />Mark all read</Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Unread" value="3" icon={BellRing} accent="primary" />
        <StatCard label="This week" value="12" icon={Bell} accent="secondary" />
        <StatCard label="All time" value="184" icon={Bell} accent="accent" />
      </section>

      <section>
        <SectionHeading title="Today" />
        <div className="mt-4 flex flex-col gap-3">
          {today.map((item) => (
            <NotificationItem key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Earlier" />
        <div className="mt-4 flex flex-col gap-3">
          {earlier.map((item) => (
            <NotificationItem key={item.id} item={item} />
          ))}
        </div>
      </section>

      <div className="flex justify-center">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
