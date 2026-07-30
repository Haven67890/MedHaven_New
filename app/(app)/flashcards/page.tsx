import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BrainCircuit, Plus, RotateCcw, Search, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { Progress } from "@/components/ui/progress"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"

export const metadata: Metadata = {
  title: "Flashcards",
  description: "Active recall flashcard decks.",
}

const decks = [
  { id: "d1", title: "Inflammation & Repair", subject: "Pathology", cards: 64, mastered: 48, rating: 4.8, color: "primary" },
  { id: "d2", title: "Antibiotic Classes", subject: "Pharmacology", cards: 52, mastered: 30, rating: 4.6, color: "secondary" },
  { id: "d3", title: "Cranial Nerves", subject: "Anatomy", cards: 48, mastered: 42, rating: 4.9, color: "accent" },
  { id: "d4", title: "Cardiac Cycle", subject: "Physiology", cards: 40, mastered: 22, rating: 4.5, color: "primary" },
  { id: "d5", title: "Health Promotion", subject: "Community Medicine", cards: 36, mastered: 18, rating: 4.3, color: "secondary" },
  { id: "d6", title: "OSCE Key Steps", subject: "Clinical Skills", cards: 58, mastered: 40, rating: 4.7, color: "accent" },
] as const

const colorBar: Record<string, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  accent: "bg-accent",
}

const sampleCards = [
  { id: "sc1", front: "What is first-pass metabolism?", back: "The metabolism of a drug by the liver before it reaches systemic circulation, reducing bioavailability of orally administered drugs." },
  { id: "sc2", front: "Define neoplasia.", back: "New, uncontrolled growth of cells that is not coordinated with normal tissue growth, resulting in a neoplasm (tumour)." },
  { id: "sc3", front: "Name the three layers of the heart wall.", back: "Endocardium, myocardium, and epicardium." },
] as const

export default function FlashcardsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Flashcards" description="Build active recall with curated decks and spaced repetition.">
        <Button variant="outline"><Plus data-icon="inline-start" />Create deck</Button>
        <Button>Study now</Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total decks" value="24" icon={BrainCircuit} accent="primary" />
        <StatCard label="Cards reviewed" value="1,420" icon={RotateCcw} accent="secondary" />
        <StatCard label="Mastery rate" value="72%" icon={Star} accent="accent" />
        <StatCard label="Due today" value="38" icon={BrainCircuit} accent="warning" />
      </section>

      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" placeholder="Search decks by title or subject…" className="pl-9" aria-label="Search flashcard decks" />
        </div>
      </section>

      <section>
        <SectionHeading title="Your decks" description="Track mastery across each deck." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const mastery = Math.round((deck.mastered / deck.cards) * 100)
            return (
              <Card key={deck.id} className="gap-3">
                <CardHeader>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BrainCircuit className="size-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="pt-2 text-base">{deck.title}</CardTitle>
                  <CardDescription>{deck.subject} · {deck.cards} cards</CardDescription>
                  <CardAction>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="size-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                      {deck.rating}
                    </span>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Mastery</span>
                    <span className="text-xs font-medium text-foreground">{mastery}%</span>
                  </div>
                  <Progress value={mastery} indicatorClassName={colorBar[deck.color]} />
                  <Button variant="outline" size="sm" asChild className="mt-2">
                    <Link href="/flashcards">Study deck <ArrowRight data-icon="inline-end" /></Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section>
        <SectionHeading title="Sample cards" description="A quick preview of what's inside." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sampleCards.map((card) => (
            <Card key={card.id} className="gap-2">
              <CardHeader>
                <Badge variant="accent" className="w-fit">Front</Badge>
                <CardTitle className="pt-1 text-base font-medium">{card.front}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Badge variant="muted" className="w-fit">Back</Badge>
                <p className="text-sm leading-relaxed text-muted-foreground">{card.back}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
