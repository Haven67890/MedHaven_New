"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useDebounce } from "@/hooks/useDebounce"
import { ArrowRight, BookOpen, Clock, Search, HelpCircle, GraduationCap, Layers, Award, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import useAuth from "@/hooks/useAuth"
import {
  MotionReveal,
  MotionStaggerGroup,
  MotionStaggerItem,
} from "@/components/ui/motion"

interface TutorialSection {
  heading: string
  content: string
}

interface Tutorial {
  id: string
  course_id: string
  title: string
  overview: string
  sections: TutorialSection[]
  linked_quiz_id: string | null
  status: string
  created_at: string
  courses?: {
    id: string
    code: string
    title: string
    level: string | null
  } | null
}

function getLevelPhase(level: string | number | null | undefined): "pre-clinical" | "clinical" {
  if (!level) return "pre-clinical"
  const lvl = String(level).toUpperCase().trim()
  const clinicalLevels = ["400L", "500L", "600L", "FINAL YEAR"]
  return clinicalLevels.includes(lvl) ? "clinical" : "pre-clinical"
}

export default function TutorialsPage() {
  const supabase = createClient()
  const { user } = useAuth()

  // Data States
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Profile / Preferences States
  const [userLevel, setUserLevel] = useState<string | null>(null)
  const [contentVisibility, setContentVisibility] = useState<string>("all")

  // Filter States
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [selectedCourse, setSelectedCourse] = useState("all")

  // Selected Tutorial for Reader view
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null)

  // Fetch tutorials & user preferences
  useEffect(() => {
    let active = true

    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        // 1. Fetch user level and content visibility preference
        if (user?.id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("current_level")
            .eq("id", user.id)
            .maybeSingle()

          if (active && profileData) {
            setUserLevel(profileData.current_level)
          }

          const { data: prefData } = await supabase
            .from("user_preferences")
            .select("content_visibility")
            .eq("user_id", user.id)
            .maybeSingle()

          if (active && prefData) {
            if (prefData.content_visibility) {
              setContentVisibility(prefData.content_visibility)
            } else {
              setContentVisibility("all")
            }
          }
        }

        // 2. Fetch tutorials (published only) with courses relation
        const { data: tutorialsData, error: tutorialsError } = await supabase
          .from("tutorials")
          .select(`
            *,
            courses (
              id,
              code,
              title,
              level
            )
          `)
          .eq("status", "published")
          .order("created_at", { ascending: false })

        if (tutorialsError) throw tutorialsError

        if (active) {
          setTutorials((tutorialsData as Tutorial[]) || [])
        }
      } catch (err: any) {
        console.error("Error loading tutorials:", err)
        if (active) {
          setError(err.message || "Failed to load tutorials.")
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [user?.id])

  // Filter tutorials according to content visibility preference (all/group/exact) based on course's level
  const levelFilteredTutorials = useMemo(() => {
    if (contentVisibility === "all" || !userLevel) return tutorials
    const userPhase = getLevelPhase(userLevel)
    return tutorials.filter((tut) => {
      const courseLevel = tut.courses?.level
      if (!courseLevel) return true // Show tutorials with unassigned courses/general to everyone
      if (contentVisibility === "exact") {
        return String(courseLevel).toUpperCase().trim() === String(userLevel).toUpperCase().trim()
      }
      // Group phase filtering
      return getLevelPhase(courseLevel) === userPhase
    })
  }, [tutorials, contentVisibility, userLevel])

  // Unique courses for filter dropdown
  const uniqueCourses = useMemo(() => {
    const map = new Map<string, string>()
    levelFilteredTutorials.forEach((t) => {
      if (t.courses) {
        map.set(t.courses.id, `${t.courses.code} — ${t.courses.title}`)
      }
    })
    return Array.from(map.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [levelFilteredTutorials])

  // Apply search & course filters
  const filteredTutorials = useMemo(() => {
    return levelFilteredTutorials.filter((tut) => {
      // Course Filter
      if (selectedCourse !== "all" && tut.course_id !== selectedCourse) {
        return false
      }

      // Text Search Filter (Title, Overview, Course Title/Code)
      if (debouncedSearchQuery.trim() !== "") {
        const query = debouncedSearchQuery.toLowerCase()
        const titleMatch = tut.title?.toLowerCase().includes(query)
        const overviewMatch = tut.overview?.toLowerCase().includes(query)
        const codeMatch = tut.courses?.code?.toLowerCase().includes(query)
        const courseTitleMatch = tut.courses?.title?.toLowerCase().includes(query)
        return titleMatch || overviewMatch || codeMatch || courseTitleMatch
      }

      return true
    })
  }, [levelFilteredTutorials, selectedCourse, debouncedSearchQuery])

  // Stats
  const stats = useMemo(() => {
    const total = filteredTutorials.length
    const linkedQuizzesCount = filteredTutorials.filter(t => t.linked_quiz_id).length
    const userLevelCount = filteredTutorials.filter(t => t.courses?.level && String(t.courses.level).toUpperCase().trim() === String(userLevel).toUpperCase().trim()).length

    return {
      total,
      linkedQuizzesCount,
      userLevelCount
    }
  }, [filteredTutorials, userLevel])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Tutorials" description="Master challenging medical concepts with interactive, structured step-by-step guides.">
        <div className="flex gap-2">
          {/* Course filter dropdown */}
          <select
            aria-label="Filter by course"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All Courses</option>
            {uniqueCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <section>
        <MotionStaggerGroup className="grid gap-4 sm:grid-cols-3">
          <MotionStaggerItem>
            <StatCard label="Total Tutorials" value={String(stats.total)} icon={GraduationCap} accent="primary" />
          </MotionStaggerItem>
          <MotionStaggerItem>
            <StatCard label="With Interactive Quizzes" value={String(stats.linkedQuizzesCount)} icon={HelpCircle} accent="warning" />
          </MotionStaggerItem>
          <MotionStaggerItem>
            <StatCard label="For My Current Level" value={String(stats.userLevelCount)} icon={Award} accent="secondary" />
          </MotionStaggerItem>
        </MotionStaggerGroup>
      </section>

      {/* Search Input Bar */}
      <section>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search tutorials by title, content, or course code…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search tutorials"
          />
        </div>
      </section>

      {/* Error and Loading States */}
      {error && (
        <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-lg p-4 font-medium">
          <span className="font-extrabold uppercase text-xs tracking-wider block">Error:</span>
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading interactive tutorials...</p>
        </div>
      ) : (
        <section>
          <SectionHeading title="Available Tutorials" description="Review concepts and take integrated assessment quizzes." />

          {filteredTutorials.length > 0 ? (
            <MotionStaggerGroup className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTutorials.map((tut) => (
                <MotionStaggerItem key={tut.id}>
                  <Card
                    className="group hover:shadow-md border-border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
                    onClick={() => setSelectedTutorial(tut)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap gap-1.5 items-center mb-2">
                        {tut.courses && (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {tut.courses.code}
                          </Badge>
                        )}
                        {tut.courses?.level && (
                          <Badge variant="secondary" className="text-[10px]">
                            Level: {tut.courses.level}
                          </Badge>
                        )}
                        {tut.linked_quiz_id && (
                          <Badge variant="accent" className="text-[10px] flex items-center gap-1">
                            <Sparkles className="size-3" /> Quiz Included
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-bold leading-snug group-hover:text-primary transition-colors">
                        {tut.title}
                      </CardTitle>
                      {tut.courses && (
                        <CardDescription className="text-xs truncate" title={tut.courses.title || ""}>
                          {tut.courses.title}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {tut.overview}
                      </p>
                      <div className="mt-4 flex items-center gap-1 text-xs text-primary font-bold">
                        Read Tutorial <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </Card>
                </MotionStaggerItem>
              ))}
            </MotionStaggerGroup>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
              <GraduationCap className="size-8 mx-auto mb-3 text-muted-foreground/60" />
              <p className="font-semibold text-foreground text-base mb-1">No tutorials found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No published tutorials match your search criteria or your academic visibility parameters.
              </p>
              {(searchQuery !== "" || selectedCourse !== "all") && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-3 text-primary"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedCourse("all")
                  }}
                >
                  Clear all active filters
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      {/* Tutorial Reader Sheet */}
      <Sheet open={!!selectedTutorial} onOpenChange={(open) => { if (!open) setSelectedTutorial(null) }}>
        <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto w-full border-l border-border bg-background">
          {selectedTutorial && (
            <div className="space-y-6 py-4 pr-2">
              <SheetHeader className="space-y-2 border-b pb-4">
                <div className="flex flex-wrap gap-2 items-center">
                  {selectedTutorial.courses && (
                    <Badge variant="outline" className="uppercase text-xs font-semibold">
                      {selectedTutorial.courses.code}
                    </Badge>
                  )}
                  {selectedTutorial.courses?.level && (
                    <Badge variant="secondary" className="text-xs font-semibold">
                      Level {selectedTutorial.courses.level}
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight leading-snug">
                  {selectedTutorial.title}
                </SheetTitle>
                {selectedTutorial.courses && (
                  <SheetDescription className="text-sm font-medium text-muted-foreground">
                    {selectedTutorial.courses.title}
                  </SheetDescription>
                )}
              </SheetHeader>

              {/* Overview block */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-primary">
                  Overview
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedTutorial.overview}
                </p>
              </div>

              {/* Sections blocks */}
              {selectedTutorial.sections && selectedTutorial.sections.length > 0 ? (
                <div className="space-y-6 pt-2">
                  {selectedTutorial.sections.map((section, idx) => (
                    <div key={idx} className="space-y-2 border-l-2 border-primary/20 pl-4">
                      <h4 className="text-sm font-bold text-foreground">
                        {section.heading || `Section #${idx + 1}`}
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No detailed section content has been added to this tutorial yet.</p>
              )}

              {/* Linked quiz footer check */}
              {selectedTutorial.linked_quiz_id && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                  <div className="flex gap-3 items-start text-left">
                    <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Test Your Mastery</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        An interactive assessment is available for this tutorial to help verify your understanding.
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" className="w-full sm:w-auto font-bold shrink-0">
                    <Link href={`/quizzes?quizId=${selectedTutorial.linked_quiz_id}`}>
                      Take Quiz <ArrowRight className="size-4 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
