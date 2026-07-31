import type { Metadata } from "next"
import { Award, BookOpen, BrainCircuit, Flame, ListChecks, Target, TrendingUp, Trophy } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { Progress } from "@/components/ui/progress"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"

export const metadata: Metadata = {
  title: "Progress Tracker",
  description: "Track your study goals and progress.",
}

const subjects = [
  { id: "s1", name: "Pharmacology", progress: 78, quizzes: 18, accuracy: 84, color: "primary" },
  { id: "s2", name: "Pathology", progress: 64, quizzes: 14, accuracy: 76, color: "secondary" },
  { id: "s3", name: "Physiology", progress: 91, quizzes: 22, accuracy: 92, color: "accent" },
  { id: "s4", name: "Anatomy", progress: 55, quizzes: 10, accuracy: 68, color: "warning" },
  { id: "s5", name: "Community Medicine", progress: 42, quizzes: 6, accuracy: 71, color: "primary" },
  { id: "s6", name: "Clinical Skills", progress: 73, quizzes: 12, accuracy: 88, color: "secondary" },
] as const

const goals = [
  { id: "g1", label: "Complete 50 quizzes this term", current: 48, target: 50, icon: "ListChecks" },
  { id: "g2", label: "Review 200 flashcards", current: 142, target: 200, icon: "BrainCircuit" },
  { id: "g3", label: "Watch 30 lecture videos", current: 42, target: 30, icon: "BookOpen" },
  { id: "g4", label: "Maintain a 14-day streak", current: 12, target: 14, icon: "Flame" },
] as const

const goalIcons = { ListChecks, BrainCircuit, BookOpen, Flame } as const

const colorBar: Record<string, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
  warning: "bg-amber-500",
}

const milestones = [
  { id: "ms1", title: "Completed first 10 quizzes", date: "Achieved 12 Jun", icon: "Award" },
  { id: "ms2", title: "7-day study streak", date: "Achieved 20 Jul", icon: "Flame" },
  { id: "ms3", title: "90%+ Physiology accuracy", date: "Achieved 24 Jul", icon: "Target" },
  { id: "ms4", title: "Top 10 on leaderboard", date: "Achieved 28 Jul", icon: "Trophy" },
] as const

const milestoneIcons = { Award, Flame, Target, Trophy } as const

export default function ProgressTrackerPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Progress Tracker" description="See how far you've come and where to focus next." />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Overall progress" value="67%" icon={TrendingUp} trend="up" trendLabel="+8% this month" accent="primary" />
        <StatCard label="Current streak" value="12 days" icon={Flame} trend="up" trendLabel="Personal best" accent="warning" />
        <StatCard label="Quizzes completed" value="48" icon={ListChecks} trend="up" trendLabel="+6 this week" accent="secondary" />
        <StatCard label="Leaderboard rank" value="#7" icon={Trophy} trend="up" trendLabel="+3 places" accent="accent" />
      </section>

      <section>
        <SectionHeading title="Subject progress" description="Mastery and accuracy across your subjects." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id} className="gap-3">
              <CardHeader>
                <CardTitle className="text-base">{subject.name}</CardTitle>
                <CardDescription>{subject.quizzes} quizzes · {subject.accuracy}% accuracy</CardDescription>
                <CardAction>
                  <Badge variant="muted">{subject.progress}%</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <Progress value={subject.progress} indicatorClassName={colorBar[subject.color]} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Study goals</CardTitle>
            <CardDescription>Term goals and your progress toward them.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {goals.map((goal) => {
              const Icon = goalIcons[goal.icon]
              const pct = Math.min(100, Math.round((goal.current / goal.target) * 100))
              return (
                <div key={goal.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{goal.label}</p>
                      <Badge variant={pct >= 100 ? "success" : "muted"}>{goal.current} / {goal.target}</Badge>
                    </div>
                  </div>
                  <Progress value={pct} />
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
            <CardDescription>Achievements you&apos;ve unlocked.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
              {milestones.map((milestone) => {
                const Icon = milestoneIcons[milestone.icon]
                return (
                  <li key={milestone.id} className="relative flex gap-3">
                    <span className="absolute -left-[1.4rem] flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-background">
                      <Icon className="size-3" aria-hidden="true" />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium text-foreground">{milestone.title}</p>
                      <span className="text-xs text-muted-foreground/70">{milestone.date}</span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly study hours</CardTitle>
          <CardDescription>Your consistency over the past 6 weeks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-end justify-between gap-3 sm:gap-6">
            {[18, 22, 16, 24, 20, 23.5].map((hours, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full rounded-t-md bg-primary/80 transition-all hover:bg-primary" style={{ height: `${(hours / 30) * 100}%` }} title={`${hours}h`} />
                </div>
                <span className="text-xs text-muted-foreground">W{index + 1}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
