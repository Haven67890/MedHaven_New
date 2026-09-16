"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  Filter,
  Eye,
  Award,
  HelpCircle
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { MotionReveal, MotionStaggerGroup, MotionStaggerItem } from "@/components/ui/motion"

interface Course {
  id: string
  code: string | null
  title: string | null
  level: string | number | null
}

interface SteeplechaseSpotter {
  id: string
  course_id: string | null
  title: string | null
  image_url: string
  category: string | null
  correct_findings: string
  differential_diagnosis: string | null
  question: string | null
  courses?: {
    id: string
    code: string | null
    title: string | null
  } | null
}

export default function SteeplechasePage() {
  const supabase = createClient()

  // State
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all")
  const [spotters, setSpotters] = useState<SteeplechaseSpotter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Session state
  const [currentStationIndex, setCurrentStationIndex] = useState(0)
  const [identificationAnswer, setIdentAnswer] = useState("")
  const [taskAnswer, setTaskAnswer] = useState("")
  const [isRevealed, setIsRevealed] = useState(false)
  const [sessionCompleted, setSessionCompleted] = useState(false)

  // Recorded scores: { [stationIndex]: { identCorrect: boolean, taskCorrect: boolean } }
  const [stationScores, setStationScores] = useState<
    Record<number, { identCorrect: boolean; taskCorrect: boolean }>
  >({})

  // Full-screen image zoom modal
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)
  const [zoomImageTitle, setZoomImageTitle] = useState<string>("")

  // Fetch courses and spotters
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setSessionCompleted(false)
      setCurrentStationIndex(0)
      setIsRevealed(false)
      setIdentAnswer("")
      setTaskAnswer("")
      setStationScores({})

      // 1. Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, code, title, level")
        .order("code", { ascending: true })

      if (coursesError) throw coursesError
      setCourses((coursesData as Course[]) || [])

      // 2. Fetch active quiz_image_bank spotters
      let query = supabase
        .from("quiz_image_bank")
        .select(`
          id,
          course_id,
          title,
          image_url,
          category,
          correct_findings,
          differential_diagnosis,
          question,
          courses (
            id,
            code,
            title
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (selectedCourseId !== "all") {
        query = query.eq("course_id", selectedCourseId)
      }

      const { data: spotterData, error: spotterError } = await query

      if (spotterError) throw spotterError

      const list = (spotterData || []) as unknown as SteeplechaseSpotter[]
      setSpotters(list)
    } catch (err: any) {
      console.error("Error fetching steeplechase data:", err)
      setError(err?.message || "Failed to load steeplechase stations.")
    } finally {
      setLoading(false)
    }
  }, [selectedCourseId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const currentSpotter = spotters[currentStationIndex]

  const handleReveal = () => {
    setIsRevealed(true)
  }

  const handleGradeStation = (identCorrect: boolean, taskCorrect: boolean) => {
    setStationScores((prev) => ({
      ...prev,
      [currentStationIndex]: { identCorrect, taskCorrect }
    }))

    if (currentStationIndex < spotters.length - 1) {
      setCurrentStationIndex((prev) => prev + 1)
      setIsRevealed(false)
      setIdentAnswer("")
      setTaskAnswer("")
    } else {
      setSessionCompleted(true)
    }
  }

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId)
  }

  // Calculate score summary
  const calculateTotalScore = () => {
    let earnedPoints = 0
    let totalPossible = spotters.length * 2 // 1 point for identification, 1 point for task

    Object.values(stationScores).forEach((sc) => {
      if (sc.identCorrect) earnedPoints++
      if (sc.taskCorrect) earnedPoints++
    })

    const percentage = totalPossible > 0 ? Math.round((earnedPoints / totalPossible) * 100) : 0
    return { earnedPoints, totalPossible, percentage }
  }

  const formatCategory = (category: string | null) => {
    if (!category) return "Spotter Station"
    return category
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* HEADER */}
      <MotionReveal>
        <PageHeader
          title="Steeplechase Tests"
          description="Sequential practical spotter stations: identify specimens/findings and perform associated clinical tasks."
        >
          <Link href="/flashcards">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="size-4" />
              <span>Back to Practical Exams</span>
            </Button>
          </Link>
        </PageHeader>
      </MotionReveal>

      {/* FILTER BAR */}
      <MotionReveal>
        <Card className="border-border/60 bg-card p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Filter className="size-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col gap-1 w-full sm:max-w-xs">
                <label htmlFor="course-filter" className="text-xs font-semibold text-muted-foreground">
                  Filter by Course
                </label>
                <select
                  id="course-filter"
                  value={selectedCourseId}
                  onChange={(e) => handleSelectCourse(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All Courses ({spotters.length} stations)</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code ? `${course.code}: ` : ""}{course.title || "Subject"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Layers className="size-4 text-primary" />
              <span>Sequential Station Circuit</span>
            </div>
          </div>
        </Card>
      </MotionReveal>

      {/* LOADING STATE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-center">
          <Loader2 className="size-9 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">Initializing Steeplechase Station Circuit...</p>
        </div>
      ) : error ? (
        /* ERROR STATE */
        <Card className="border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="size-8 text-destructive mx-auto mb-2" />
          <h3 className="text-base font-bold text-foreground">Unable to Load Steeplechase</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{error}</p>
          <Button onClick={fetchData} size="sm" className="mt-4 gap-2">
            <RotateCcw className="size-4" /> Try Again
          </Button>
        </Card>
      ) : spotters.length === 0 ? (
        /* EMPTY STATE */
        <Card className="p-12 text-center border-dashed">
          <Layers className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">No Spotter Stations Available</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {selectedCourseId !== "all"
              ? "No steeplechase stations exist for the selected course. Select another course."
              : "No steeplechase spotters are currently available in the specimen bank."}
          </p>
          {selectedCourseId !== "all" && (
            <Button onClick={() => setSelectedCourseId("all")} variant="outline" size="sm" className="mt-4">
              View All Courses
            </Button>
          )}
        </Card>
      ) : !sessionCompleted && currentSpotter ? (
        /* ACTIVE STEEPLECHASE STATION */
        <MotionReveal className="flex flex-col gap-6">
          {/* Progress Header */}
          <Card className="border-border/60 bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-mono text-xs font-bold">
                  {currentStationIndex + 1}/{spotters.length}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Station {currentStationIndex + 1}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {formatCategory(currentSpotter.category)}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-foreground mt-0.5 line-clamp-1">
                    {currentSpotter.courses?.code ? `${currentSpotter.courses.code} — ` : ""}{currentSpotter.title || "Spotter Station"}
                  </h3>
                </div>
              </div>

              <Progress value={((currentStationIndex + 1) / spotters.length) * 100} className="w-24 sm:w-36 h-2" />
            </div>
          </Card>

          {/* Station Circuit Main Grid */}
          <div className="grid gap-6 md:grid-cols-2 items-start">
            {/* Spotter Specimen Frame */}
            <Card className="border-border/60 bg-card overflow-hidden flex flex-col">
              <div className="p-3 bg-muted/30 border-b border-border/40 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Eye className="size-3.5" /> Station Spotter Specimen / Instrument
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    setZoomImageUrl(currentSpotter.image_url)
                    setZoomImageTitle(currentSpotter.title || "Spotter Station")
                  }}
                >
                  <ZoomIn className="size-3.5" /> Zoom
                </Button>
              </div>

              <CardContent className="p-2 sm:p-4 flex items-center justify-center bg-black/5 dark:bg-black/40 min-h-[280px] sm:min-h-[350px]">
                <img
                  src={currentSpotter.image_url}
                  alt={currentSpotter.title || "Spotter Image"}
                  className="max-h-[360px] w-auto object-contain cursor-pointer transition-transform hover:scale-[1.01] rounded-lg"
                  onClick={() => {
                    setZoomImageUrl(currentSpotter.image_url)
                    setZoomImageTitle(currentSpotter.title || "Spotter Station")
                  }}
                />
              </CardContent>
            </Card>

            {/* Station Tasks & Answers */}
            <Card className="border-border/60 bg-card shadow-sm flex flex-col justify-between">
              <CardHeader className="p-4 sm:p-6 border-b border-border/40">
                <CardTitle className="text-base font-bold">Practical Examination Tasks</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-foreground/90 font-medium mt-1">
                  Answer both practical tasks for Station {currentStationIndex + 1}.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 flex flex-col gap-5 flex-1">
                {/* Task 1: Identification */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">1</span>
                    Identify the specimen / instrument / finding shown:
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Sphygmomanometer / Auer Rods / Lobar Pneumonia..."
                    value={identificationAnswer}
                    onChange={(e) => setIdentAnswer(e.target.value)}
                    disabled={isRevealed}
                    className="text-sm"
                  />
                </div>

                {/* Task 2: Associated Practical Question */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-foreground flex items-start gap-1.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] mt-0.5">2</span>
                    <span>{currentSpotter.question || "State the key clinical function, diagnostic significance, or associated differential diagnosis:"}</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="State key clinical answer or function..."
                    value={taskAnswer}
                    onChange={(e) => setTaskAnswer(e.target.value)}
                    disabled={isRevealed}
                    className="text-sm"
                  />
                </div>

                {!isRevealed ? (
                  <Button onClick={handleReveal} className="mt-2 font-bold gap-2">
                    <Sparkles className="size-4" />
                    <span>Reveal Station Key & Marking Rubric</span>
                  </Button>
                ) : (
                  <div className="flex flex-col gap-4 mt-2 animate-in fade-in duration-300">
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-2">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Station Marking Key:
                      </span>
                      <div className="text-sm font-semibold text-foreground whitespace-pre-wrap leading-relaxed">
                        {currentSpotter.correct_findings}
                      </div>

                      {currentSpotter.differential_diagnosis && (
                        <div className="mt-2 pt-2 border-t border-emerald-500/10 text-xs">
                          <span className="font-bold text-muted-foreground block mb-0.5">Differentials / Associated Notes:</span>
                          <p className="text-foreground/90">{currentSpotter.differential_diagnosis}</p>
                        </div>
                      )}
                    </div>

                    {/* Self-Assessment Scoring */}
                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-semibold text-center text-muted-foreground">
                        Evaluate your answers against the key:
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleGradeStation(false, false)}
                          className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs gap-1"
                        >
                          <XCircle className="size-3.5" /> Both Incorrect (0/2)
                        </Button>
                        <Button
                          onClick={() => handleGradeStation(true, true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                        >
                          <CheckCircle2 className="size-3.5" /> Both Correct (2/2)
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-4 sm:p-6 border-t border-border/40 flex items-center justify-between bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Station {currentStationIndex + 1} of {spotters.length}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  Steeplechase Practical
                </span>
              </CardFooter>
            </Card>
          </div>
        </MotionReveal>
      ) : (
        /* COMPLETED STEEPLECHASE CIRCUIT SUMMARY */
        <MotionReveal className="flex flex-col gap-6">
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden text-center">
            <CardHeader className="bg-primary/5 border-b border-primary/10 pb-6">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                <Award className="size-6" />
              </div>
              <CardTitle className="text-2xl font-bold">Steeplechase Circuit Completed!</CardTitle>
              <CardDescription>
                You have finished all {spotters.length} spotter stations in this practical exam session.
              </CardDescription>

              {(() => {
                const { earnedPoints, totalPossible, percentage } = calculateTotalScore()
                return (
                  <div className="flex flex-col items-center justify-center mt-4 gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-foreground font-mono">
                      {percentage}%
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {earnedPoints} of {totalPossible} station marking points earned
                    </span>
                  </div>
                )
              })()}
            </CardHeader>

            <CardFooter className="p-6 flex flex-wrap justify-center items-center gap-3 bg-card">
              <Button variant="outline" onClick={fetchData} className="gap-2">
                <RotateCcw className="size-4" /> Restart Steeplechase Circuit
              </Button>
              <Link href="/flashcards">
                <Button className="gap-2">Return to Practical Exams</Button>
              </Link>
            </CardFooter>
          </Card>
        </MotionReveal>
      )}

      {/* FULLSCREEN IMAGE ZOOM MODAL */}
      {zoomImageUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-background rounded-xl overflow-hidden border border-border flex flex-col shadow-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h4 className="font-semibold text-sm line-clamp-1">{zoomImageTitle}</h4>
              <Button variant="ghost" size="icon" onClick={() => setZoomImageUrl(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-black/40">
              <img src={zoomImageUrl} alt={zoomImageTitle} className="max-h-[75vh] w-auto object-contain rounded" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
