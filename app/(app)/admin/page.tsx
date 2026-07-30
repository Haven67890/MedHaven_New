import type { Metadata } from "next"
import { Activity, ClipboardList, FileText, ShieldCheck, TrendingUp, Users } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { Progress } from "@/components/ui/progress"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import { adminDepartments, adminReports, adminStats, adminUsers, adminWeekly } from "@/lib/data/admin"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Platform administration overview.",
}

const statIcons = { Users, Activity, FileText, ClipboardList } as const
const colorBar: Record<string, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
}

const reportStatusVariant: Record<string, "warning" | "accent" | "success"> = {
  Open: "warning",
  "In review": "accent",
  Resolved: "success",
}

const userStatusVariant: Record<string, "success" | "destructive"> = {
  Active: "success",
  Suspended: "destructive",
}

export default function AdminDashboardPage() {
  const maxWeekly = Math.max(...adminWeekly.map((d) => d.value))
  const maxDeptStudents = Math.max(...adminDepartments.map((d) => d.students))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Admin Dashboard" description="Monitor platform health, users, and content at a glance.">
        <Badge variant="accent"><ShieldCheck className="size-3" aria-hidden="true" />Administrator</Badge>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {adminStats.map((stat) => {
          const Icon = statIcons[stat.icon as keyof typeof statIcons]
          return (
            <StatCard
              key={stat.id}
              label={stat.label}
              value={stat.value}
              icon={Icon}
              trend={stat.trend as "up" | "down"}
              trendLabel={stat.trendLabel}
              accent={stat.id === "as4" ? "warning" : "primary"}
            />
          )
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-primary" aria-hidden="true" /> Weekly active users</CardTitle>
            <CardDescription>Daily active students over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-44 items-end justify-between gap-2 sm:gap-4">
              {adminWeekly.map((day) => (
                <div key={day.id} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div className="w-full rounded-t-md bg-primary/80 transition-all hover:bg-primary" style={{ height: `${(day.value / maxWeekly) * 100}%` }} title={`${day.value}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{day.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform health</CardTitle>
            <CardDescription>System status overview</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Uptime (30d)</span>
                <span className="text-sm font-medium text-foreground">99.9%</span>
              </div>
              <Progress value={99.9} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Storage used</span>
                <span className="text-sm font-medium text-foreground">62%</span>
              </div>
              <Progress value={62} indicatorClassName="bg-secondary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">API response</span>
                <span className="text-sm font-medium text-foreground">142ms</span>
              </div>
              <Progress value={78} indicatorClassName="bg-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      <section>
        <SectionHeading title="Departments" description="Students and materials by department." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminDepartments.map((dept) => (
            <Card key={dept.id} className="gap-3">
              <CardHeader>
                <CardTitle className="text-base">{dept.name}</CardTitle>
                <CardDescription>{dept.students} students · {dept.materials} materials</CardDescription>
                <CardAction>
                  <Badge variant="muted">{dept.students}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", colorBar[dept.color])} style={{ width: `${(dept.students / maxDeptStudents) * 100}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{Math.round((dept.students / maxDeptStudents) * 100)}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent users</CardTitle>
            <CardDescription>Latest accounts on the platform.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {adminUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
                <Avatar initials={user.initials} className="size-9 text-xs" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.role} · {user.level}</p>
                </div>
                <Badge variant={userStatusVariant[user.status]} className="shrink-0">{user.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open reports</CardTitle>
            <CardDescription>Issues flagged by users.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {adminReports.map((report) => (
              <div key={report.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{report.title}</p>
                  <Badge variant={reportStatusVariant[report.status]} className="shrink-0">{report.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Reported by {report.reporter} · {report.time}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
