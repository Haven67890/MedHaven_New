import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CircleCheck as CheckCircle2, ListChecks, RotateCcw, Sparkles, Star, Target, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { Progress } from "@/components/ui/progress"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"

export const metadata: Metadata = {
  title: "AI Quizzes",
  description: "Adaptive AI-generated quizzes.",
}

const quizModes = [
  { id: "qm1", title: "Adaptive Quiz", description: "Difficulty adjusts to your level as you answer.", icon: "Sparkles", color: "primary" },
  { id: "qm2", title: "Timed Exam", description: "Simulate exam conditions with a strict timer.", icon: "Target", color: "secondary" },
  { id: "qm3", title: "Weakness Focus", description: "Target the topics you struggle with most.", icon: "TrendingUp", color: "accent" },
] as const

const recentQuizzes = [
  { id: "rq1", title: "Pharmacology — Drug Metabolism", subject: "Pharmacology", questions: 24, score: 86, date: "Today, 09:20" },
  { id: "rq2", title: "Pathology — Neoplasia", subject: "Pathology", questions: 20, score: 72, date: "Yesterday, 18:40" },
  { id: "rq3", title: "Physiology — Cardiac", subject: "Physiology", questions: 18, score: 94, date: "2 days ago" },
  { id: "rq4", title: "Anatomy — Cranial Nerves", subject: "Anatomy", questions: 22, score: 68, date: "3 days ago" },
] as const

const recommended = [
  { id: "rec1", title: "Inflammation & Repair", subject: "Pathology", questions: 20, reason: "Based on your recent weak areas" },
  { id: "rec2", title: "Antibiotic Mechanisms", subject: "Pharmacology", questions: 25, reason: "You haven't reviewed this in 8 days" },
  { id: "rec3", title: "OSCE Key Procedures", subject: "Clinical Skills", questions: 15, reason: "Recommended by your tutor" },
] as const

const modeIcons = { Sparkles, Target, TrendingUp } as const

const colorMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/15 text-secondary dark:text-secondary/90",
  accent: "bg-accent text-accent-foreground",
}

export default function AIQuizzesPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="AI Quizzes" description="Let MedHaven AI build adaptive quizzes tailored to your performance and gaps.">
        <Button>Generate a quiz</Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Quizzes taken" value="48" icon={ListChecks} accent="primary" />
        <StatCard label="Avg. accuracy" value="84%" icon={Target} accent="secondary" />
        <StatCard label="Best score" value="96%" icon={Star} accent="accent" />
        <StatCard label="Questions answered" value="1,120" icon={CheckCircle2} accent="warning" />
      </section>

      <section>
        <SectionHeading title="Choose a quiz mode" description="Pick how you want to practice today." />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {quizModes.map((mode) => {
            const Icon = modeIcons[mode.icon]
            return (
              <Card key={mode.id} className="group gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <div className={`flex size-11 items-center justify-center rounded-xl ${colorMap[mode.color]}`}>
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="pt-2">{mode.title}</CardTitle>
                  <CardDescription>{mode.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" asChild>
                    <Link href="/quizzes">Start <ArrowRight data-icon="inline-end" /></Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recommended for you</CardTitle>
            <CardDescription>AI-picked quizzes based on your activity.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recommended.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/40">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="size-5" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link href="/quizzes">Start</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent attempts</CardTitle>
            <CardDescription>Your latest quiz results.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentQuizzes.map((quiz) => (
              <div key={quiz.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <RotateCcw className="size-5" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate text-sm font-medium text-foreground">{quiz.title}</p>
                  <p className="text-xs text-muted-foreground">{quiz.subject} · {quiz.questions} Qs · {quiz.date}</p>
                  <Progress value={quiz.score} className="h-1.5" />
                </div>
                <Badge variant={quiz.score >= 80 ? "success" : "warning"} className="shrink-0">{quiz.score}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
