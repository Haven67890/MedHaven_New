import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import {
  FileText,
  BookOpen,
  HelpCircle,
  ImageIcon,
  FolderCheck,
  Brain,
  ArrowRight,
  UserPlus,
  BookMarked,
  GraduationCap,
  Sparkles,
  Heart,
  Globe2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteShell } from "@/components/layout/site-shell"
import { MedHavenLogo } from "@/components/brand/medhaven-logo"

export const metadata: Metadata = {
  title: "MedHaven — Medical Study Platform for Nigerian Medical Students",
  description:
    "MedHaven is a free study platform built for Nigerian medical students — past questions, AI quizzes, flashcards, and lecturers' original materials, all in one place.",
  openGraph: {
    title: "MedHaven — Medical Study Platform for Nigerian Medical Students",
    description:
      "MedHaven is a free study platform built for Nigerian medical students — past questions, AI quizzes, flashcards, and lecturers' original materials, all in one place.",
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
    title: "MedHaven — Medical Study Platform for Nigerian Medical Students",
    description:
      "MedHaven is a free study platform built for Nigerian medical students — past questions, AI quizzes, flashcards, and lecturers' original materials, all in one place.",
    images: [
      "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/Untitled%20design.png",
    ],
  },
}

const featureList = [
  {
    icon: FileText,
    title: "Past Questions",
    description:
      "Access curated past examination questions sorted by level and course format. Practice under authentic exam conditions to master high-yield topics.",
  },
  {
    icon: BookOpen,
    title: "Smart Library",
    description:
      "Organized repository of high-yield medical textbooks, clinical lecture notes, and reference guides. Quickly find exact topics and study materials when you need them.",
  },
  {
    icon: HelpCircle,
    title: "MCQ & SBA Quizzes",
    description:
      "Interactive multiple-choice and single-best-answer practice suites across pre-clinical and clinical subjects. Test your understanding and track your mastery over time.",
  },
  {
    icon: ImageIcon,
    title: "Picture Tests & Steeplechase",
    description:
      "Spotter practice suites featuring high-resolution anatomy slides, histology sections, and clinical pathology specimens. Master time-bound spotter examinations with precision.",
  },
  {
    icon: FolderCheck,
    title: "Lecturers' Original Materials",
    description:
      "Direct access to verified lecture slide decks and department hand-outs uploaded specifically for your curriculum. Stay perfectly aligned with what your professors actually teach.",
  },
  {
    icon: Brain,
    title: "AI Flashcards",
    description:
      "Spaced-repetition flashcard decks generated instantly from study notes and past questions. Retain critical medical concepts faster and remember them longer.",
  },
]

const howItWorks = [
  {
    step: "01",
    icon: UserPlus,
    title: "Sign up free",
    description: "Create your student account in less than a minute. No credit card or subscription required.",
  },
  {
    step: "02",
    icon: BookMarked,
    title: "Choose your course",
    description: "Select your level (100L to 600L) and department to access tailored study materials and past questions.",
  },
  {
    step: "03",
    icon: GraduationCap,
    title: "Study smarter",
    description: "Practice quizzes, review lecture slides, and leverage AI flashcards to ace your MBBS exams.",
  },
]

export default function HomePage() {
  return (
    <SiteShell>
      {/* Hero Section */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-12 pb-16 text-center sm:px-6 lg:pt-20 lg:pb-24">
        <div className="mb-6 flex flex-col items-center">
          <MedHavenLogo
            className="h-auto w-auto"
            imgClassName="h-20 sm:h-28 md:h-32 w-auto max-w-full drop-shadow-lg"
          />
        </div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Built by Medical Students, for Medical Students</span>
        </div>
        <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          The complete digital workspace for Nigerian medical scholars.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          MedHaven provides free access to course-specific past questions, AI quizzes, flashcards, and verified lecturer slides tailored for MBBS excellence.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="gap-2 text-base font-semibold px-8 h-12 shadow-md">
            <Link href="/register">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base font-medium px-8 h-12">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-border bg-card/40 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
            <div className="flex flex-col items-center justify-center p-4">
              <span className="text-4xl font-extrabold tracking-tight text-primary">300+</span>
              <span className="mt-2 text-sm font-medium text-muted-foreground">Students Registered</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 border-y border-border/50 sm:border-y-0 sm:border-x">
              <span className="text-4xl font-extrabold tracking-tight text-primary">500+</span>
              <span className="mt-2 text-sm font-medium text-muted-foreground">Quiz Questions across all formats</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4">
              <span className="text-4xl font-extrabold tracking-tight text-primary">UNIJOS & Beyond</span>
              <span className="mt-2 text-sm font-medium text-muted-foreground">University of Jos & Expanding nationwide</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to excel in MBBS examinations
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Purpose-built tools to help you navigate heavy medical workloads, retain complex facts, and pass with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureList.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <Card key={idx} className="border-border bg-card/60 transition-all hover:border-primary/40 hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-t border-border bg-card/30 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Simple & Direct</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How MedHaven works
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">
              Get started in three quick steps and elevate your study routine immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((item, idx) => {
              const Icon = item.icon
              return (
                <div key={idx} className="relative flex flex-col items-center text-center p-6 rounded-xl border border-border bg-card shadow-sm">
                  <div className="absolute -top-4 bg-primary text-primary-foreground font-bold text-xs px-3 py-1 rounded-full">
                    Step {item.step}
                  </div>
                  <div className="mt-4 mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Expansion Callout */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-primary/10 p-8 sm:p-12 text-center shadow-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold text-primary mb-4">
            <Globe2 className="h-4 w-4" />
            <span>Nationwide Vision</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl max-w-2xl mx-auto">
            Currently serving University of Jos — coming soon to universities across Nigeria
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            We are actively expanding our course database and past questions to support medical schools across the entire nation.
          </p>
          <div className="mt-6">
            <Button asChild size="lg" className="gap-2">
              <Link href="/register">
                Register to Get Notified <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Support & Donate Section */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-500/5 via-primary/5 to-rose-500/5 p-6 sm:p-10 shadow-lg">
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
