import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteShell } from "@/components/layout/site-shell"
import { MedHavenLogo } from "@/components/brand/medhaven-logo"
import { HomeActions } from "@/components/home/home-actions"

export const metadata: Metadata = {
  title: "MedHaven — Medical Study Platform for UNIJOS & JUTH Students",
  description: "MedHaven is the dedicated medical study platform for UNIJOS and JUTH medical students. Access organized course materials, clinical guides, past questions, flashcards, and timetable schedules in one workspace.",
  openGraph: {
    title: "MedHaven — Medical Study Platform for UNIJOS & JUTH Students",
    description: "MedHaven is the dedicated medical study platform for UNIJOS and JUTH medical students. Access organized course materials, clinical guides, past questions, flashcards, and timetable schedules in one workspace.",
    url: "https://medhaven.onrender.com",
    siteName: "MedHaven",
    images: [
      {
        url: "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/Untitled%20design.png",
        width: 1200,
        height: 630,
        alt: "MedHaven Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MedHaven — Medical Study Platform for UNIJOS & JUTH Students",
    description: "MedHaven is the dedicated medical study platform for UNIJOS and JUTH medical students. Access organized course materials, clinical guides, past questions, flashcards, and timetable schedules in one workspace.",
    images: ["https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/Untitled%20design.png"],
  },
}

export default function HomePage() {
  return (
    <SiteShell>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <div className="mb-2">
              <MedHavenLogo
                className="h-auto w-auto"
                imgClassName="h-20 sm:h-28 md:h-32 w-auto max-w-full drop-shadow-md"
              />
            </div>
            <span className="w-fit rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              MedHaven
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                The care-focused campus experience for medical learners.
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Access study resources, track your progress, and stay connected to your academic community in one clear workspace.
              </p>
            </div>
            <HomeActions />
          </div>

          <Card className="border-border shadow-xl shadow-primary/5 overflow-hidden">
            <div className="relative h-48 w-full border-b border-border/50">
              <Image
                src="https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/20260622_130116.jpg"
                alt="Medical students reviewing study materials in clinical group session"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 450px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            </div>
            <CardHeader className="-mt-6 relative z-10">
              <CardTitle>Built for medical training</CardTitle>
              <CardDescription>Connected tools for students, faculty, and administrators.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm font-medium text-foreground">Academic access</p>
                <p className="mt-2 text-sm text-muted-foreground">View personalized materials, study pathways, and department-level updates.</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm font-medium text-foreground">Secure workflows</p>
                <p className="mt-2 text-sm text-muted-foreground">Only authenticated users can reach protected dashboard and admin pages.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dedicated Support & Donate CTA Section */}
        <div className="mt-8 rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-500/5 via-primary/5 to-rose-500/5 p-6 sm:p-10 shadow-lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-300">
                <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                <span>Empower Medical Education</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Support open access for medical scholars
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Your contributions keep study resources, practical guides, and learning tools accessible to medical students and trainees across campuses.
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0 gap-2 bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 shadow-md">
              <Link href="/donate">
                <Heart className="h-4 w-4 fill-white" />
                Make a Donation
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
