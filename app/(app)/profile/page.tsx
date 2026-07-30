import type { Metadata } from "next"
import Link from "next/link"
import { Award, BookOpen, BrainCircuit, CalendarDays, Flame, GraduationCap, ListChecks, Mail, MapPin, Pencil, Settings, Trophy } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { Progress } from "@/components/ui/progress"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { student } from "@/lib/data/dashboard"

export const metadata: Metadata = {
  title: "Profile",
  description: "Your MedHaven profile.",
}

const stats = [
  { id: "st1", label: "Quizzes taken", value: "48", icon: "ListChecks" },
  { id: "st2", label: "Flashcards reviewed", value: "1,420", icon: "BrainCircuit" },
  { id: "st3", label: "Materials opened", value: "27", icon: "BookOpen" },
  { id: "st4", label: "Tutorials attended", value: "18", icon: "GraduationCap" },
] as const

const statIcons = { ListChecks, BrainCircuit, BookOpen, GraduationCap } as const

const achievements = [
  { id: "a1", title: "7-day streak", icon: "Flame", unlocked: true },
  { id: "a2", title: "Top 10 rank", icon: "Trophy", unlocked: true },
  { id: "a3", title: "40+ quizzes", icon: "ListChecks", unlocked: true },
  { id: "a4", title: "90%+ accuracy", icon: "Award", unlocked: true },
  { id: "a5", title: "14-day streak", icon: "Flame", unlocked: false },
  { id: "a6", title: "#1 rank", icon: "Trophy", unlocked: false },
] as const

const achievementIcons = { Flame, Trophy, ListChecks, Award } as const

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Profile" description="Your academic identity on MedHaven.">
        <Button variant="outline" asChild>
          <Link href="/settings"><Settings data-icon="inline-start" />Settings</Link>
        </Button>
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-accent" />
        <CardContent className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar initials={student.avatarInitials} className="size-24 border-4 border-card text-3xl shadow-sm" />
            <div className="flex flex-col gap-1 pb-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{student.name}</h2>
              <p className="text-sm text-muted-foreground">{student.level} · {student.semester}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="warning"><Flame className="size-3" aria-hidden="true" />{student.streak} day streak</Badge>
                <Badge variant="muted">Rank #{student.rank}</Badge>
                <Badge variant="accent">GPA {student.gpa}</Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" className="shrink-0"><Pencil data-icon="inline-start" />Edit profile</Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Mail className="size-4" aria-hidden="true" /> amara.okafor@medhaven.edu</div>
            <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" aria-hidden="true" /> Accra, Ghana</div>
            <div className="flex items-center gap-2 text-muted-foreground"><GraduationCap className="size-4" aria-hidden="true" /> MBBS Candidate, 2026</div>
            <div className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="size-4" aria-hidden="true" /> Joined Sept 2022</div>
            <div className="flex items-center gap-2 text-muted-foreground"><BookOpen className="size-4" aria-hidden="true" /> Matric: {student.matric}</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Study stats</CardTitle>
            <CardDescription>Your activity at a glance.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((stat) => {
              const Icon = statIcons[stat.icon]
              return (
                <div key={stat.id} className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-xl font-semibold text-foreground">{stat.value}</span>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <section>
        <SectionHeading title="Achievements" description="Badges you've earned and those still to unlock." />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {achievements.map((achievement) => {
            const Icon = achievementIcons[achievement.icon]
            return (
              <div key={achievement.id} className={`flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center ${achievement.unlocked ? "bg-card" : "bg-muted/40 opacity-60"}`}>
                <span className={`flex size-11 items-center justify-center rounded-xl ${achievement.unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-medium text-foreground">{achievement.title}</span>
                <Badge variant={achievement.unlocked ? "success" : "muted"}>{achievement.unlocked ? "Unlocked" : "Locked"}</Badge>
              </div>
            )
          })}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Term progress</CardTitle>
          <CardDescription>Overall completion toward end of semester.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">67% complete</span>
            <span className="text-sm font-medium text-foreground">19 days to exams</span>
          </div>
          <Progress value={67} />
        </CardContent>
      </Card>
    </div>
  )
}
