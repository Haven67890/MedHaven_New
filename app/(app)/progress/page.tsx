"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Flame,
  ListChecks,
  BrainCircuit,
  BookOpen,
  Sparkles,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  TrendingUp,
  Trophy,
  Target,
  Award,
  Download,
  Eye,
  ChevronRight,
  AlertCircle
} from "lucide-react"

import useAuth from "@/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/dashboard/page-header"
import { Progress } from "@/components/ui/progress"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import {
  MotionReveal,
  MotionStaggerGroup,
  MotionStaggerItem,
} from "@/components/ui/motion"

// --- TypeScript Types Matching database schema & nested joins ---

interface Course {
  id: string
  code: string | null
  title: string | null
}

interface Material {
  id: string
  title: string
  type: string
  course_id: string | null
  courses: Course | null
}

interface MaterialActivityRow {
  id: string
  action: "view" | "download"
  created_at: string
  material_id: string
  materials: Material | null
}

interface Quiz {
  id: string
  course_id: string | null
  topic: string | null
  format: string | null
  courses: Course | null
}

interface QuizAttemptRow {
  id: string
  quiz_id: string
  score: number
  total_questions: number
  completed_at: string
  quizzes: Quiz | null
}

interface FlashcardDeck {
  id: string
  course_id: string | null
  topic: string | null
  courses: Course | null
}

interface Flashcard {
  id: string
  front: string | null
  back: string | null
  deck_id: string
  flashcard_decks: FlashcardDeck | null
}

interface FlashcardProgressRow {
  id: string
  user_id: string
  flashcard_id: string
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_date: string
  last_reviewed_at: string | null
  flashcards: Flashcard | null
}

interface MergedActivityItem {
  id: string
  type: "material" | "quiz" | "flashcard"
  action: string
  title: string
  subtext?: string
  courseCode?: string
  courseTitle?: string
  date: Date
  score?: number
  totalQuestions?: number
}

export default function ProgressTrackerPage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()

  const [loadingData, setLoadingData] = useState(true)
  const [materialActivities, setMaterialActivities] = useState<MaterialActivityRow[]>([])
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRow[]>([])
  const [flashcardProgress, setFlashcardProgress] = useState<FlashcardProgressRow[]>([])

  useEffect(() => {
    let active = true

    async function loadProgressData() {
      if (!user?.id) return

      try {
        setLoadingData(true)

        // Run aggregation queries in parallel with selected fields
        const [activityRes, attemptsRes, progressRes] = await Promise.all([
          supabase
            .from("material_activity")
            .select(`
              id,
              action,
              created_at,
              material_id,
              materials (
                id,
                title,
                type,
                course_id,
                courses (
                  id,
                  code,
                  title
                )
              )
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("quiz_attempts")
            .select(`
              id,
              quiz_id,
              score,
              total_questions,
              completed_at,
              quizzes (
                id,
                course_id,
                topic,
                format,
                courses (
                  id,
                  code,
                  title
                )
              )
            `)
            .eq("user_id", user.id)
            .order("completed_at", { ascending: false }),
          supabase
            .from("flashcard_progress")
            .select(`
              id,
              user_id,
              flashcard_id,
              ease_factor,
              interval_days,
              repetitions,
              next_review_date,
              last_reviewed_at,
              flashcards (
                id,
                front,
                back,
                deck_id,
                flashcard_decks (
                  id,
                  course_id,
                  topic,
                  courses (
                    id,
                    code,
                    title
                  )
                )
              )
            `)
            .eq("user_id", user.id)
        ])

        if (activityRes.error) {
          console.error("Error fetching material activity logs:", activityRes.error)
        }
        if (attemptsRes.error) {
          console.error("Error fetching quiz attempts:", attemptsRes.error)
        }
        if (progressRes.error) {
          console.error("Error fetching flashcard progress:", progressRes.error)
        }

        if (active) {
          setMaterialActivities((activityRes.data as unknown as MaterialActivityRow[]) || [])
          setQuizAttempts((attemptsRes.data as unknown as QuizAttemptRow[]) || [])
          setFlashcardProgress((progressRes.data as unknown as FlashcardProgressRow[]) || [])
        }
      } catch (err) {
        console.error("Exception loading user progress metrics:", err)
      } finally {
        if (active) {
          setLoadingData(false)
        }
      }
    }

    void loadProgressData()

    return () => {
      active = false
    }
  }, [user?.id, supabase])

  // --- Real-time Stat Calculations ---

  const stats = useMemo(() => {
    const materialsViewed = materialActivities.filter((a) => a.action === "view").length
    const materialsDownloaded = materialActivities.filter((a) => a.action === "download").length
    const quizzesCount = quizAttempts.length

    let avgQuizScorePct = 0
    const validAttempts = quizAttempts.filter((a) => a.total_questions > 0)
    if (validAttempts.length > 0) {
      const sum = validAttempts.reduce((acc, a) => acc + (a.score / a.total_questions) * 100, 0)
      avgQuizScorePct = Math.round(sum / validAttempts.length)
    }

    const cardsReviewedCount = flashcardProgress.length
    const totalRepetitions = flashcardProgress.reduce((acc, p) => acc + (p.repetitions || 0), 0)

    // Flashcard decks studied are unique deck_ids in our progress
    const deckIds = new Set<string>()
    flashcardProgress.forEach((p) => {
      const dId = p.flashcards?.flashcard_decks?.id || p.flashcards?.deck_id
      if (dId) deckIds.add(dId)
    })
    const decksStudiedCount = deckIds.size

    // --- Streak Calculation ---
    // Gather all local-timezone activity dates
    const activityDates = new Set<string>()

    materialActivities.forEach((a) => {
      if (a.created_at) {
        activityDates.add(new Date(a.created_at).toLocaleDateString("en-CA"))
      }
    })

    quizAttempts.forEach((q) => {
      if (q.completed_at) {
        activityDates.add(new Date(q.completed_at).toLocaleDateString("en-CA"))
      }
    })

    flashcardProgress.forEach((p) => {
      if (p.last_reviewed_at) {
        activityDates.add(new Date(p.last_reviewed_at).toLocaleDateString("en-CA"))
      }
    })

    const sortedDates = Array.from(activityDates).sort((a, b) => b.localeCompare(a))

    let currentStreak = 0
    if (sortedDates.length > 0) {
      const todayStr = new Date().toLocaleDateString("en-CA")
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toLocaleDateString("en-CA")

      if (sortedDates.includes(todayStr) || sortedDates.includes(yesterdayStr)) {
        let checkDate = sortedDates.includes(todayStr) ? new Date() : yesterday
        while (true) {
          const checkStr = checkDate.toLocaleDateString("en-CA")
          if (sortedDates.includes(checkStr)) {
            currentStreak++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            break
          }
        }
      }
    }

    const hasAnyActivity =
      materialActivities.length > 0 || quizAttempts.length > 0 || flashcardProgress.length > 0

    return {
      materialsViewed,
      materialsDownloaded,
      quizzesCount,
      avgQuizScorePct,
      cardsReviewedCount,
      totalRepetitions,
      decksStudiedCount,
      currentStreak,
      hasAnyActivity,
    }
  }, [materialActivities, quizAttempts, flashcardProgress])

  // --- Course-by-Course Performance Blending ---

  const coursePerformanceList = useMemo(() => {
    const courseStatsMap = new Map<
      string,
      {
        id: string
        code: string
        title: string
        quizScores: number[]
        flashcardsTotal: number
        flashcardsMastered: number
      }
    >()

    // Helper to add course row
    function getOrCreateCourseRow(courseId: string, details: Course | null) {
      if (!courseStatsMap.has(courseId)) {
        courseStatsMap.set(courseId, {
          id: courseId,
          code: details?.code || "GEN",
          title: details?.title || "General Medicine",
          quizScores: [],
          flashcardsTotal: 0,
          flashcardsMastered: 0,
        })
      }
      return courseStatsMap.get(courseId)!
    }

    // Process Quizzes
    quizAttempts.forEach((attempt) => {
      const cDetails = attempt.quizzes?.courses
      const cId = attempt.quizzes?.course_id || cDetails?.id
      if (cId) {
        const stats = getOrCreateCourseRow(cId, cDetails || null)
        if (attempt.total_questions > 0) {
          stats.quizScores.push((attempt.score / attempt.total_questions) * 100)
        }
      }
    })

    // Process Flashcard progress
    flashcardProgress.forEach((p) => {
      const deck = p.flashcards?.flashcard_decks
      const cDetails = deck?.courses
      const cId = deck?.course_id || cDetails?.id
      if (cId) {
        const stats = getOrCreateCourseRow(cId, cDetails || null)
        stats.flashcardsTotal++
        if ((p.repetitions ?? 0) >= 2) {
          stats.flashcardsMastered++
        }
      }
    })

    // Calculate blended stats and map
    return Array.from(courseStatsMap.values())
      .map((stats) => {
        const hasQuizzes = stats.quizScores.length > 0
        const hasFlashcards = stats.flashcardsTotal > 0

        let performance = 0
        let primarySignal: "quiz" | "flashcard" = "quiz"

        if (hasQuizzes) {
          const sum = stats.quizScores.reduce((a, b) => a + b, 0)
          performance = Math.round(sum / stats.quizScores.length)
          primarySignal = "quiz"
        } else if (hasFlashcards) {
          performance = Math.round((stats.flashcardsMastered / stats.flashcardsTotal) * 100)
          primarySignal = "flashcard"
        }

        const avgQuizScore = hasQuizzes
          ? Math.round(stats.quizScores.reduce((a, b) => a + b, 0) / stats.quizScores.length)
          : null

        const flashcardMastery = hasFlashcards
          ? Math.round((stats.flashcardsMastered / stats.flashcardsTotal) * 100)
          : null

        return {
          ...stats,
          performance,
          primarySignal,
          hasQuizzes,
          hasFlashcards,
          avgQuizScore,
          flashcardMastery,
        }
      })
      .sort((a, b) => a.performance - b.performance) // Weakest performing first
  }, [quizAttempts, flashcardProgress])

  // --- Plain Language Insights Generation ---

  const insights = useMemo(() => {
    const list: string[] = []

    if (coursePerformanceList.length > 0) {
      const weakest = coursePerformanceList[0]
      const strongest = coursePerformanceList[coursePerformanceList.length - 1]

      if (strongest.performance >= 75) {
        list.push(
          `🌟 Strongest subject: You are excelling in ${strongest.code} - ${strongest.title} with a ${strongest.performance}% blended score. Keep setting the standard!`
        )
      } else if (strongest.performance > 0) {
        list.push(
          `📈 Lead Course: Your highest active performance is in ${strongest.code} - ${strongest.title} (${strongest.performance}%).`
        )
      }

      if (weakest.performance < 70) {
        list.push(
          `⚠️ Needs attention: Consider allocating extra review sessions to ${weakest.code} - ${weakest.title} (${weakest.performance}% blended score). Doing quizzes in this area can accelerate progress!`
        )
      } else if (coursePerformanceList.length > 1) {
        list.push(
          `ℹ️ Focus recommendation: Your lowest scoring active course is ${weakest.code} - ${weakest.title} at ${weakest.performance}%.`
        )
      }

      // Quiz attempts milestone
      if (stats.quizzesCount >= 10 && stats.avgQuizScorePct >= 80) {
        list.push(
          `🎯 High Quiz Accuracy: Your average of ${stats.avgQuizScorePct}% across ${stats.quizzesCount} quizzes demonstrates excellent clinical retention.`
        )
      }

      // Flashcards milestone
      if (stats.cardsReviewedCount >= 15) {
        const mastered = flashcardProgress.filter((p) => (p.repetitions ?? 0) >= 2).length
        const masteryPct = Math.round((mastered / stats.cardsReviewedCount) * 100)
        if (masteryPct >= 50) {
          list.push(
            `🧠 Spaced Repetition: You have fully mastered ${masteryPct}% of your ${stats.cardsReviewedCount} reviewed flashcards.`
          )
        }
      }
    }

    return list
  }, [coursePerformanceList, stats, flashcardProgress])

  // --- Merged Activity Feed Generation ---

  const activityFeed = useMemo(() => {
    const list: MergedActivityItem[] = []

    // 1. Add Material Activities
    materialActivities.forEach((a) => {
      if (a.created_at) {
        list.push({
          id: `material-${a.id}`,
          type: "material",
          action: a.action === "download" ? "Downloaded resource" : "Viewed resource",
          title: a.materials?.title || "Study Material",
          subtext: a.materials?.type ? formatTypeName(a.materials.type) : "Resource",
          courseCode: a.materials?.courses?.code || undefined,
          courseTitle: a.materials?.courses?.title || undefined,
          date: new Date(a.created_at),
        })
      }
    })

    // 2. Add Quiz Attempts
    quizAttempts.forEach((q) => {
      if (q.completed_at) {
        list.push({
          id: `quiz-${q.id}`,
          type: "quiz",
          action: "Completed Quiz",
          title: q.quizzes?.topic || "AI-Generated Quiz",
          subtext: q.quizzes?.format ? formatQuizFormat(q.quizzes.format) : "MCQ Quiz",
          courseCode: q.quizzes?.courses?.code || undefined,
          courseTitle: q.quizzes?.courses?.title || undefined,
          date: new Date(q.completed_at),
          score: q.score,
          totalQuestions: q.total_questions,
        })
      }
    })

    // 3. Add Flashcard progress updates
    flashcardProgress.forEach((p) => {
      if (p.last_reviewed_at) {
        const deck = p.flashcards?.flashcard_decks
        list.push({
          id: `flashcard-${p.id}`,
          type: "flashcard",
          action: "Reviewed Flashcard",
          title: deck?.topic || "Flashcard Deck Review",
          subtext: p.repetitions >= 2 ? "Card Mastered" : "Card Studied",
          courseCode: deck?.courses?.code || undefined,
          courseTitle: deck?.courses?.title || undefined,
          date: new Date(p.last_reviewed_at),
        })
      }
    })

    // Sort by date descending
    return list.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 15)
  }, [materialActivities, quizAttempts, flashcardProgress])

  // --- Formatting Helpers ---

  function formatTypeName(type: string): string {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  function formatQuizFormat(format: string): string {
    if (format === "mcq") return "Multiple Choice (MCQ)"
    if (format === "sba") return "Single Best Answer (SBA)"
    if (format === "steeplechase") return "Steeplechase"
    if (format === "picture") return "Picture Test"
    if (format === "short") return "Short Answer"
    return format.toUpperCase()
  }

  function formatActivityTime(date: Date) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // --- Render logic ---

  if (authLoading) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Verifying credentials...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-8" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="mt-1 text-sm text-muted-foreground">Please sign in to track your course metrics and study streaks.</p>
        </div>
        <Button asChild className="mt-2">
          <Link href="/login">Sign In Now</Link>
        </Button>
      </div>
    )
  }

  if (loadingData) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Aggregating study records...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      <PageHeader
        title="Progress Tracker"
        description="Real-time analytics and blended performance metrics across your medical studies."
      />

      {/* --- STATS OVERVIEW CARDS --- */}
      <section>
        <MotionStaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Streak card */}
          <MotionStaggerItem>
            <Card className="gap-3 relative overflow-hidden bg-gradient-to-br from-card to-amber-500/5">
              <CardContent className="flex items-start justify-between gap-3 pt-6">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">Current streak</p>
                  <p className="text-2xl font-bold tracking-tight text-foreground">
                    {stats.currentStreak === 0 ? "0 days" : `${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.currentStreak > 0 ? "Keep the flame burning!" : "Log in tomorrow to start a streak!"}
                  </p>
                </div>
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500`}>
                  <Flame className="size-5" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          </MotionStaggerItem>

          {/* Quizzes Taken Card */}
          <MotionStaggerItem>
            <Card className="gap-3 relative overflow-hidden bg-gradient-to-br from-card to-emerald-500/5">
              <CardContent className="flex items-start justify-between gap-3 pt-6">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">Quizzes completed</p>
                  <p className="text-2xl font-bold tracking-tight text-foreground">{stats.quizzesCount}</p>
                  <p className="text-xs text-emerald-500 font-medium">
                    {stats.quizzesCount > 0 ? `${stats.avgQuizScorePct}% Average Score` : "No attempts recorded yet"}
                  </p>
                </div>
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500`}>
                  <ListChecks className="size-5" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          </MotionStaggerItem>

          {/* Flashcard Card */}
          <MotionStaggerItem>
            <Card className="gap-3 relative overflow-hidden bg-gradient-to-br from-card to-primary/5">
              <CardContent className="flex items-start justify-between gap-3 pt-6">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">Cards Reviewed</p>
                  <p className="text-2xl font-bold tracking-tight text-foreground">{stats.cardsReviewedCount}</p>
                  <p className="text-xs text-primary font-medium">
                    {stats.decksStudiedCount > 0 ? `${stats.decksStudiedCount} Decks Studied` : "No active card progress"}
                  </p>
                </div>
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary`}>
                  <BrainCircuit className="size-5" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          </MotionStaggerItem>

          {/* Materials Viewed Card */}
          <MotionStaggerItem>
            <Card className="gap-3 relative overflow-hidden bg-gradient-to-br from-card to-secondary/5">
              <CardContent className="flex items-start justify-between gap-3 pt-6">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">Materials read/viewed</p>
                  <p className="text-2xl font-bold tracking-tight text-foreground">{stats.materialsViewed}</p>
                  <p className="text-xs text-secondary font-medium">
                    {stats.materialsDownloaded > 0 ? `${stats.materialsDownloaded} direct downloads` : "0 downloads logged"}
                  </p>
                </div>
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary dark:text-secondary/90`}>
                  <BookOpen className="size-5" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          </MotionStaggerItem>
        </MotionStaggerGroup>
      </section>

      {/* --- ZERO STATE OR MAIN DASHBOARD CONTENT --- */}
      {!stats.hasAnyActivity ? (
        <Card className="border border-dashed border-muted-foreground/30 py-12 px-6 text-center">
          <CardHeader className="flex flex-col items-center gap-2">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-8 animate-pulse" />
            </div>
            <CardTitle className="text-lg mt-2">Start your learning journey!</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              Your study stats, course-by-course performance, and interactive timelines will appear here automatically as you learn.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-center gap-3 mt-4">
            <Button asChild size="sm" variant="default">
              <Link href="/quizzes">Take a Quiz</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/flashcards">Review Flashcards</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/library">Explore Library</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* --- SUBJECT/COURSE PERFORMANCE --- */}
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <SectionHeading
                title="Blended Course Performance"
                description="We track your weakest subjects by compiling quiz scores first and flashcard progress as fallbacks."
              />

              {coursePerformanceList.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground text-sm">
                  Complete quizzes or study flashcards to see per-course performance metrics.
                </Card>
              ) : (
                <div className="grid gap-4">
                  {coursePerformanceList.map((course) => {
                    const isLow = course.performance < 60
                    const isHigh = course.performance >= 85

                    return (
                      <Card key={course.id} className="p-5 flex flex-col gap-4 transition-all hover:border-muted-foreground/40">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-primary">{course.code}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="font-medium text-foreground text-sm sm:text-base">{course.title}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                              {course.hasQuizzes && (
                                <span>Quiz Avg: {course.avgQuizScore}% ({course.quizScores.length} attempts)</span>
                              )}
                              {course.hasQuizzes && course.hasFlashcards && <span className="text-muted-foreground/50">|</span>}
                              {course.hasFlashcards && (
                                <span>Card Mastery: {course.flashcardMastery}% ({course.flashcardsTotal} cards)</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <Badge
                              variant={isHigh ? "success" : isLow ? "warning" : "default"}
                              className="font-semibold text-sm"
                            >
                              {course.performance}%
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Progress
                            value={course.performance}
                            indicatorClassName={
                              isHigh ? "bg-emerald-500" : isLow ? "bg-amber-500" : "bg-primary"
                            }
                          />
                          <div className="flex justify-between text-[11px] text-muted-foreground/60">
                            <span>0%</span>
                            <span>Weakest first sorting helps highlight target areas</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            {/* --- SMART INSIGHTS PANEL --- */}
            <div className="flex flex-col gap-4">
              <SectionHeading
                title="Smart Insights"
                description="Instant observations computed from your data."
              />

              <Card className="h-full bg-gradient-to-br from-card via-card to-primary/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="size-4 text-primary animate-pulse" />
                    Performance Feedback
                  </CardTitle>
                  <CardDescription>
                    Automatically processed key takeaways based on your recent activity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
                      <AlertCircle className="size-8 text-muted-foreground/45" />
                      <p className="text-sm">Not enough data to calculate direct insights yet. Take more quizzes to generate focus points.</p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-4">
                      {insights.map((insight, idx) => (
                        <li key={idx} className="text-sm leading-relaxed p-3 rounded-lg bg-muted/40 border border-muted/50 flex gap-2.5">
                          <div className="mt-0.5 shrink-0 text-primary">✨</div>
                          <span className="text-foreground/90">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* --- RECENT ACTIVITY TIMELINE --- */}
          <section className="mt-4">
            <SectionHeading
              title="Recent Activity Timeline"
              description="A chronological log of your recent views, downloads, quiz accomplishments, and flashcard iterations."
            />

            <Card className="mt-4 overflow-hidden">
              <CardContent className="pt-6">
                {activityFeed.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No recent logs recorded.</p>
                ) : (
                  <div className="relative border-l border-border pl-6 ml-4 space-y-6">
                    {activityFeed.map((activity) => {
                      const isMaterial = activity.type === "material"
                      const isQuiz = activity.type === "quiz"
                      const isFlashcard = activity.type === "flashcard"

                      return (
                        <div key={activity.id} className="relative group">
                          {/* Dot Indicator */}
                          <span className="absolute -left-[1.95rem] top-1.5 flex size-4 items-center justify-center rounded-full bg-background ring-2 ring-border">
                            <span
                              className={`size-2 rounded-full ${
                                isQuiz
                                  ? "bg-emerald-500"
                                  : isFlashcard
                                  ? "bg-amber-500"
                                  : "bg-blue-500"
                              }`}
                            />
                          </span>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground/80 font-medium">
                                  {activity.action}
                                </span>
                                {activity.courseCode && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                    {activity.courseCode}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-foreground mt-1">
                                {activity.title}
                              </p>
                              {activity.courseTitle && (
                                <p className="text-xs text-muted-foreground/75 mt-0.5">
                                  {activity.courseTitle}
                                </p>
                              )}
                              {activity.subtext && (
                                <span className="text-[11px] text-muted-foreground/60 block mt-1">
                                  {activity.subtext}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 self-start sm:self-center">
                              {isQuiz && activity.score !== undefined && activity.totalQuestions !== undefined && (
                                <Badge variant="secondary" className="font-semibold">
                                  Score: {activity.score}/{activity.totalQuestions}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground/60 whitespace-nowrap flex items-center gap-1">
                                <Clock className="size-3" />
                                {formatActivityTime(activity.date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
