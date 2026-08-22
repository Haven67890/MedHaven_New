import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Compass, Sparkles, Target, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteShell } from "@/components/layout/site-shell"
import {
  MotionReveal,
  MotionStaggerGroup,
  MotionStaggerItem,
  MotionCard3DTilt,
  MotionButton,
} from "@/components/ui/motion"

export const metadata: Metadata = {
  title: "About Us — MedHaven Story & Mission",
  description:
    "Learn about MedHaven: a platform built by medical students for medical students. Discover our mission, vision, and how we empower medical scholars across Nigeria.",
  openGraph: {
    title: "About Us — MedHaven Story & Mission",
    description:
      "Learn about MedHaven: a platform built by medical students for medical students. Discover our mission, vision, and how we empower medical scholars across Nigeria.",
    url: "https://medhaven.onrender.com/about",
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
    title: "About Us — MedHaven Story & Mission",
    description:
      "Learn about MedHaven: a platform built by medical students for medical students. Discover our mission, vision, and how we empower medical scholars across Nigeria.",
    images: [
      "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/Untitled%20design.png",
    ],
  },
}

export default function AboutPage() {
  return (
    <SiteShell>
      {/* Hero Header */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-8 sm:px-6 lg:pt-16">
        <MotionReveal direction="up" distance={20} className="text-center max-w-3xl mx-auto space-y-4">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Our Story & Mission
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Built by Medical Students, for Medical Students
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            MedHaven was born out of real medical school struggle—the challenge of finding verified lecture slides, past question solutions, and reliable study materials amidst demanding MBBS schedules.
          </p>
        </MotionReveal>
      </section>

      {/* Main Story Content */}
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12 space-y-12">
        {/* Story Section */}
        <MotionReveal direction="up" distance={20}>
          <MotionCard3DTilt enable3DTilt={false} scaleOnHover={1.01}>
            <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-10 space-y-6">
              <div className="flex items-center gap-3 text-primary font-bold text-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span>Why We Built MedHaven</span>
              </div>
              <p className="text-muted-foreground leading-relaxed text-base">
                Medical school in Nigeria is notoriously rigorous. Between morning ward rounds, afternoon lectures, laboratory practicals, and evening call duties, time is a medical student's most scarce asset.
              </p>
              <p className="text-muted-foreground leading-relaxed text-base">
                Yet, students spend countless hours hunting down scattered PDF slide decks, unorganized past questions from WhatsApp groups, or outdated textbook editions. We realized that medical students didn't just need more study materials—they needed a single, dependable, high-quality digital workspace tailored specifically to their university curriculum.
              </p>
              <p className="text-muted-foreground leading-relaxed text-base">
                That is why MedHaven was created: to bring order, accessibility, and modern study tools to Nigerian medical scholars.
              </p>
            </div>
          </MotionCard3DTilt>
        </MotionReveal>

        {/* Mission & Vision Grid */}
        <MotionStaggerGroup staggerChildren={0.15} amount={0.2} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MotionStaggerItem>
            <MotionCard3DTilt scaleOnHover={1.02} tiltMaxAngleX={5} tiltMaxAngleY={5}>
              <Card className="h-full border-border bg-card/60">
                <CardHeader className="space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Target className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl font-bold">Our Mission</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    To make high-quality, course-specific study resources, interactive quizzes, and spaced-repetition tools accessible to every Nigerian medical student—completely free of charge.
                  </p>
                </CardContent>
              </Card>
            </MotionCard3DTilt>
          </MotionStaggerItem>

          <MotionStaggerItem>
            <MotionCard3DTilt scaleOnHover={1.02} tiltMaxAngleX={5} tiltMaxAngleY={5}>
              <Card className="h-full border-border bg-card/60">
                <CardHeader className="space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Compass className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl font-bold">Our Vision</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    To expand MedHaven across every medical school in Nigeria, unifying medical education and empowering future physicians with modern technology and peer-driven knowledge sharing.
                  </p>
                </CardContent>
              </Card>
            </MotionCard3DTilt>
          </MotionStaggerItem>
        </MotionStaggerGroup>

        {/* Current Reach & Impact */}
        <MotionReveal direction="up" distance={20}>
          <MotionCard3DTilt enable3DTilt={false} scaleOnHover={1.01}>
            <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-10 space-y-6">
              <div className="flex items-center gap-3 text-primary font-bold text-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5" />
                </div>
                <span>Current Reach & Community</span>
              </div>
              <p className="text-muted-foreground leading-relaxed text-base">
                MedHaven started at the University of Jos (UNIJOS). Today, over <strong className="text-foreground">300+ medical students</strong> rely on MedHaven daily to prepare for continuous assessments, professional examinations, and spotters.
              </p>
              <p className="text-muted-foreground leading-relaxed text-base">
                Our repository holds over <strong className="text-foreground">500+ curated quiz questions</strong>, complete slide decks, and AI flashcards across 100L through 600L MBBS levels.
              </p>
            </div>
          </MotionCard3DTilt>
        </MotionReveal>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
        <MotionReveal direction="up" distance={20}>
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-primary/10 p-8 sm:p-12 text-center shadow-lg">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl max-w-xl mx-auto">
              Become part of the MedHaven student community
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
              Experience a smarter, more organized approach to medical school.
            </p>
            <div className="mt-6 flex justify-center">
              <MotionButton scaleHover={1.04} scaleDown={0.96}>
                <Button asChild size="lg" className="gap-2 text-base font-semibold px-8 h-12 shadow-md">
                  <Link href="/register">
                    Join MedHaven Free <ArrowRight className="h-4 w-4" />
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
