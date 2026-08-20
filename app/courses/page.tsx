import type { Metadata } from "next"
import Link from "next/link"
import { BookOpen, GraduationCap, ArrowRight, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseConfig } from "@/lib/supabase/config"
import { SiteShell } from "@/components/layout/site-shell"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Courses — MBBS Curriculum at MedHaven",
  description:
    "Browse all MBBS courses available on MedHaven, from 100L to 600L. Built for University of Jos, expanding to all Nigerian medical schools.",
  openGraph: {
    title: "Courses — MBBS Curriculum at MedHaven",
    description:
      "Browse all MBBS courses available on MedHaven, from 100L to 600L. Built for University of Jos, expanding to all Nigerian medical schools.",
    url: "https://medhaven.onrender.com/courses",
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
    title: "Courses — MBBS Curriculum at MedHaven",
    description:
      "Browse all MBBS courses available on MedHaven, from 100L to 600L. Built for University of Jos, expanding to all Nigerian medical schools.",
    images: [
      "https://fexsfbdvewlmvzfnwqul.supabase.co/storage/v1/object/public/materials/branding/Untitled%20design.png",
    ],
  },
}

type Course = {
  id: string
  code: string | null
  name: string | null
  title: string | null
  level: string | null
  description: string | null
}

const LEVEL_ORDER = ["100L", "200L", "300L", "400L", "500L", "600L"]

async function getPublicCourses(): Promise<Course[]> {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data, error } = await supabase
      .from("courses")
      .select("id, code, name, title, level, description")
      .order("code", { ascending: true })

    if (error) {
      console.error("Error fetching courses from Supabase:", error)
      return []
    }

    const courses = (data as Course[]) || []
    console.log(`[Public Courses Page] Successfully fetched ${courses.length} courses from Supabase.`)
    return courses
  } catch (err) {
    console.error("Unexpected error fetching public courses:", err)
    return []
  }
}

export default async function CoursesPage() {
  const courses = await getPublicCourses()

  // Group courses by level
  const groupedCourses: Record<string, Course[]> = {}
  LEVEL_ORDER.forEach((lvl) => {
    groupedCourses[lvl] = []
  })

  const otherCourses: Course[] = []

  courses.forEach((c) => {
    const rawLvl = (c.level || "").trim().toUpperCase()
    // Match '100', '100L', '200', '200L', etc.
    const normalizedLvl = LEVEL_ORDER.find(
      (lvl) => rawLvl === lvl || rawLvl === lvl.replace("L", "")
    )

    if (normalizedLvl) {
      groupedCourses[normalizedLvl].push(c)
    } else {
      otherCourses.push(c)
    }
  })

  return (
    <SiteShell>
      {/* Top Banner Notice */}
      <section className="bg-primary/10 border-b border-primary/20 py-3 px-4">
        <div className="mx-auto max-w-6xl flex items-center justify-center gap-2 text-center text-xs sm:text-sm font-medium text-primary">
          <Info className="h-4 w-4 shrink-0" />
          <span>Currently available for University of Jos students. More universities coming soon.</span>
        </div>
      </section>

      {/* Page Header */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-8 sm:px-6 lg:pt-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Curriculum Catalog
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            MBBS Available Courses
          </h1>
          <p className="text-lg text-muted-foreground">
            Explore structured medical courses across all academic levels. Select your level to access organized lectures, past questions, and AI quizzes.
          </p>
        </div>
      </section>

      {/* Courses List by Level */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12 space-y-12">
        {LEVEL_ORDER.map((level) => {
          const levelCourses = groupedCourses[level] || []
          return (
            <div key={level} className="space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{level} Courses</h2>
                <Badge variant="outline" className="ml-auto text-xs font-normal">
                  {levelCourses.length} {levelCourses.length === 1 ? "course" : "courses"}
                </Badge>
              </div>

              {levelCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {levelCourses.map((course) => {
                    const courseTitle = course.title || course.name || "Untitled Course"
                    const courseCode = course.code || "COURSE"
                    return (
                      <Card key={course.id} className="border-border bg-card/60 transition-all hover:border-primary/40 hover:shadow-sm">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant="secondary" className="font-mono text-xs font-semibold">
                              {courseCode}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-medium">{level}</span>
                          </div>
                          <CardTitle className="text-base font-semibold pt-1 leading-snug">
                            {courseTitle}
                          </CardTitle>
                        </CardHeader>
                        {course.description && (
                          <CardContent>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {course.description}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No public course entries listed under {level} yet. Check back soon as more materials are added.
                </div>
              )}
            </div>
          )
        })}

        {/* Other / Unclassified Courses if any */}
        {otherCourses.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight text-foreground">General & Elective Courses</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherCourses.map((course) => {
                const courseTitle = course.title || course.name || "Untitled Course"
                const courseCode = course.code || "ELECTIVE"
                return (
                  <Card key={course.id} className="border-border bg-card/60">
                    <CardHeader className="pb-2">
                      <Badge variant="secondary" className="w-fit font-mono text-xs font-semibold">
                        {courseCode}
                      </Badge>
                      <CardTitle className="text-base font-semibold pt-1">
                        {courseTitle}
                      </CardTitle>
                    </CardHeader>
                    {course.description && (
                      <CardContent>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {course.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-primary/10 p-8 sm:p-12 text-center shadow-lg">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl max-w-xl mx-auto">
            Don't see your university?
          </h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            Register now and we'll notify you as soon as MedHaven expands to your medical institution.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild size="lg" className="gap-2 text-base font-semibold px-8 h-12 shadow-md">
              <Link href="/register">
                Register for Updates <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
