import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BellRing,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Clapperboard,
  Download,
  Flame,
  GraduationCap,
  Library,
  ListChecks,
  MessageSquare,
  Sparkles,
  Store,
  TrendingUp,
  Trophy,
} from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import {
  activityTimeline,
  aiAssistantPreview,
  announcements,
  continueReading,
  examCountdown,
  leaderboard,
  progressWidgets,
  quickActions,
  recentMaterials,
  student,
  studyAnalytics,
  todayTimetable,
  upcomingTutorials,
} from "@/lib/data/dashboard"
import { cn } from "@/lib/utils"

const quickActionIcons = { ListChecks, BrainCircuit, Library, Clapperboard, CalendarDays, Store } as const
const timelineIcons = { ListChecks, BrainCircuit, Clapperboard, Download, GraduationCap } as const

const colorBar: Record<string, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
  muted: "bg-muted-foreground",
  warning: "bg-amber-500",
}

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your MedHaven study overview.",
}

export default function DashboardPage() {
  const maxWeekly = Math.max(...studyAnalytics.weeklyData)
  const examDaysTotal = examCountdown.totalDays
  const examProgress = Math.round(((examDaysTotal - examCountdown.daysLeft) / examDaysTotal) * 100)

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4">
            <Badge variant="accent" className="w-fit">
              <Sparkles className="size-3" aria-hidden="true" />
              Welcome back
            </Badge>
            <div className="flex flex-col gap-2">
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Good morning, {student.firstName}.
              </h1>
              <p className="max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
                You&apos;re on a {student.streak}-day study streak. {examCountdown.subject} is in {examCountdown.daysLeft} days — keep the momentum going.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild>
                <Link href="/quizzes">
                  Start a quiz
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/timetable">View timetable</Link>
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur">
            <Avatar initials={student.avatarInitials} className="size-14 text-lg" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">{student.name}</p>
              <p className="text-xs text-muted-foreground">{student.level}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="warning"><Flame className="size-3" aria-hidden="true" />{student.streak} days</Badge>
                <Badge variant="muted">Rank #{student.rank}</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Study hours this week" value={`${studyAnalytics.weeklyHours}h`} icon={TrendingUp} trend="up" trendLabel={`${studyAnalytics.weeklyChange} vs last week`} accent="primary" />
        <StatCard label="Quizzes taken" value={`${studyAnalytics.quizzesTaken}`} icon={ListChecks} trend="up" trendLabel={`${studyAnalytics.quizAccuracy}% accuracy`} accent="secondary" />
        <StatCard label="Flashcards reviewed" value={`${studyAnalytics.cardsReviewed}`} icon={BrainCircuit} trend="up" trendLabel="+24 this week" accent="accent" />
        <StatCard label="Materials opened" value={`${studyAnalytics.materialsOpened}`} icon={BookOpen} trend="down" trendLabel="-3 vs last week" accent="warning" />
      </section>

      <section>
        <SectionHeading title="Quick actions" description="Jump straight into your most-used tools." />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((action) => {
            const Icon = quickActionIcons[action.icon]
            return (
              <Link
                key={action.label}
                href={action.href}
                className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </Link>
            )
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Study analytics</CardTitle>
              <CardDescription>Hours studied over the past week</CardDescription>
              <CardAction>
                <Badge variant="secondary">{studyAnalytics.weeklyHours}h / {studyAnalytics.weeklyGoal}h</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex h-44 items-end justify-between gap-2 sm:gap-4">
                {studyAnalytics.weeklyData.map((value, index) => (
                  <div key={index} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-md bg-primary/80 transition-all hover:bg-primary"
                        style={{ height: `${(value / maxWeekly) * 100}%` }}
                        title={`${value}h`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{studyAnalytics.weeklyLabels[index]}</span>
                  </div>
                ))}
              </div>
              <Progress value={(studyAnalytics.weeklyHours / studyAnalytics.weeklyGoal) * 100} className="mt-4" />
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" aria-hidden="true" /> Today&apos;s timetable</CardTitle>
                <CardDescription>Wednesday, 30 July</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {todayTimetable.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">{item.time}</span>
                    <span className={cn("h-8 w-1 shrink-0 rounded-full", colorBar[item.color])} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.room}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="size-4 text-primary" aria-hidden="true" /> Leaderboard</CardTitle>
                <CardDescription>Top students this month</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-1.5",
                      entry.isYou && "bg-primary/5 ring-1 ring-primary/20"
                    )}
                  >
                    <span className="w-5 text-center text-sm font-semibold text-muted-foreground">{index + 1}</span>
                    <Avatar initials={entry.initials} className="size-8 text-xs" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate text-sm font-medium text-foreground">{entry.name}{entry.isYou ? " (you)" : ""}</p>
                      <p className="text-xs text-muted-foreground">{entry.points} pts</p>
                    </div>
                    <Badge variant="muted">{entry.change}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Continue reading</CardTitle>
              <CardDescription>Pick up where you left off</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {continueReading.map((item) => (
                <Link key={item.id} href={item.href} className="group flex items-center gap-4 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/50">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="size-5" aria-hidden="true" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={item.progress} className="h-1.5 max-w-32" />
                      <span className="text-xs text-muted-foreground">{item.progress}%</span>
                    </div>
                  </div>
                  <Badge variant="muted" className="shrink-0">{item.type}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent materials</CardTitle>
              <CardDescription>Recently added to your workspace</CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/materials">View all <ArrowRight data-icon="inline-end" /></Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {recentMaterials.map((item) => (
                <Link key={item.id} href={item.href} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Download className="size-4" aria-hidden="true" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.type} · {item.size}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Flame className="size-4 text-amber-500" aria-hidden="true" /> Exam countdown</CardTitle>
              <CardDescription>{examCountdown.subject}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold tracking-tight text-foreground">{examCountdown.daysLeft}</span>
                <span className="pb-1 text-sm text-muted-foreground">days remaining</span>
              </div>
              <Progress value={examProgress} indicatorClassName="bg-amber-500" />
              <p className="text-xs text-muted-foreground">{examProgress}% of the term elapsed</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" aria-hidden="true" /> MedHaven AI</CardTitle>
              <CardDescription>{aiAssistantPreview.greeting}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <MessageSquare className="size-4" aria-hidden="true" />
                </span>
                <p className="text-sm text-muted-foreground">Try one of these to get started:</p>
              </div>
              <div className="flex flex-col gap-2">
                {aiAssistantPreview.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-lg border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/quizzes">Open AI assistant <ArrowRight data-icon="inline-end" /></Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BellRing className="size-4 text-primary" aria-hidden="true" /> Announcements</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {announcements.map((item) => (
                <div key={item.id} className="flex flex-col gap-1.5 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <Badge variant="muted" className="shrink-0">{item.tag}</Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                  <span className="text-xs text-muted-foreground/70">{item.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Study streak</CardTitle>
              <CardDescription>Subject progress this term</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {progressWidgets.map((item) => (
                <div key={item.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.value}%</span>
                  </div>
                  <Progress value={item.value} indicatorClassName={colorBar[item.color]} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GraduationCap className="size-4 text-primary" aria-hidden="true" /> Upcoming tutorials</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {upcomingTutorials.map((item) => (
                <div key={item.id} className="flex flex-col gap-1.5 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <Badge variant="accent" className="shrink-0">{item.subject}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.tutor} · {item.time}</p>
                  <p className="text-xs text-muted-foreground/70">{item.seats}</p>
                </div>
              ))}
              <Button variant="outline" size="sm" asChild>
                <Link href="/tutorials">Browse tutorials <ArrowRight data-icon="inline-end" /></Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity timeline</CardTitle>
              <CardDescription>Your recent actions</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
                {activityTimeline.map((item) => {
                  const Icon = timelineIcons[item.icon]
                  return (
                    <li key={item.id} className="relative flex gap-3">
                      <span className="absolute -left-[1.4rem] flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-background">
                        <Icon className="size-3" aria-hidden="true" />
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                        <span className="text-xs text-muted-foreground/70">{item.time}</span>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
