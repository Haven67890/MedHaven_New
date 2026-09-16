"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Image as ImageIcon,
  Eye,
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
  Layers,
  HelpCircle,
  BookOpen
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { createClient } from "@/lib/supabase/client"
import { MotionReveal, MotionStaggerGroup, MotionStaggerItem } from "@/components/ui/motion"

interface Course {
  id: string
  code: string | null
  title: string | null
  level: string | number | null
}

interface SpecimenImage {
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

export default function PicturesTestsPage() {
  const supabase = createClient()

  // State
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all")
  const [specimens, setSpecimens] = useState<SpecimenImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Test session state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userResponse, setUserResponse] = useState("")
  const [isRevealed, setIsRevealed] = useState(false)
  const [scoresMap, setScoresMap] = useState<Record<string, boolean>>({})
  const [mode, setMode] = useState<"test" | "gallery">("test")

  // Full-screen image zoom modal
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)
  const [zoomImageTitle, setZoomImageTitle] = useState<string>("")

  // Fetch courses and specimens
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, code, title, level")
        .order("code", { ascending: true })

      if (coursesError) throw coursesError
      setCourses((coursesData as Course[]) || [])

      // 2. Fetch active quiz_image_bank specimens
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

      const { data: specimensData, error: specimensError } = await query

      if (specimensError) throw specimensError

      const list = (specimensData || []) as unknown as SpecimenImage[]
      setSpecimens(list)
      setCurrentIndex(0)
      setIsRevealed(false)
      setUserResponse("")
    } catch (err: any) {
      console.error("Error fetching pictures test data:", err)
      setError(err?.message || "Failed to load medical specimens.")
    } finally {
      setLoading(false)
    }
  }, [selectedCourseId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const currentSpecimen = specimens[currentIndex]

  const handleReveal = () => {
    setIsRevealed(true)
  }

  const handleGrade = (correct: boolean) => {
    if (!currentSpecimen) return
    setScoresMap((prev) => ({
      ...prev,
      [currentSpecimen.id]: correct
    }))
    handleNext()
  }

  const handleNext = () => {
    if (currentIndex < specimens.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setIsRevealed(false)
      setUserResponse("")
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setIsRevealed(false)
      setUserResponse("")
    }
  }

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId)
  }

  // Format category badge label
  const formatCategory = (category: string | null) => {
    if (!category) return "Clinical Specimen"
    return category
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* HEADER */}
      <MotionReveal>
        <PageHeader
          title="Pictures Tests"
          description="Identify and interpret clinical photos, radiology films, histology slides, and gross pathology specimens."
        >
          <Link href="/flashcards">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="size-4" />
              <span>Back to Practical Exams</span>
            </Button>
          </Link>
        </PageHeader>
      </MotionReveal>

      {/* FILTER & MODE BAR */}
      <MotionReveal>
        <Card className="border-border/60 bg-card p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Course Filter Dropdown */}
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
                  <option value="all">All Courses ({specimens.length} items)</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code ? `${course.code}: ` : ""}{course.title || "Subject"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant={mode === "test" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("test")}
                className="gap-1.5 text-xs h-8"
              >
                <Eye className="size-3.5" />
                <span>Test Mode</span>
              </Button>
              <Button
                variant={mode === "gallery" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("gallery")}
                className="gap-1.5 text-xs h-8"
              >
                <Layers className="size-3.5" />
                <span>Gallery View</span>
              </Button>
            </div>
          </div>
        </Card>
      </MotionReveal>

      {/* LOADING STATE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-center">
          <Loader2 className="size-9 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">Loading Pictures Tests Specimen Bank...</p>
        </div>
      ) : error ? (
        /* ERROR STATE */
        <Card className="border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="size-8 text-destructive mx-auto mb-2" />
          <h3 className="text-base font-bold text-foreground">Unable to Load Pictures Tests</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{error}</p>
          <Button onClick={fetchData} size="sm" className="mt-4 gap-2">
            <RotateCcw className="size-4" /> Try Again
          </Button>
        </Card>
      ) : specimens.length === 0 ? (
        /* EMPTY STATE */
        <Card className="p-12 text-center border-dashed">
          <ImageIcon className="size-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">No Specimens Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {selectedCourseId !== "all"
              ? "No active picture test specimens exist for the selected course. Try selecting another course."
              : "No active medical specimens are currently available in the specimen bank."}
          </p>
          {selectedCourseId !== "all" && (
            <Button onClick={() => setSelectedCourseId("all")} variant="outline" size="sm" className="mt-4">
              View All Courses
            </Button>
          )}
        </Card>
      ) : mode === "test" && currentSpecimen ? (
        /* TEST MODE ACTIVE ITEM */
        <MotionReveal className="flex flex-col gap-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">
              Specimen {currentIndex + 1} of {specimens.length}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono">
                {currentSpecimen.courses?.code || "Course"}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {formatCategory(currentSpecimen.category)}
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 items-start">
            {/* Image Card */}
            <Card className="border-border/60 bg-card overflow-hidden flex flex-col">
              <div className="p-3 bg-muted/30 border-b border-border/40 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Eye className="size-3.5" /> High-Resolution Clinical Specimen
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    setZoomImageUrl(currentSpecimen.image_url)
                    setZoomImageTitle(currentSpecimen.title || "Medical Specimen")
                  }}
                >
                  <ZoomIn className="size-3.5" /> Zoom
                </Button>
              </div>

              <CardContent className="p-2 sm:p-4 flex items-center justify-center bg-black/5 dark:bg-black/40 min-h-[280px] sm:min-h-[360px]">
                <img
                  src={currentSpecimen.image_url}
                  alt={currentSpecimen.title || "Specimen Image"}
                  className="max-h-[380px] w-auto object-contain cursor-pointer transition-transform hover:scale-[1.01] rounded-lg"
                  onClick={() => {
                    setZoomImageUrl(currentSpecimen.image_url)
                    setZoomImageTitle(currentSpecimen.title || "Medical Specimen")
                  }}
                />
              </CardContent>
            </Card>

            {/* Assessment Panel */}
            <Card className="border-border/60 bg-card shadow-sm flex flex-col justify-between">
              <CardHeader className="p-4 sm:p-6 border-b border-border/40">
                <CardTitle className="text-base font-bold">
                  {currentSpecimen.title || "Identify Specimen Findings"}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-foreground/90 font-medium mt-1">
                  {currentSpecimen.question || "Identify the main structure, diagnostic findings, or pathological process shown in this image."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 flex flex-col gap-4 flex-1">
                {!isRevealed ? (
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Your Identification / Diagnosis:
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Type key findings, radiological features, or diagnostic conclusions..."
                      value={userResponse}
                      onChange={(e) => setUserResponse(e.target.value)}
                      className="w-full rounded-md border border-input bg-background p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button onClick={handleReveal} className="mt-2 font-bold gap-2">
                      <Sparkles className="size-4" />
                      <span>Reveal Correct Findings & Diagnosis</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                    {userResponse && (
                      <div className="p-3 rounded-lg border border-border/50 bg-muted/20 text-xs">
                        <span className="font-bold text-muted-foreground block mb-1">Your Note:</span>
                        <p className="text-foreground">{userResponse}</p>
                      </div>
                    )}

                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-2">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Official Findings & Diagnosis:
                      </span>
                      <p className="text-sm font-semibold text-foreground whitespace-pre-wrap leading-relaxed">
                        {currentSpecimen.correct_findings}
                      </p>

                      {currentSpecimen.differential_diagnosis && (
                        <div className="mt-2 pt-2 border-t border-emerald-500/10">
                          <span className="text-xs font-bold text-muted-foreground block mb-1">
                            Differential Diagnoses:
                          </span>
                          <p className="text-xs text-foreground/90 leading-normal">
                            {currentSpecimen.differential_diagnosis}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                      <span className="text-xs font-semibold text-center text-muted-foreground">
                        Rate your identification accuracy:
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleGrade(false)}
                          className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5"
                        >
                          <XCircle className="size-4" />
                          <span>Needs Review</span>
                        </Button>
                        <Button
                          onClick={() => handleGrade(true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        >
                          <CheckCircle2 className="size-4" />
                          <span>Got It Right</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-4 sm:p-6 border-t border-border/40 flex items-center justify-between bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground font-mono">
                  {currentIndex + 1} / {specimens.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentIndex === specimens.length - 1}
                  className="gap-1 text-xs"
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </MotionReveal>
      ) : (
        /* GALLERY VIEW */
        <MotionStaggerGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {specimens.map((sp, idx) => (
            <MotionStaggerItem key={sp.id}>
              <Card
                className="overflow-hidden border-border/60 hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between h-full"
                onClick={() => {
                  setCurrentIndex(idx)
                  setMode("test")
                  setIsRevealed(false)
                }}
              >
                <div>
                  <div className="aspect-video w-full bg-black/30 overflow-hidden flex items-center justify-center p-1 relative">
                    <img
                      src={sp.image_url}
                      alt={sp.title || "Specimen"}
                      className="object-contain w-full h-full max-h-48"
                    />
                    <Badge variant="secondary" className="absolute top-2 right-2 text-[9px] bg-background/80 backdrop-blur-sm">
                      {formatCategory(sp.category)}
                    </Badge>
                  </div>
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {sp.courses?.code || "Course"}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold line-clamp-1">
                      {sp.title || "Clinical Specimen"}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {sp.correct_findings}
                    </CardDescription>
                  </CardHeader>
                </div>
                <CardFooter className="p-4 pt-0">
                  <Button variant="ghost" size="sm" className="w-full text-xs gap-1 justify-between text-primary">
                    <span>Practice Specimen</span>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            </MotionStaggerItem>
          ))}
        </MotionStaggerGroup>
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
