import type { Metadata } from "next"
import Link from "next/link"
import {
  FileText,
  BookOpen,
  HelpCircle,
  ImageIcon,
  FolderCheck,
  Brain,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { SiteShell } from "@/components/layout/site-shell"

export const metadata: Metadata = {
  title: "Features — MedHaven Medical Study Platform",
  description:
    "Explore MedHaven's full suite of study features built specifically for MBBS students: past questions, smart library, MCQ/SBA quizzes, picture tests & steeplechase, lecturer materials, and AI flashcards.",
  openGraph: {
    title: "Features — MedHaven Medical Study Platform",
    description:
      "Explore MedHaven's full suite of study features built specifically for MBBS students: past questions, smart library, MCQ/SBA quizzes, picture tests & steeplechase, lecturer materials, and AI flashcards.",
    url: "https://medhaven.onrender.com/features",
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
    title: "Features — MedHaven Medical Study Platform",
    description:
      "Explore MedHaven's full suite of study features built specifically for MBBS students: past questions, smart library, MCQ/SBA quizzes, picture tests & steeplechase, lecturer materials, and AI flashcards.",
    images: [
      "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/Untitled%20design.png",
    ],
  },
}

const detailedFeatures = [
  {
    id: "past-questions",
    icon: FileText,
    title: "Past Questions",
    summary: "Authentic, sorted exam papers across pre-clinical and clinical subjects.",
    description:
      "Practicing previous examination papers is the single most effective way for medical students to familiarize themselves with faculty exam patterns, time constraints, and recurring high-yield questions. MedHaven aggregates past questions from 100L through 600L, meticulously sorted by department, course, and exam type.",
    whyItHelps:
      "Medical school exams place heavy emphasis on testing specific clinical scenarios and high-yield concepts. Working through past questions helps you identify recurring examiner preferences, test your speed under pressure, and highlight knowledge gaps before stepping into the exam hall.",
    bullets: [
      "Categorized by course code and academic year",
      "Includes both theory and objective question types",
      "Instant answer key references for quick self-assessment",
    ],
  },
  {
    id: "smart-library",
    icon: BookOpen,
    title: "Smart Library",
    description:
      "The MedHaven Smart Library centralizes recommended medical textbooks, clinical handbooks, and study guides into a fast, searchable interface. Rather than carrying heavy hardcopies or searching endlessly through fragmented folder drives, students can instantly locate relevant chapters and sections from any device.",
    whyItHelps:
      "Medical curricula demand cross-referencing multiple authoritative sources—from standard textbooks like Bailey & Love or Guyton & Hall to local departmental manuals. Having these resources structured and accessible digitally saves precious study time during intensive clinical rotations.",
    bullets: [
      "Curated digital access to key core textbooks",
      "Fast in-document search and table of contents browsing",
      "Optimized for quick mobile consultation on hospital wards",
    ],
  },
  {
    id: "mcq-sba-quizzes",
    icon: HelpCircle,
    title: "MCQ & SBA Quizzes",
    description:
      "Multiple Choice Questions (MCQ) and Single Best Answer (SBA) questions form the backbone of modern MBBS testing. MedHaven's quiz module offers interactive test suites with real-time scoring, topic filtering, and detailed explanation breakdowns for every question format.",
    whyItHelps:
      "SBA questions require active differential reasoning rather than simple rote memory. Practicing timed quiz modules trains your mind to parse complex clinical vignettes quickly and select the most appropriate diagnostic or management option under pressure.",
    bullets: [
      "Over 500+ practice questions spanning anatomy, pharmacology, pathology, and clinical specialties",
      "Timed test mode and untimed learning mode",
      "Immediate rationale and explanation for correct and incorrect answers",
    ],
  },
  {
    id: "picture-tests",
    icon: ImageIcon,
    title: "Picture Tests & Steeplechase",
    description:
      "Spotter exams and steeplechases require rapid identification of anatomical structures, histological sections, radiological scans, and gross clinical pathology. MedHaven provides dedicated visual test modules designed to replicate real-life laboratory and objective structured practical examinations (OSPE).",
    whyItHelps:
      "Visual identification requires specific practice that standard text notes cannot provide. Practicing high-resolution slide tests builds rapid visual recognition, ensuring you don't panic when faced with short station times during practical examinations.",
    bullets: [
      "High-resolution histology, gross anatomy, and clinical pathology slides",
      "Timed station rotation simulation",
      "Clear pointers and annotation overlays for thorough review",
    ],
  },
  {
    id: "lecturers-materials",
    icon: FolderCheck,
    title: "Lecturers' Original Materials",
    description:
      "MedHaven hosts verified original slide decks, lecture notes, and syllabus outlines uploaded directly by or curated from course lecturers. Students gain direct access to the exact slides used in university lecture halls.",
    whyItHelps:
      "While general medical textbooks provide foundation, university examinations are ultimately written by your course lecturers based on what they teach in class. Aligning your study material directly with original lecture slides guarantees complete coverage of faculty-specific emphasis.",
    bullets: [
      "Organized directly by course module and lecture topic",
      "Embedded PDF viewer for smooth seamless reading without forced downloads",
      "Regularly updated to match current academic session syllabi",
    ],
  },
  {
    id: "ai-flashcards",
    icon: Brain,
    title: "AI-Generated Flashcards",
    description:
      "MedHaven's AI flashcard system uses spaced repetition algorithms to convert complex medical lecture notes and past questions into bite-sized, active-recall study cards. Customize your card decks or let AI generate flashcards directly from your syllabus topics.",
    whyItHelps:
      "Medical education involves thousands of anatomical terms, drug dosages, and clinical diagnostic criteria. Spaced repetition ensures you review facts right before you are about to forget them, converting short-term memory into long-term retention.",
    bullets: [
      "Instant flashcard deck generation from lecture text",
      "Spaced repetition algorithm scheduling your daily reviews",
      "Track confidence levels and mastery history across all subjects",
    ],
  },
]

export default function FeaturesPage() {
  return (
    <SiteShell>
      {/* Header Banner */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-8 sm:px-6 lg:pt-16">
        <div className="text-center max-w-3xl mx-auto">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Platform Capabilities
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Features engineered for medical school success
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Every feature on MedHaven was designed from the ground up by medical students to tackle the real challenges of MBBS studies.
          </p>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12 space-y-16">
        {detailedFeatures.map((feature, idx) => {
          const Icon = feature.icon
          const isEven = idx % 2 === 0
          return (
            <div
              key={feature.id}
              id={feature.id}
              className={`rounded-2xl border border-border bg-card/60 p-6 sm:p-10 shadow-sm transition-all hover:border-primary/30 ${
                isEven ? "lg:flex-row" : "lg:flex-row-reverse"
              } flex flex-col gap-8 items-start`}
            >
              <div className="flex-1 space-y-4">
                <div className="inline-flex items-center gap-2.5 text-primary font-semibold text-lg">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span>{feature.title}</span>
                </div>
                <p className="text-foreground font-medium text-base leading-relaxed">
                  {feature.description}
                </p>
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Why this helps MBBS students
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.whyItHelps}
                  </p>
                </div>
                <ul className="space-y-2 pt-2">
                  {feature.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-primary/10 p-8 sm:p-12 text-center shadow-lg">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl max-w-xl mx-auto">
            Ready to upgrade your medical study routine?
          </h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            Join 300+ medical students already using MedHaven to study smarter and pass exams.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild size="lg" className="gap-2 text-base font-semibold px-8 h-12 shadow-md">
              <Link href="/register">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
