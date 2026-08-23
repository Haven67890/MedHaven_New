import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Brain,
  FileText,
  Globe2,
  Heart,
  HelpCircle,
  ImageIcon,
  Sparkles,
  UserCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MedHavenLogo } from "@/components/brand/medhaven-logo"
import { SiteShell } from "@/components/layout/site-shell"
import {
  MotionReveal,
  MotionStaggerGroup,
  MotionStaggerItem,
  MotionCard3DTilt,
  MotionButton,
} from "@/components/ui/motion"

export const metadata: Metadata = {
  title: "MedHaven — The Digital Workspace for Nigerian Medical Scholars",
  description:
    "Free access to course-specific past questions, AI quizzes, flashcards, and verified lecturer slides tailored for MBBS excellence across Nigerian medical schools.",
  openGraph: {
    title: "MedHaven — The Digital Workspace for Nigerian Medical Scholars",
    description:
      "Free access to course-specific past questions, AI quizzes, flashcards, and verified lecturer slides tailored for MBBS excellence across Nigerian medical schools.",
    url: "https://medhaven.onrender.com",
    siteName: "MedHaven",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "MedHaven Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MedHaven — The Digital Workspace for Nigerian Medical Scholars",
    description:
      "Free access to course-specific past questions, AI quizzes, flashcards, and verified lecturer slides tailored for MBBS excellence across Nigerian medical schools.",
    images: [
      "/logo.png",
    ],
  },
}

const featureList = [
  {
    icon: FileText,
    title: "Past Questions",
    description: "Authentic, sorted exam papers with clear answer references from 100L to 600L.",
  },
  {
    icon: BookOpen,
    title: "Study Library",
    description: "Digital medical textbooks and clinical guides accessible anytime on phone or desktop.",
  },
  {
    icon: HelpCircle,
    title: "Question Bank",
    description: "Interactive practice tests with instant rationale, explanations, and time tracking.",
  },
  {
    icon: ImageIcon,
    title: "Picture Tests & Steeplechase",
    description: "High-yield histology slides, gross anatomy photos, and spotters for OSPE exams.",
  },
  {
    icon: UserCheck,
    title: "Lecturers' Original Materials",
    description: "Verified lecture slide decks and syllabi directly matched to your university modules.",
  },
  {
    icon: Brain,
    title: "Smart Recall",
    description: "Spaced repetition flashcard generator built to help you retain heavy medical concepts.",
  },
]

const howItWorks = [
  {
    step: "01",
    icon: BookOpen,
    title: "Select Your Level",
    description: "Filter study materials, past questions, and lecture slides customized specifically for your current MBBS year.",
  },
  {
    step: "02",
    icon: Brain,
    title: "Practice & Test",
    description: "Take timed MCQ/SBA quizzes, test yourself with spotter images, or review AI flashcards daily.",
  },
  {
    step: "03",
    icon: Sparkles,
    title: "Master & Excel",
    description: "Track your revision progress, pinpoint knowledge gaps early, and step into exams with full confidence.",
  },
]

export default function Home() {
  return (
    <SiteShell>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 flex items-center justify-center min-h-[85vh]">
        {/* Background Ambient Video */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            className="h-full w-full object-cover object-center transition-opacity duration-1000 scale-105"
            style={{
              filter: "brightness(1.12) saturate(1.15) contrast(1.05)",
            } as React.CSSProperties}
          >
            <source
              src="/api/materials/signed-url?path=branding%2F401246b2e1a9c1dfe1d54b6e05cabbfa.mp4"
              type="video/mp4"
            />
          </video>
          {/* Semi-transparent dark gradient overlay ensuring crisp text readability */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background/95 pointer-events-none"
            aria-hidden="true"
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-4 text-center sm:px-6">
          <MotionReveal direction="down" distance={20} duration={0.6}>
            <div className="mb-6 flex flex-col items-center">
              <MedHavenLogo
                className="h-auto w-auto"
                imgClassName="h-20 sm:h-28 md:h-32 w-auto max-w-full drop-shadow-2xl"
              />
            </div>
          </MotionReveal>

          <MotionReveal delay={0.1} direction="up" distance={15}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/20 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary-foreground sm:text-primary uppercase shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Built by Medical Students, for Medical Students</span>
            </div>
          </MotionReveal>

          <MotionReveal delay={0.2} direction="up" distance={20}>
            <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl drop-shadow-md">
              The complete digital workspace for Nigerian medical scholars.
            </h1>
          </MotionReveal>

          <MotionReveal delay={0.3} direction="up" distance={20}>
            <p className="mt-6 max-w-2xl text-lg text-slate-200 sm:text-xl drop-shadow-sm">
              MedHaven provides free access to course-specific past questions, AI quizzes, flashcards, and verified lecturer slides tailored for MBBS excellence.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.4} direction="up" distance={20}>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <MotionButton scaleHover={1.03} scaleDown={0.96}>
                <Button asChild size="lg" className="gap-2 text-base font-semibold px-8 h-12 shadow-lg w-full sm:w-auto">
                  <Link href="/register">
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </MotionButton>
              <MotionButton scaleHover={1.03} scaleDown={0.96}>
                <Button asChild variant="outline" size="lg" className="text-base font-medium px-8 h-12 border-slate-600 bg-black/40 text-white hover:bg-black/60 hover:text-white backdrop-blur-sm w-full sm:w-auto">
                  <Link href="/login">Sign In</Link>
                </Button>
              </MotionButton>
            </div>
          </MotionReveal>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="border-b border-border bg-card/40 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <MotionStaggerGroup staggerChildren={0.15} amount={0.3} className="grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
            <MotionStaggerItem className="flex flex-col items-center justify-center p-4">
              <span className="text-4xl font-extrabold tracking-tight text-primary">300+</span>
              <span className="mt-2 text-sm font-medium text-muted-foreground">Students Registered</span>
            </MotionStaggerItem>
            <MotionStaggerItem className="flex flex-col items-center justify-center p-4 border-y border-border/50 sm:border-y-0 sm:border-x">
              <span className="text-4xl font-extrabold tracking-tight text-primary">500+</span>
              <span className="mt-2 text-sm font-medium text-muted-foreground">Quiz Questions across all formats</span>
            </MotionStaggerItem>
            <MotionStaggerItem className="flex flex-col items-center justify-center p-4">
              <span className="text-4xl font-extrabold tracking-tight text-primary">UNIJOS & Beyond</span>
              <span className="mt-2 text-sm font-medium text-muted-foreground">University of Jos & Expanding nationwide</span>
            </MotionStaggerItem>
          </MotionStaggerGroup>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <MotionReveal direction="up" distance={20} className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to excel in MBBS examinations
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Purpose-built tools to help you navigate heavy medical workloads, retain complex facts, and pass with confidence.
          </p>
        </MotionReveal>

        <MotionStaggerGroup staggerChildren={0.1} amount={0.1} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureList.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <MotionStaggerItem key={idx}>
                <MotionCard3DTilt scaleOnHover={1.02} tiltMaxAngleX={6} tiltMaxAngleY={6}>
                  <Card className="h-full border-border bg-card/60 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
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
                </MotionCard3DTilt>
              </MotionStaggerItem>
            )
          })}
        </MotionStaggerGroup>
      </section>

      {/* How It Works Section */}
      <section className="border-t border-border bg-card/30 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <MotionReveal direction="up" distance={20} className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Simple & Direct</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How MedHaven works
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">
              Get started in three quick steps and elevate your study routine immediately.
            </p>
          </MotionReveal>

          <MotionStaggerGroup staggerChildren={0.15} amount={0.2} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((item, idx) => {
              const Icon = item.icon
              return (
                <MotionStaggerItem key={idx}>
                  <MotionCard3DTilt scaleOnHover={1.03} enable3DTilt={false}>
                    <div className="relative flex flex-col items-center text-center p-6 rounded-xl border border-border bg-card shadow-sm h-full">
                      <div className="absolute -top-4 bg-primary text-primary-foreground font-bold text-xs px-3 py-1 rounded-full shadow-sm">
                        Step {item.step}
                      </div>
                      <div className="mt-4 mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-7 w-7" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </MotionCard3DTilt>
                </MotionStaggerItem>
              )
            })}
          </MotionStaggerGroup>
        </div>
      </section>

      {/* Expansion Callout */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <MotionReveal direction="up" distance={24} duration={0.6}>
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
              <MotionButton scaleHover={1.04} className="inline-block">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/register">
                    Register to Get Notified <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </MotionButton>
            </div>
          </div>
        </MotionReveal>
      </section>

      {/* Support & Donate Section */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <MotionReveal direction="up" distance={24} duration={0.6}>
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
              <MotionButton scaleHover={1.04} scaleDown={0.96} className="shrink-0">
                <Button asChild size="lg" className="shrink-0 gap-2 bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 shadow-md">
                  <Link href="/donate">
                    <Heart className="h-4 w-4 fill-white" />
                    Make a Donation
                  </Link>
                </Button>
              </MotionButton>
            </div>
          </div>
        </MotionReveal>
      </section>
    </SiteShell>
  )
}
