"use client"

import { useState, useEffect, useRef } from "react"
import {
  Eye,
  Clock,
  Sparkles,
  Award,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Stethoscope
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { evaluateOSCEAnswer } from "@/lib/osce-engine"
import {
  MotionReveal,
  MotionStaggerGroup,
  MotionStaggerItem
} from "@/components/ui/motion"

interface Course {
  id: string
  code: string | null
  title: string | null
  level: string | number | null
}

interface OSCESubQuestion {
  question: string
  expected_answer: string
  explanation: string
}

interface SpecimenImage {
  id: string
  title: string
  image_url: string
  category: string
  correct_findings: string
  differential_diagnosis?: string | null
  source?: string | null
}

interface OSCEStation {
  id: string
  question_bank_id?: string | null
  image_bank_id: string
  question_text: string
  sub_questions: OSCESubQuestion[]
  correct_answer: string
  explanation: string
  image_bank: SpecimenImage
}

interface StationUserAnswer {
  stationIndex: number
  subAnswers: Record<number, string>
  evaluations: Record<number, { score: number; isCorrect: boolean; matchedKeywords: string[] }>
  timeSpentSeconds: number
}

export default function OSCEAssessmentPage() {
  const supabase = createClient()

  // Setup state
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [stationCount, setStationCount] = useState<number>(5)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [durationPerStation, setDurationPerStation] = useState<number>(60) // 60 seconds default (1 min)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Active Session state
  const [sessionActive, setSessionActive] = useState(false)
  const [quizId, setQuizId] = useState<string | null>(null)
  const [stations, setStations] = useState<OSCEStation[]>([])
  const [currentStationIndex, setCurrentStationIndex] = useState(0)
  const [userAnswersMap, setUserAnswersMap] = useState<Record<number, StationUserAnswer>>({})
  const [timerSeconds, setTimerSeconds] = useState<number>(60)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  // Review state
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const [isSavingHistory, setIsSavingHistory] = useState(false)

  // Image Zoom Modal
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)
  const [zoomImageTitle, setZoomImageTitle] = useState<string>("")

  // Fetch courses on mount
  useEffect(() => {
    async function loadCourses() {
      try {
        setLoadingCourses(true)
        const { data, error } = await supabase
          .from("courses")
          .select("id, code, title, level")
          .order("code", { ascending: true })

        if (error) throw error

        if (data && data.length > 0) {
          setCourses(data)
          // Default to Medicine & Surgery / Senior MBBS course or first 600L course
          const mbbs600L = data.find(c => c.level === "600L" || c.code?.includes("MED") || c.code?.includes("SUR"))
          setSelectedCourseId(mbbs600L?.id || data[0].id)
        }
      } catch (err: any) {
        console.error("Failed to load courses:", err)
      } finally {
        setLoadingCourses(false)
      }
    }
    loadCourses()
  }, [])

  // Station countdown timer tick
  useEffect(() => {
    let interval: any = null
    if (sessionActive && isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1)
      }, 1000)
    } else if (sessionActive && isTimerRunning && timerSeconds === 0) {
      // Time expired for this station -> auto advance
      handleNextStation()
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [sessionActive, isTimerRunning, timerSeconds])

  // Start OSCE session
  const handleStartOSCE = async () => {
    if (!selectedCourseId) {
      setErrorMessage("Please select a target course for the OSCE station assessment.")
      return
    }

    try {
      setIsGenerating(true)
      setErrorMessage(null)

      const res = await fetch("/api/osce/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: selectedCourseId,
          station_count: stationCount,
          category: selectedCategory || undefined,
          duration_seconds: durationPerStation
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to load OSCE stations")
      }

      if (!data.stations || data.stations.length === 0) {
        throw new Error("No active stations available for the selected configuration.")
      }

      setQuizId(data.quiz_id)
      setStations(data.stations)
      setCurrentStationIndex(0)
      setUserAnswersMap({})
      setTimerSeconds(durationPerStation)
      setSessionActive(true)
      setIsTimerRunning(true)
      setSessionCompleted(false)
    } catch (err: any) {
      console.error("OSCE start error:", err)
      setErrorMessage(err.message || "Could not generate OSCE stations.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle current sub-question answer input
  const handleSubAnswerChange = (subIdx: number, val: string) => {
    setUserAnswersMap(prev => {
      const currentStationAns = prev[currentStationIndex] || {
        stationIndex: currentStationIndex,
        subAnswers: {},
        evaluations: {},
        timeSpentSeconds: 0
      }

      return {
        ...prev,
        [currentStationIndex]: {
          ...currentStationAns,
          subAnswers: {
            ...currentStationAns.subAnswers,
            [subIdx]: val
          }
        }
      }
    })
  }

  // Advance to next station or complete session
  const handleNextStation = () => {
    setIsTimerRunning(false)

    // Evaluate sub-questions for current station
    const currentStation = stations[currentStationIndex]
    const currentAnswers = userAnswersMap[currentStationIndex]?.subAnswers || {}
    const evaluations: Record<number, { score: number; isCorrect: boolean; matchedKeywords: string[] }> = {}

    if (currentStation && currentStation.sub_questions) {
      currentStation.sub_questions.forEach((sq, idx) => {
        const uAns = currentAnswers[idx] || ""
        evaluations[idx] = evaluateOSCEAnswer(uAns, sq.expected_answer)
      })
    }

    setUserAnswersMap(prev => ({
      ...prev,
      [currentStationIndex]: {
        ...(prev[currentStationIndex] || {
          stationIndex: currentStationIndex,
          subAnswers: {},
          evaluations: {},
          timeSpentSeconds: 0
        }),
        evaluations,
        timeSpentSeconds: durationPerStation - timerSeconds
      }
    }))

    if (currentStationIndex < stations.length - 1) {
      const nextIdx = currentStationIndex + 1
      setCurrentStationIndex(nextIdx)
      setTimerSeconds(durationPerStation)
      setIsTimerRunning(true)
    } else {
      // Session finished
      finishOSCESession()
    }
  }

  // Finish session and record user_question_history
  const finishOSCESession = async () => {
    setSessionActive(false)
    setIsTimerRunning(false)
    setSessionCompleted(true)

    // Log performance in user_question_history
    try {
      setIsSavingHistory(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const historyEntries = stations.map((st, idx) => {
        const stAns = userAnswersMap[idx]
        const subEvals = Object.values(stAns?.evaluations || {})
        const totalSub = subEvals.length
        const correctSub = subEvals.filter(e => e.isCorrect).length
        const isOverallCorrect = totalSub > 0 ? (correctSub / totalSub) >= 0.5 : false

        return {
          user_id: user.id,
          question_id: st.question_bank_id || null,
          quiz_id: quizId,
          is_correct: isOverallCorrect,
          attempted_at: new Date().toISOString()
        }
      }).filter(e => e.question_id !== null)

      if (historyEntries.length > 0) {
        await supabase.from("user_question_history").insert(historyEntries)
      }
    } catch (saveErr) {
      console.warn("Could not record user question history:", saveErr)
    } finally {
      setIsSavingHistory(false)
    }
  }

  // Calculate total score
  const calculateTotalScore = () => {
    let totalSubQuestions = 0
    let earnedSubQuestions = 0

    stations.forEach((st, idx) => {
      const stAns = userAnswersMap[idx]
      const subEvals = Object.values(stAns?.evaluations || {})
      totalSubQuestions += (st.sub_questions?.length || 0)
      subEvals.forEach(ev => {
        if (ev.isCorrect) earnedSubQuestions += 1
      })
    })

    const percentage = totalSubQuestions > 0 ? Math.round((earnedSubQuestions / totalSubQuestions) * 100) : 0
    return { earnedSubQuestions, totalSubQuestions, percentage }
  }

  const currentStation = stations[currentStationIndex]
  const currentSubAnswers = userAnswersMap[currentStationIndex]?.subAnswers || {}

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* PAGE HEADER */}
      <PageHeader
        title="OSCE Stations"
        description="Timed, image-first clinical assessment stations for senior medical students."
        icon={Eye}
        badge="Medicine & Surgery 600L"
      />

      {/* SETUP VIEW */}
      {!sessionActive && !sessionCompleted && (
        <MotionReveal className="flex flex-col gap-6">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Stethoscope className="size-4" />
                <span>Station Setup & Blueprint Selection</span>
              </div>
              <CardTitle className="text-xl">Configure OSCE Examination</CardTitle>
              <CardDescription>
                Select your target medical course and station duration. Stations feature real diagnostic images, radiographs, equipment, and clinical specimens from the MedHaven specimen bank.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                {/* Course Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Target Course / Specialty</label>
                  {loadingCourses ? (
                    <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                  ) : (
                    <select
                      value={selectedCourseId}
                      onChange={e => setSelectedCourseId(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.code ? `[${c.code}] ` : ""}{c.title || "Course"} ({c.level || "MBBS"})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Medicine & Surgery 600L / Final Year is the primary benchmark blueprint.
                  </p>
                </div>

                {/* Category Filter */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Specimen / Image Category (Optional)</label>
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Categories (Radiology, Pathology, Equipment, Blood Film)</option>
                    <option value="radiology">Radiology (X-rays, CT, Imaging)</option>
                    <option value="gross_specimen">Gross Pathology Specimens</option>
                    <option value="histology_slide">Histology Slides</option>
                    <option value="equipment">Medical Instruments & Equipment</option>
                    <option value="blood_film">Blood Film & Haematology</option>
                    <option value="clinical_photo">Clinical Photos & Lesions</option>
                  </select>
                </div>

                {/* Station Count */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Number of Stations</label>
                  <div className="flex items-center gap-3">
                    {[3, 5, 10].map(count => (
                      <Button
                        key={count}
                        type="button"
                        variant={stationCount === count ? "default" : "outline"}
                        onClick={() => setStationCount(count)}
                        className="flex-1"
                      >
                        {count} Stations
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Timer Duration per Station */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Station Time Limit</label>
                  <div className="flex items-center gap-3">
                    {[
                      { label: "1 Minute (Standard)", val: 60 },
                      { label: "2 Minutes", val: 120 },
                      { label: "Untimed Practice", val: 9999 }
                    ].map(opt => (
                      <Button
                        key={opt.val}
                        type="button"
                        variant={durationPerStation === opt.val ? "default" : "outline"}
                        onClick={() => setDurationPerStation(opt.val)}
                        className="flex-1 text-xs"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-4 border-t border-border/40">
              <Button
                onClick={handleStartOSCE}
                disabled={isGenerating || loadingCourses}
                size="lg"
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Loading Stations...</span>
                  </>
                ) : (
                  <>
                    <span>Start OSCE Assessment</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </MotionReveal>
      )}

      {/* ACTIVE STATION RUNNER */}
      {sessionActive && currentStation && (
        <div className="flex flex-col gap-6">
          {/* Top Progress & Timer Bar */}
          <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/60 shadow-sm">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-xs py-1 px-2.5">
                Station {currentStationIndex + 1} of {stations.length}
              </Badge>
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                {currentStation.image_bank?.category ? currentStation.image_bank.category.toUpperCase().replace("_", " ") : "CLINICAL OSCE"}
              </span>
            </div>

            {/* Countdown Timer */}
            {durationPerStation < 9999 && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold ${
                timerSeconds <= 15 ? "bg-destructive/10 text-destructive border-destructive/30 animate-pulse" : "bg-muted/50 border-border/60 text-foreground"
              }`}>
                <Clock className="size-4" />
                <span>{Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, "0")}</span>
              </div>
            )}
          </div>

          <Progress value={((currentStationIndex + 1) / stations.length) * 100} className="h-1.5" />

          {/* Main Station Content: Split Grid for Mobile & Desktop */}
          <div className="grid gap-6 lg:grid-cols-2 items-start">
            {/* Image & Specimen Viewer */}
            <Card className="border-border/60 overflow-hidden bg-card shadow-sm flex flex-col">
              <CardHeader className="p-4 bg-muted/30 border-b border-border/40 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold line-clamp-1">
                    {currentStation.image_bank?.title || "Station Image"}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-1">
                    {currentStation.image_bank?.source ? `Source: ${currentStation.image_bank.source}` : "MedHaven Specimen Bank"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setZoomImageUrl(currentStation.image_bank?.image_url || null)
                    setZoomImageTitle(currentStation.image_bank?.title || "Station Image")
                  }}
                  title="Expand image"
                >
                  <Maximize2 className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 relative flex items-center justify-center bg-black/5 dark:bg-black/40 min-h-[260px] sm:min-h-[340px]">
                {currentStation.image_bank?.image_url ? (
                  <img
                    src={currentStation.image_bank.image_url}
                    alt={currentStation.image_bank.title || "OSCE Image"}
                    className="max-h-[380px] w-auto object-contain cursor-pointer transition-transform hover:scale-[1.01]"
                    onClick={() => {
                      setZoomImageUrl(currentStation.image_bank?.image_url || null)
                      setZoomImageTitle(currentStation.image_bank?.title || "Station Image")
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
                <CardTitle className="text-lg font-bold">Station Tasks</CardTitle>
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
                      onChange={e => handleSubAnswerChange(subIdx, e.target.value)}
                      className="bg-background text-sm"
                    />
                  </div>
                ))}
              </CardContent>

              <CardFooter className="p-4 sm:p-6 border-t border-border/40 flex justify-between items-center bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Answer all sub-questions before time expires.
                </span>
                <Button onClick={handleNextStation} className="gap-2">
                  <span>{currentStationIndex < stations.length - 1 ? "Next Station" : "Submit Station"}</span>
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
          {/* Score Header Card */}
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10 text-center pb-6">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                <Award className="size-6" />
              </div>
              <CardTitle className="text-2xl font-bold">OSCE Assessment Completed</CardTitle>
              <CardDescription>
                Detailed station-by-station evaluation and marking point breakdown.
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
            <CardFooter className="p-4 flex justify-between items-center bg-card">
              <Button variant="outline" onClick={() => setSessionCompleted(false)} className="gap-2">
                <RotateCcw className="size-4" />
                <span>Configure New Station Set</span>
              </Button>
              <Button onClick={() => window.location.reload()} className="gap-2">
                <span>Return to Dashboard</span>
              </Button>
            </CardFooter>
          </Card>

          {/* Station-by-Station Review Breakdown */}
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
                        {st.image_bank?.title || "Station Image"}
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
                                  Needs Improvement
                                </Badge>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground flex flex-col gap-1">
                              <div><span className="font-semibold text-foreground">Your Answer:</span> {uVal}</div>
                              <div><span className="font-semibold text-emerald-600 dark:text-emerald-400">Expected Answer:</span> {sq.expected_answer}</div>
                              <div className="italic text-[11px] mt-0.5">{sq.explanation}</div>
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
