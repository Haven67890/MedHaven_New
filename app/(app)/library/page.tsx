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
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Smart Library",
  description: "Browse the MedHaven digital library.",
}

const colorMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/15 text-secondary dark:text-secondary/90",
  accent: "bg-accent text-accent-foreground",
}

const collectionIcons = { BookOpen, BookMarked, Library } as const

export default async function SmartLibraryPage() {
  const supabase = await createClient()
  const { data: courses } = await supabase
    .from("courses")
    .select("id, code, name, title, level, parent_id, department_id, faculty_id, university_id, description")
    .order("name", { ascending: true })
    .limit(100)

  const collectionData = (courses ?? []).slice(0, 6).map((course, index) => ({
    id: String(course.id ?? `course-${index}`),
    name: String(course.name ?? course.title ?? course.code ?? "Curriculum"),
    count: (courses ?? []).filter((item) => (item.name ?? item.title ?? item.code ?? "") === (course.name ?? course.title ?? course.code ?? "")).length,
    icon: index % 3 === 0 ? "BookOpen" : index % 3 === 1 ? "BookMarked" : "Library",
    color: index % 3 === 0 ? "primary" : index % 3 === 1 ? "secondary" : "accent",
  }))

  const featured = (courses ?? []).slice(0, 6).map((course, index) => ({
    id: String(course.id ?? `featured-${index}`),
    title: String(course.name ?? course.title ?? course.code ?? "Curriculum item"),
    author: String(course.level ?? "Curriculum"),
    subject: String(course.parent_id ?? "General"),
    rating: 4.8,
    available: true,
  }))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Smart Library" description="Search across thousands of textbooks, journals, and references curated for your curriculum.">
        <Button variant="outline"><Filter data-icon="inline-start" />Filter</Button>
        <Button>Request a book</Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total titles" value={String((courses ?? []).length || 0)} icon={Library} accent="primary" />
        <StatCard label="Available now" value={String((courses ?? []).length || 0)} icon={BookOpen} accent="secondary" />
        <StatCard label="Your bookmarks" value="0" icon={BookMarked} accent="accent" />
      </section>

      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" placeholder="Search by title, author, or subject…" className="pl-9" aria-label="Search the library" />
        </div>
      </section>

      <section>
        <SectionHeading title="Browse collections" description="Explore by subject area." />
        {collectionData.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {collectionData.map((collection) => {
              const Icon = collectionIcons[collection.icon as keyof typeof collectionIcons]
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
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No library records are available yet. Upload study materials to populate the live curriculum library.
          </div>
        )}
      </section>

      <section>
        <SectionHeading title="Featured titles" description="Most-borrowed references this semester." />
        {featured.length > 0 ? (
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
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No featured resources are available yet. Once study content is uploaded to Supabase, it will appear here automatically.
          </div>
        )}
      </section>
    </div>
  )
}
