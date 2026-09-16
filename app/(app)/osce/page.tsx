"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Award,
  Clock,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ZoomIn,
  X,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertCircle,
  BrainCircuit,
  Eye,
  FileText,
  Stethoscope,
  Activity,
  Heart,
  Brain,
  Zap
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { evaluateOSCEAnswer, type OSCEStation, type OSCEAnswerEvaluation } from "@/lib/osce-engine"
import { MotionReveal, MotionStaggerGroup, MotionStaggerItem } from "@/components/ui/motion"

const STATION_TIME_SECONDS = 60

// Expected 600L OSCE Course Codes
const REQUIRED_600L_CODES = [
  "MED600",
  "SUR600",
  "RAD600",
  "OPH600",
  "PSY600",
  "ENT600",
  "ANE600"
]

interface CourseOption {
  id: string
  code: string
  title: string
  description?: string | null
}

function OSCEContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const courseIdParam = searchParams.get("course_id")
  const supabase = createClient()

  // Launcher state (for fetching 600L courses if no course_id selected)
  const [eligibleCourses, setEligibleCourses] = useState<CourseOption[]>([])
  const [loadingLauncher, setLoadingLauncher] = useState(true)

  // Exam configuration & state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stations, setStations] = useState<OSCEStation[]>([])
  const [quizId, setQuizId] = useState<string | null>(null)
  const [activeCourse, setActiveCourse] = useState<CourseOption | null>(null)

  // Current station active view state
  const [currentStationIndex, setCurrentStationIndex] = useState(0)
  const [currentSubAnswers, setCurrentSubAnswers] = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft] = useState(STATION_TIME_SECONDS)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sessionCompleted, setSessionCompleted] = useState(false)

  // Full-screen image zoom modal
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)
  const [zoomImageTitle, setZoomImageTitle] = useState<string>("")

  // Recorded answers for all stations: { [stationIndex]: { subAnswers: { [subIdx]: string }, evaluations: { [subIdx]: OSCEAnswerEvaluation } } }
  const [userAnswersMap, setUserAnswersMap] = useState<
    Record<
      number,
      {
        subAnswers: Record<number, string>
        evaluations: Record<number, OSCEAnswerEvaluation>
      }
    >
  >({})

  // 1. Fetch eligible 600L courses on mount
  useEffect(() => {
    let active = true

    async function load600LCourses() {
      try {
        setLoadingLauncher(true)
        const { data, error } = await supabase
          .from("courses")
          .select("id, code, title, description")
          .eq("level", "600L")
          .in("code", REQUIRED_600L_CODES)

        if (error) {
          console.error("Error fetching 600L OSCE courses:", error)
          return
        }

        if (active && data) {
          // Sort explicitly by REQUIRED_600L_CODES order
          const sorted = [...data].sort((a, b) => {
            const idxA = REQUIRED_600L_CODES.indexOf(a.code)
            const idxB = REQUIRED_600L_CODES.indexOf(b.code)
            return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99)
          }) as CourseOption[]

          setEligibleCourses(sorted)
        }
      } catch (err) {
        console.error("Failed to load OSCE course launcher:", err)
      } finally {
        if (active) setLoadingLauncher(false)
      }
    }

    load600LCourses()
    return () => {
      active = false
    }
  }, [supabase])

  // 2. Fetch or generate OSCE stations when course_id exists
  const fetchOSCEStations = useCallback(async () => {
    if (!courseIdParam) return

    setLoading(true)
    setError(null)
    setSessionCompleted(false)
    setCurrentStationIndex(0)
    setUserAnswersMap({})
    setCurrentSubAnswers({})
    setTimeLeft(STATION_TIME_SECONDS)

    try {
      // Find course details
      const { data: courseData } = await supabase
        .from("courses")
        .select("id, code, title")
        .eq("id", courseIdParam)
        .single()

      if (courseData) {
        setActiveCourse(courseData as CourseOption)
      }

      const res = await fetch("/api/osce/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseIdParam,
          limit: 5
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to load OSCE stations")
      }

      if (!data.stations || data.stations.length === 0) {
        throw new Error("No active OSCE stations found for this course")
      }

      setStations(data.stations)
      setQuizId(data.quiz_id || null)
    } catch (err: any) {
      console.error("OSCE station load error:", err)
      setError(err?.message || "Failed to initialize OSCE examination session")
    } finally {
      setLoading(false)
    }
  }, [courseIdParam, supabase])

  useEffect(() => {
    if (courseIdParam) {
      fetchOSCEStations()
    }
  }, [courseIdParam, fetchOSCEStations])

  // Current active station reference
  const currentStation = stations[currentStationIndex]

  // Submit current station answers & advance or finish
  const handleNextStation = useCallback(() => {
    if (isSubmitting || sessionCompleted || stations.length === 0) return
    setIsSubmitting(true)

    const st = stations[currentStationIndex]
    const evaluations: Record<number, OSCEAnswerEvaluation> = {}

    st.sub_questions?.forEach((sq, subIdx) => {
      const uAns = currentSubAnswers[subIdx] || ""
      evaluations[subIdx] = evaluateOSCEAnswer(uAns, sq.expected_answer)
    })

    const updatedAnswersMap = {
      ...userAnswersMap,
      [currentStationIndex]: {
        subAnswers: { ...currentSubAnswers },
        evaluations
      }
    }
    setUserAnswersMap(updatedAnswersMap)

    // Save attempt log to user_question_history if user logged in
    const logHistory = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session && st.image_bank_id) {
          const overallCorrect = Object.values(evaluations).every((ev) => ev.isCorrect)
          await supabase.from("user_question_history").insert({
            user_id: session.user.id,
            question_id: null,
            quiz_id: quizId,
            is_correct: overallCorrect,
            attempted_at: new Date().toISOString()
          })
        }
      } catch {
        // Ignore background insertion errors
      }
    }
    logHistory()

    if (currentStationIndex < stations.length - 1) {
      const nextIdx = currentStationIndex + 1
      setCurrentStationIndex(nextIdx)
      setCurrentSubAnswers({})
      setTimeLeft(STATION_TIME_SECONDS)
      setIsSubmitting(false)
    } else {
      setSessionCompleted(true)
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    sessionCompleted,
    stations,
    currentStationIndex,
    currentSubAnswers,
    userAnswersMap,
    quizId,
    supabase
  ])

  // 60-second station countdown timer
  useEffect(() => {
    if (!courseIdParam || loading || sessionCompleted || stations.length === 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleNextStation()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [courseIdParam, loading, sessionCompleted, stations.length, currentStationIndex, handleNextStation])

  const handleSubAnswerChange = (subIdx: number, val: string) => {
    setCurrentSubAnswers((prev) => ({
      ...prev,
      [subIdx]: val
    }))
  }

  // Calculate final score summary
  const calculateTotalScore = () => {
    let earnedSubQuestions = 0
    let totalSubQuestions = 0

    stations.forEach((st, idx) => {
      const stAns = userAnswersMap[idx]
      st.sub_questions?.forEach((_, subIdx) => {
        totalSubQuestions++
        if (stAns?.evaluations?.[subIdx]?.isCorrect) {
          earnedSubQuestions++
        }
      })
    })

    const percentage = totalSubQuestions > 0 ? Math.round((earnedSubQuestions / totalSubQuestions) * 100) : 0
    return { earnedSubQuestions, totalSubQuestions, percentage }
  }

  // Handle course selection from launcher
  const handleSelectCourse = (courseId: string) => {
    router.push(`/osce?course_id=${courseId}`)
  }

  // Helper icon mapper for 600L specialties
  const getSpecialtyIcon = (code: string) => {
    switch (code) {
      case "MED600": return Stethoscope
      case "SUR600": return Activity
      case "RAD600": return Zap
      case "OPH600": return Eye
      case "PSY600": return Brain
      case "ENT600": return Heart
      case "ANE600": return Activity
      default: return Award
    }
  }

  // SCENARIO 1: NO COURSE SELECTED — SHOW 600L COURSE LAUNCHER
  if (!courseIdParam) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
        <MotionReveal>
          <PageHeader
            title="Objective Structured Clinical Exam (OSCE)"
            description="Select a 600L clinical specialty to launch your structured OSCE practical exam station session."
          >
            <Link href="/flashcards">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeft className="size-4" />
                <span>Back to Practical Exams</span>
              </Button>
            </Link>
          </PageHeader>
        </MotionReveal>

        <MotionReveal>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <Badge variant="outline" className="text-xs font-mono font-bold bg-primary/5 text-primary border-primary/20">
                  600L MBBS Clinical Specialties
                </Badge>
                <h2 className="text-lg sm:text-xl font-bold text-foreground mt-1">Select OSCE Exam Specialty</h2>
              </div>
            </div>

            {loadingLauncher ? (
              <div className="flex flex-col items-center justify-center p-12 gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading 600L OSCE specialties...</p>
              </div>
            ) : eligibleCourses.length === 0 ? (
              <Card className="p-8 text-center">
                <AlertCircle className="size-8 text-muted-foreground mx-auto mb-2" />
                <h3 className="text-base font-bold text-foreground">No 600L OSCE Courses Found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Ensure 600L course records exist in the database.
                </p>
              </Card>
            ) : (
              <MotionStaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {eligibleCourses.map((course) => {
                  const IconComp = getSpecialtyIcon(course.code)
                  return (
                    <MotionStaggerItem key={course.id}>
                      <Card
                        className="p-5 flex flex-col justify-between border-border/60 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer h-full"
                        onClick={() => handleSelectCourse(course.id)}
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <IconComp className="size-5" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {course.code}
                            </Badge>
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-foreground">{course.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {course.description || `Practical OSCE stations covering clinical examination, diagnosis, and management in ${course.title}.`}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/40">
                          <Button className="w-full justify-between font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                            <span>Start {course.code} OSCE</span>
                            <ArrowRight className="size-4" />
                          </Button>
                        </div>
                      </Card>
                    </MotionStaggerItem>
                  )
                })}
              </MotionStaggerGroup>
            )}
          </div>
        </MotionReveal>
      </div>
    )
  }

  // SCENARIO 2: LOADING STATIONS
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <Loader2 className="size-10 animate-spin text-primary" />
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-foreground">Preparing OSCE Station Session</h3>
          <p className="text-xs text-muted-foreground max-w-md">
            {activeCourse ? `Loading verified ${activeCourse.code} (${activeCourse.title}) medical specimens...` : "Generating OSCE stations..."}
          </p>
        </div>
      </div>
    )
  }

  // SCENARIO 3: ERROR STATE
  if (error || stations.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto my-8">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              <CardTitle className="text-base">OSCE Station Error</CardTitle>
            </div>
            <CardDescription className="text-sm mt-1">{error || "Unable to load OSCE stations for this course."}</CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-3">
            <Button onClick={fetchOSCEStations} className="gap-2">
              <RotateCcw className="size-4" />
              <span>Try Again</span>
            </Button>
            <Link href="/osce">
              <Button variant="outline">Select Different Course</Button>
            </Link>
            <Link href="/flashcards">
              <Button variant="ghost">Back to Practical Exams</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      <MotionReveal>
        <PageHeader
          title={`OSCE — ${activeCourse?.code ? `${activeCourse.code}: ${activeCourse.title}` : "Clinical Specialty"}`}
          description="Senior 600L MBBS station-based practical assessment with 60-second timers and structured marking rubrics."
        >
          <div className="flex items-center gap-2">
            <Link href="/osce">
              <Button variant="outline" size="sm" className="gap-1.5">
                Change Specialty
              </Button>
            </Link>
            <Link href="/flashcards">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeft className="size-4" />
                <span>Back to Practical Exams</span>
              </Button>
            </Link>
          </div>
        </PageHeader>
      </MotionReveal>

      {/* ACTIVE STATION VIEW */}
      {!sessionCompleted && currentStation && (
        <div className="flex flex-col gap-6">
          {/* Station Progress & Timer Bar */}
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-mono text-sm font-extrabold">
                  {currentStationIndex + 1}/{stations.length}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      Station {currentStationIndex + 1}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {activeCourse?.code || currentStation.topic}
                    </Badge>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-1">
                    {currentStation.image_bank?.title || "Clinical Specimen Station"}
                  </h3>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-extrabold text-sm sm:text-base transition-all ${
                    timeLeft <= 15
                      ? "bg-destructive/10 text-destructive border-destructive/30 animate-pulse"
                      : "bg-primary/10 text-primary border-primary/20"
                  }`}
                >
                  <Clock className="size-4 shrink-0" />
                  <span>00:{String(timeLeft).padStart(2, "0")}</span>
                </div>
              </div>
            </div>
            <Progress value={((STATION_TIME_SECONDS - timeLeft) / STATION_TIME_SECONDS) * 100} indicatorClassName={timeLeft <= 15 ? "bg-destructive" : "bg-primary"} />
          </Card>

          {/* Station Main Content Grid */}
          <div className="grid gap-6 md:grid-cols-2 items-start">
            {/* Medical Image Viewer */}
            <Card className="border-border/60 bg-card overflow-hidden flex flex-col">
              <div className="p-3 bg-muted/30 border-b border-border/40 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Eye className="size-3.5" /> Clinical Image / Diagnostic Specimen
                </span>
                {currentStation.image_bank?.image_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      setZoomImageUrl(currentStation.image_bank?.image_url || null)
                      setZoomImageTitle(currentStation.image_bank?.title || "Specimen Image")
                    }}
                  >
                    <ZoomIn className="size-3.5" /> Zoom
                  </Button>
                )}
              </div>

              <CardContent className="p-2 sm:p-4 flex items-center justify-center bg-black/5 dark:bg-black/40 min-h-[260px] sm:min-h-[340px]">
                {currentStation.image_bank?.image_url ? (
                  <img
                    src={currentStation.image_bank.image_url}
                    alt={currentStation.image_bank.title || "OSCE Image"}
                    className="max-h-[380px] w-auto object-contain cursor-pointer transition-transform hover:scale-[1.01]"
                    onClick={() => {
                      setZoomImageUrl(currentStation.image_bank?.image_url || null)
                      setZoomImageTitle(currentStation.image_bank?.title || "Specimen Image")
                    }}
                  />
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    [Image Preview Unavailable]
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Station Tasks & Response Form */}
            <Card className="border-border/60 bg-card shadow-sm flex flex-col">
              <CardHeader className="p-4 sm:p-6 border-b border-border/40">
                <CardTitle className="text-base font-bold">Station Tasks & Sub-questions</CardTitle>
                <CardDescription className="text-xs sm:text-sm whitespace-pre-line text-foreground/90 font-normal">
                  {currentStation.question_text}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 flex flex-col gap-5 flex-1">
                {currentStation.sub_questions && currentStation.sub_questions.map((sq, subIdx) => (
                  <div key={subIdx} className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground flex items-start gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                        {subIdx + 1}
                      </span>
                      <span>{sq.question}</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Type your structured answer..."
                      value={currentSubAnswers[subIdx] || ""}
                      onChange={(e) => handleSubAnswerChange(subIdx, e.target.value)}
                      className="bg-background text-sm"
                    />
                  </div>
                ))}
              </CardContent>

              <CardFooter className="p-4 sm:p-6 border-t border-border/40 flex justify-between items-center bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Station auto-submits when timer expires.
                </span>
                <Button onClick={handleNextStation} disabled={isSubmitting} className="gap-2 font-bold">
                  <span>{currentStationIndex < stations.length - 1 ? "Next Station" : "Submit Final Station"}</span>
                  <ArrowRight className="size-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}

      {/* SESSION REVIEW VIEW */}
      {sessionCompleted && (
        <MotionReveal className="flex flex-col gap-6">
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10 text-center pb-6">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                <Award className="size-6" />
              </div>
              <CardTitle className="text-2xl font-bold">OSCE Assessment Completed</CardTitle>
              <CardDescription>
                Station-by-station evaluation and structured marking rubric breakdown for {activeCourse?.title || "Clinical Specialty"}.
              </CardDescription>

              {(() => {
                const { earnedSubQuestions, totalSubQuestions, percentage } = calculateTotalScore()
                return (
                  <div className="flex flex-col items-center justify-center mt-4 gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-foreground font-mono">
                      {percentage}%
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {earnedSubQuestions} of {totalSubQuestions} sub-question marking points achieved
                    </span>
                  </div>
                )
              })()}
            </CardHeader>
            <CardFooter className="p-4 flex flex-wrap justify-between items-center gap-3 bg-card">
              <Button variant="outline" onClick={fetchOSCEStations} className="gap-2">
                <RotateCcw className="size-4" />
                <span>Start New Station Set</span>
              </Button>
              <Link href="/osce">
                <Button variant="outline">Select Different Specialty</Button>
              </Link>
              <Link href="/flashcards">
                <Button className="gap-2">
                  <span>Back to Practical Exams</span>
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Station Breakdown */}
          <div className="flex flex-col gap-6">
            <h3 className="text-lg font-bold">Station Performance Breakdown</h3>

            {stations.map((st, idx) => {
              const stAns = userAnswersMap[idx]
              return (
                <Card key={idx} className="border-border/60 overflow-hidden bg-card">
                  <CardHeader className="p-4 bg-muted/30 border-b border-border/40 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        Station {idx + 1}
                      </Badge>
                      <CardTitle className="text-base font-semibold">
                        {st.image_bank?.title || "Clinical Specimen"}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6 grid gap-6 md:grid-cols-2 items-start">
                    {/* Image Preview */}
                    {st.image_bank?.image_url && (
                      <div className="rounded-lg overflow-hidden border border-border/60 bg-black/5 dark:bg-black/30 flex items-center justify-center p-2">
                        <img
                          src={st.image_bank.image_url}
                          alt={st.image_bank.title || "Specimen"}
                          className="max-h-[220px] object-contain rounded"
                        />
                      </div>
                    )}

                    {/* Sub-question evaluations */}
                    <div className="flex flex-col gap-4">
                      {st.sub_questions?.map((sq, subIdx) => {
                        const uVal = stAns?.subAnswers?.[subIdx] || "(No answer provided)"
                        const evalRes = stAns?.evaluations?.[subIdx]

                        return (
                          <div key={subIdx} className="p-3 rounded-lg border border-border/50 bg-muted/20 flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-semibold text-foreground">
                                {subIdx + 1}. {sq.question}
                              </span>
                              {evalRes?.isCorrect ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] shrink-0">
                                  <CheckCircle2 className="size-3 mr-1" />
                                  Correct
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px] shrink-0">
                                  <XCircle className="size-3 mr-1" />
                                  Needs Review
                                </Badge>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground flex flex-col gap-1">
                              <div><span className="font-semibold text-foreground">Your Answer:</span> {uVal}</div>
                              <div><span className="font-semibold text-emerald-600 dark:text-emerald-400">Marking Key:</span> {sq.expected_answer}</div>
                              <div className="italic text-[11px] mt-0.5 text-foreground/80">{sq.explanation}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
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

export default function OSCEPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    }>
      <OSCEContent />
    </Suspense>
  )
}
