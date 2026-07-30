import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Download, ListFilter as Filter, Search, ShoppingBag, Star, Store } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Buy and sell study materials.",
}

const categories = [
  { id: "cat1", name: "Notes", count: 86 },
  { id: "cat2", name: "Past Papers", count: 54 },
  { id: "cat3", name: "Flashcard Decks", count: 32 },
  { id: "cat4", name: "Video Lessons", count: 28 },
  { id: "cat5", name: "Tutoring", count: 18 },
] as const

const listings = [
  { id: "l1", title: "Pharmacology Complete Notes 2026", seller: "Kwame A.", subject: "Pharmacology", type: "Notes", price: "GHS 25", rating: 4.8, downloads: 320 },
  { id: "l2", title: "Pathology Past Paper Bundle", seller: "Fatima B.", subject: "Pathology", type: "Past Papers", price: "GHS 18", rating: 4.6, downloads: 240 },
  { id: "l3", title: "Anatomy Flashcard Mega Deck", seller: "Chinedu E.", subject: "Anatomy", type: "Flashcards", price: "GHS 15", rating: 4.9, downloads: 410 },
  { id: "l4", title: "Physiology Video Series", seller: "Dr. Owusu", subject: "Physiology", type: "Video", price: "GHS 40", rating: 4.7, downloads: 180 },
  { id: "l5", title: "OSCE Practice Guide", seller: "Prof. Boateng", subject: "Clinical Skills", type: "Guide", price: "GHS 30", rating: 4.8, downloads: 290 },
  { id: "l6", title: "Community Health Summary Pack", seller: "Zainab Y.", subject: "Community Medicine", type: "Notes", price: "Free", rating: 4.5, downloads: 540 },
] as const

export default function MarketplacePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Marketplace" description="Discover and share study materials from peers and lecturers.">
        <Button variant="outline"><Filter data-icon="inline-start" />Filter</Button>
        <Button>List an item</Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active listings" value="218" icon={Store} accent="primary" />
        <StatCard label="Free resources" value="64" icon={Download} accent="secondary" />
        <StatCard label="Your purchases" value="8" icon={ShoppingBag} accent="accent" />
        <StatCard label="Your sales" value="3" icon={ShoppingBag} accent="warning" />
      </section>

      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" placeholder="Search the marketplace…" className="pl-9" aria-label="Search marketplace" />
        </div>
      </section>

      <section>
        <SectionHeading title="Categories" description="Browse by resource type." />
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge key={category.id} variant="outline" className="cursor-default px-3 py-1.5 text-sm">
              {category.name}
              <span className="ml-1.5 text-muted-foreground">{category.count}</span>
            </Badge>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Featured listings" description="Popular items this week." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Card key={listing.id} className="gap-3">
              <CardHeader>
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Store className="size-5" aria-hidden="true" />
                </div>
                <CardTitle className="pt-2 text-base">{listing.title}</CardTitle>
                <CardDescription>by {listing.seller}</CardDescription>
                <CardAction>
                  <Badge variant={listing.price === "Free" ? "success" : "muted"}>{listing.price}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <Badge variant="accent" className="w-fit">{listing.subject}</Badge>
                  <span className="flex items-center gap-1">
                    <Star className="size-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                    {listing.rating} · {listing.downloads} sales
                  </span>
                </div>
                <Button size="sm" asChild>
                  <Link href="/marketplace">View <ArrowRight data-icon="inline-end" /></Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
