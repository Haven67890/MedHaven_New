import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Download, FileQuestionMark as FileQuestion, ListFilter as Filter, Search, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"

export const metadata: Metadata = {
  title: "Past Questions",
  description: "Practice with past examination papers.",
}

const subjects = [
  { id: "s1", name: "Pharmacology", papers: 24, questions: 960 },
  { id: "s2", name: "Pathology", papers: 18, questions: 720 },
  { id: "s3", name: "Physiology", papers: 20, questions: 800 },
  { id: "s4", name: "Anatomy", papers: 22, questions: 880 },
  { id: "s5", name: "Community Medicine", papers: 12, questions: 480 },
  { id: "s6", name: "Clinical Skills", papers: 10, questions: 400 },
] as const

const papers = [
  { id: "p1", title: "Pharmacology — 2025 First Semester", subject: "Pharmacology", year: 2025, questions: 40, difficulty: "Medium", rating: 4.5, attempts: 312 },
  { id: "p2", title: "Pathology — 2024 End of Year", subject: "Pathology", year: 2024, questions: 50, difficulty: "Hard", rating: 4.7, attempts: 284 },
  { id: "p3", title: "Physiology — 2025 Mock Exam", subject: "Physiology", year: 2025, questions: 35, difficulty: "Easy", rating: 4.2, attempts: 198 },
  { id: "p4", title: "Anatomy — 2024 Spot Test", subject: "Anatomy", year: 2024, questions: 25, difficulty: "Medium", rating: 4.4, attempts: 256 },
  { id: "p5", title: "Community Medicine — 2025 Mid-term", subject: "Community Medicine", year: 2025, questions: 30, difficulty: "Easy", rating: 4.1, attempts: 142 },
  { id: "p6", title: "Clinical Skills — 2024 OSCE Bank", subject: "Clinical Skills", year: 2024, questions: 45, difficulty: "Hard", rating: 4.8, attempts: 301 },
] as const

const difficultyVariant: Record<string, "success" | "warning" | "destructive"> = {
  Easy: "success",
  Medium: "warning",
  Hard: "destructive",
}

export default function PastQuestionsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Past Questions" description="Practice with real past papers, track your attempts, and sharpen your exam technique.">
        <Button variant="outline"><Filter data-icon="inline-start" />Filter</Button>
        <Button>Start random quiz</Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Past papers" value="106" icon={FileQuestion} accent="primary" />
        <StatCard label="Total questions" value="4,240" icon={FileQuestion} accent="secondary" />
        <StatCard label="Your attempts" value="32" icon={Star} accent="accent" />
      </section>

      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" placeholder="Search papers by subject or year…" className="pl-9" aria-label="Search past questions" />
        </div>
      </section>

      <section>
        <SectionHeading title="Browse by subject" description="Pick a subject to see available papers." />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {subjects.map((subject) => (
            <Link key={subject.id} href="/past-questions" className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileQuestion className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-foreground">{subject.name}</span>
              <span className="text-xs text-muted-foreground">{subject.papers} papers · {subject.questions} Qs</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Available papers" description="Recently added and popular past papers." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((paper) => (
            <Card key={paper.id} className="gap-3">
              <CardHeader>
                <CardTitle className="text-base">{paper.title}</CardTitle>
                <CardDescription>{paper.subject} · {paper.year}</CardDescription>
                <CardAction>
                  <Badge variant={difficultyVariant[paper.difficulty]}>{paper.difficulty}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>{paper.questions} questions</span>
                  <span className="flex items-center gap-1">
                    <Star className="size-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                    {paper.rating} · {paper.attempts} attempts
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Download data-icon="inline-start" /></Button>
                  <Button size="sm" asChild>
                    <Link href="/quizzes">Start <ArrowRight data-icon="inline-end" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
