import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookMarked, BookOpen, ListFilter as Filter, Library, Search, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"

export const metadata: Metadata = {
  title: "Smart Library",
  description: "Browse the MedHaven digital library.",
}

const collections = [
  { id: "c1", name: "Medicine", count: 1280, icon: "BookOpen", color: "primary" },
  { id: "c2", name: "Surgery", count: 640, icon: "BookMarked", color: "secondary" },
  { id: "c3", name: "Pharmacology", count: 412, icon: "Library", color: "accent" },
  { id: "c4", name: "Pathology", count: 388, icon: "BookOpen", color: "primary" },
  { id: "c5", name: "Anatomy", count: 356, icon: "BookMarked", color: "secondary" },
  { id: "c6", name: "Community Health", count: 224, icon: "Library", color: "accent" },
] as const

const featured = [
  { id: "f1", title: "Robbins & Cotran Pathologic Basis of Disease", author: "Kumar, Abbas, Aster", subject: "Pathology", rating: 4.9, available: true },
  { id: "f2", title: "Rang & Dale's Pharmacology", author: "Ritter, Flower, Henderson", subject: "Pharmacology", rating: 4.8, available: true },
  { id: "f3", title: "Gray's Anatomy for Students", author: "Drake, Vogl, Mitchell", subject: "Anatomy", rating: 4.7, available: false },
  { id: "f4", title: "Davidson's Principles and Practice of Medicine", author: "Boon et al.", subject: "Medicine", rating: 4.9, available: true },
  { id: "f5", title: "Bailey & Love's Short Practice of Surgery", author: "Williams, O'Connell", subject: "Surgery", rating: 4.6, available: true },
  { id: "f6", title: "Harrison's Principles of Internal Medicine", author: "Jameson et al.", subject: "Medicine", rating: 4.9, available: true },
] as const

const colorMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/15 text-secondary dark:text-secondary/90",
  accent: "bg-accent text-accent-foreground",
}

const collectionIcons = { BookOpen, BookMarked, Library } as const

export default function SmartLibraryPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Smart Library" description="Search across thousands of textbooks, journals, and references curated for your curriculum.">
        <Button variant="outline"><Filter data-icon="inline-start" />Filter</Button>
        <Button>Request a book</Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total titles" value="3,300+" icon={Library} accent="primary" />
        <StatCard label="Available now" value="2,940" icon={BookOpen} accent="secondary" />
        <StatCard label="Your bookmarks" value="18" icon={BookMarked} accent="accent" />
      </section>

      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" placeholder="Search by title, author, or subject…" className="pl-9" aria-label="Search the library" />
        </div>
      </section>

      <section>
        <SectionHeading title="Browse collections" description="Explore by subject area." />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {collections.map((collection) => {
            const Icon = collectionIcons[collection.icon]
            return (
              <Link key={collection.id} href="/library" className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <span className={`flex size-10 items-center justify-center rounded-xl ${colorMap[collection.color]}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{collection.name}</span>
                  <span className="text-xs text-muted-foreground">{collection.count} titles</span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <SectionHeading title="Featured titles" description="Most-borrowed references this semester." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((book) => (
            <Card key={book.id} className="gap-3">
              <CardHeader>
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="size-6" aria-hidden="true" />
                </div>
                <CardTitle className="pt-2 text-base">{book.title}</CardTitle>
                <CardDescription>{book.author}</CardDescription>
                <CardAction>
                  <Badge variant={book.available ? "success" : "muted"}>{book.available ? "Available" : "On loan"}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="accent">{book.subject}</Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                    {book.rating}
                  </span>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/library">Details <ArrowRight data-icon="inline-end" /></Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
