"use client"

import { useState, useEffect } from "react"
import {
  ArrowRight,
  Sparkles,
  Target,
  TrendingUp,
  ListChecks,
  Star,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  CircleCheck,
  AlertCircle,
  Activity,
  Image as ImageIcon,
  Check,
  X
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionHeading } from "@/components/dashboard/section-heading"
import { StatCard } from "@/components/dashboard/stat-card"
import { createClient } from "@/lib/supabase/client"

interface Course {
  id: string
  code: string | null
  title: string | null
  level: string | number | null
}

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct_answer: string
  explanation: string
}

interface AttemptWithDetails {
  id: string
  quiz_id: string
  score: number
  total_questions: number
  completed_at: string
  quizzes?: {
    topic: string
    format?: string
    courses?: {
      code: string | null
      title: string | null
    } | null
  } | null
}

const suggestedTopics = [
  "Antibiotic Mechanisms",
  "Cardiovascular Physiology",
  "Drug Metabolism",
  "Inflammation & Repair",
  "Cranial Nerves & Pathways",
  "Renal Pathology"
]

const formats = [
  {
    id: "MCQ",
    title: "Multiple Choice Questions (MCQ)",
    desc: "Classic multiple-choice questions covering core diagnostic and theoretical concepts.",
    icon: ListChecks,
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    id: "SBA",
    title: "Single Best Answer (SBA)",
    desc: "Highly-plausible clinical options with only one representing the absolute best action.",
    icon: Target,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10"
  },
  {
    id: "Steeplechase",
    title: "Steeplechase (Sequential)",
    desc: "A linked series of progressive questions that evolve with the patient's clinical state.",
    icon: Activity,
    color: "text-purple-500",
    bg: "bg-purple-500/10"
  },
  {
    id: "Picture Test",
    title: "Picture Test (Visual)",
    desc: "Vignettes explicitly referencing simulated diagnostic scans, X-rays, clinical photos, or histology slides.",
    icon: ImageIcon,
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  },
  {
    id: "Short Answer",
    title: "Short Answer",
    desc: "Type free-text rationales and self-evaluate your diagnosis against official rubrics.",
    icon: Award,
    color: "text-rose-500",
    bg: "bg-rose-500/10"
  }
] as const

export default function AIQuizzesPage() {
  const supabase = createClient()

  // Data states
  const [courses, setCourses] = useState<Course[]>([])
  const [attempts, setAttempts] = useState<AttemptWithDetails[]>([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [userSession, setUserSession] = useState<any>(null)
  const [userLevel, setUserLevel] = useState<string | null>(null)

  // Quiz creation states
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [customTopic, setCustomTopic] = useState("")
  const [selectedFormat, setSelectedFormat] = useState<"MCQ" | "SBA" | "Steeplechase" | "Picture Test" | "Short Answer">("MCQ")
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Loader message rotations
  const [loaderMessageIndex, setLoaderMessageIndex] = useState(0)
  const loaderMessages = [
    "Analyzing course syllabus...",
    "Querying local database cache...",
    "Contacting MedHaven Groq AI...",
    "Formulating clinical vignettes...",
    "Polishing distractors and correct keys...",
    "Injecting detailed rationales..."
  ]

  // Active quiz states
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [typedShortAnswer, setTypedShortAnswer] = useState("")
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false)
  const [answersState, setAnswersState] = useState<Record<number, { selected: string; correct: boolean }>>({})

  // Finish states
  const [isFinished, setIsFinished] = useState(false)
  const [savingAttempt, setSavingAttempt] = useState(false)

  // Handle rotating generation loader message
  useEffect(() => {
    if (!generating) {
      setLoaderMessageIndex(0)
      return
    }
    const interval = setInterval(() => {
      setLoaderMessageIndex((prev) => (prev + 1) % loaderMessages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [generating])

  // Fetch initial data (user, courses, attempts)
  useEffect(() => {
    let active = true

    async function init() {
      try {
        setLoadingInitial(true)

        // 1. Get user session
        const { data: { session } } = await supabase.auth.getSession()
        if (active) {
          setUserSession(session)
        }

        if (!session?.user) {
          setLoadingInitial(false)
          return
        }

        // Fetch user level first
        let currentLvl = ""
        const { data: profileData } = await supabase
          .from("profiles")
          .select("current_level")
          .eq("id", session.user.id)
          .maybeSingle()
        if (profileData?.current_level) {
          currentLvl = profileData.current_level
          if (active) {
            setUserLevel(currentLvl)
          }
        }

        // Check for quizId query parameter to preload quiz
        let urlQuizId: string | null = null
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search)
          urlQuizId = params.get("quizId")
        }

        if (urlQuizId && active) {
          const { data: quizData, error: quizError } = await supabase
            .from("quizzes")
            .select(`
              id,
              course_id,
              topic,
              format,
              quiz_questions (
                id,
                question_text,
                options,
                correct_answer,
                explanation
              )
            `)
            .eq("id", urlQuizId)
            .maybeSingle()

          if (!quizError && quizData) {
            const formattedQs = (quizData.quiz_questions || []).map((q: any) => ({
              id: q.id,
              question: q.question_text,
              options: q.options || [],
              correct_answer: q.correct_answer,
              explanation: q.explanation || "No explanation provided."
            }))

            setQuestions(formattedQs)
            setActiveQuizId(quizData.id)
            setSelectedFormat((quizData.format || "MCQ") as any)
            setSelectedCourseId(quizData.course_id || "")
            setCurrentQuestionIndex(0)
            setSelectedAnswer(null)
            setTypedShortAnswer("")
            setIsAnswerSubmitted(false)
            setAnswersState({})
            setIsFinished(false)
          } else {
            console.error("Error fetching preloaded quiz:", quizError)
          }
        }

        // 2. Fetch courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("id, code, title, level")
          .order("code", { ascending: true })

        if (coursesError) throw coursesError

        if (active && coursesData) {
          // Sort courses: level match first, then alphabetically by code
          const sorted = [...(coursesData as Course[])].sort((a, b) => {
            const aMatch = a.level && currentLvl && String(a.level) === String(currentLvl)
            const bMatch = b.level && currentLvl && String(b.level) === String(currentLvl)
            if (aMatch && !bMatch) return -1
            if (!aMatch && bMatch) return 1
            return (a.code || "").localeCompare(b.code || "")
          })

          setCourses(sorted)
          if (sorted.length > 0) {
            setSelectedCourseId(sorted[0].id)
          }
        }

        // 3. Fetch past quiz attempts for this user
        const { data: attemptsData, error: attemptsError } = await supabase
          .from("quiz_attempts")
          .select(`
            id,
            quiz_id,
            score,
            total_questions,
            completed_at,
            quizzes (
              topic,
              format,
              courses (
                code,
                title
              )
            )
          `)
          .eq("user_id", session.user.id)
          .order("completed_at", { ascending: false })
          .limit(5)

        if (attemptsError) throw attemptsError

        if (active && attemptsData) {
          setAttempts(attemptsData as unknown as AttemptWithDetails[])
        }
      } catch (err) {
        console.error("Error loading initial quiz data:", err)
      } finally {
        if (active) {
          setLoadingInitial(false)
        }
      }
    }

    void init()

    return () => {
      active = false
    }
  }, [supabase])

  // Generate / Fetch Quiz Questions
  const handleGenerateQuiz = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedCourseId) return

    const topicToUse = customTopic.trim()

    try {
      setGenerating(true)
      setGenerationError(null)

      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: selectedCourseId,
          topic: topicToUse,
          format: selectedFormat,
          count: questionCount
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz. Please try again.")
      }

      setQuestions(data.questions)
      setActiveQuizId(data.quiz_id)
      setCurrentQuestionIndex(0)
      setSelectedAnswer(null)
      setTypedShortAnswer("")
      setIsAnswerSubmitted(false)
      setAnswersState({})
      setIsFinished(false)
    } catch (err: any) {
      console.error("Quiz generation error:", err)
      setGenerationError(err.message || "An unexpected error occurred while generating the quiz.")
    } finally {
      setGenerating(false)
    }
  }

  // Handle selecting an answer choice
  const handleSelectAnswer = (choice: string) => {
    if (isAnswerSubmitted) return
    setSelectedAnswer(choice)
  }

  // Submit single question answer
  const handleSubmitAnswer = () => {
    if (selectedFormat === "Short Answer") {
      if (!typedShortAnswer.trim() || isAnswerSubmitted) return
      setSelectedAnswer(typedShortAnswer)
      setIsAnswerSubmitted(true)
    } else {
      if (!selectedAnswer || isAnswerSubmitted) return

      const currentQuestion = questions[currentQuestionIndex]
      const isCorrect = selectedAnswer === currentQuestion.correct_answer

      setAnswersState((prev) => ({
        ...prev,
        [currentQuestionIndex]: {
          selected: selectedAnswer,
          correct: isCorrect,
        },
      }))

      setIsAnswerSubmitted(true)
    }
  }

  // Next question logic
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      const nextAnswer = answersState[currentQuestionIndex + 1]?.selected || null
      setSelectedAnswer(nextAnswer)
      setTypedShortAnswer(selectedFormat === "Short Answer" ? (nextAnswer || "") : "")
      setIsAnswerSubmitted(nextAnswer !== null)
    } else {
      // Calculate total score & complete quiz
      handleFinishQuiz()
    }
  }

  // Finish quiz and save attempt record to Supabase
  const handleFinishQuiz = async () => {
    setIsFinished(true)
    if (!activeQuizId || !userSession?.user?.id) return

    const score = Object.values(answersState).filter((a) => a.correct).length

    try {
      setSavingAttempt(true)
      const { data: newAttempt, error } = await supabase
        .from("quiz_attempts")
        .insert({
          user_id: userSession.user.id,
          quiz_id: activeQuizId,
          score: score,
          total_questions: questions.length
        })
        .select(`
          id,
          quiz_id,
          score,
          total_questions,
          completed_at,
          quizzes (
            topic,
            format,
            courses (
              code,
              title
            )
          )
        `)
        .single()

      if (error) throw error

      if (newAttempt) {
        setAttempts((prev) => [newAttempt as unknown as AttemptWithDetails, ...prev].slice(0, 5))
      }
    } catch (err) {
      console.error("Failed to save quiz attempt:", err)
    } finally {
      setSavingAttempt(false)
    }
  }

  // Reset quiz states and go back to selection screen
  const handleBackToSetup = () => {
    setActiveQuizId(null)
    setQuestions([])
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setTypedShortAnswer("")
    setIsAnswerSubmitted(false)
    setAnswersState({})
    setIsFinished(false)
    setGenerationError(null)
  }

  // Render stats
  const totalAttemptsCount = attempts.length
  const avgAccuracy = attempts.length > 0
    ? Math.round((attempts.reduce((sum, item) => sum + (item.score / item.total_questions), 0) / attempts.length) * 100)
    : 0

  const highestScore = attempts.length > 0
    ? Math.max(...attempts.map(a => Math.round((a.score / a.total_questions) * 100)))
    : 0

  const totalQuestionsAnswered = attempts.reduce((sum, item) => sum + item.total_questions, 0)

  if (loadingInitial) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Initializing MedHaven Quiz Portal...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="AI Quizzes" description="Redesigned interactive revision system with multiple high-yield clinical formats, powered by Groq.">
        {activeQuizId && (
          <Button variant="outline" size="sm" onClick={handleBackToSetup} className="flex items-center gap-1.5 transition-all">
            <ArrowLeft className="size-4" /> Exit Portal
          </Button>
        )}
      </PageHeader>

      {/* Overview stats visible on selection or review screens */}
      {!activeQuizId && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Quizzes Taken" value={String(totalAttemptsCount)} icon={ListChecks} accent="primary" />
          <StatCard label="Avg. Accuracy" value={`${avgAccuracy}%`} icon={Target} accent="secondary" />
          <StatCard label="Best Score" value={`${highestScore}%`} icon={Star} accent="accent" />
          <StatCard label="Qs Answered" value={String(totalQuestionsAnswered)} icon={CircleCheck} accent="warning" />
        </section>
      )}

      {/* QUIZ PORTAL WORKSPACE */}
      {activeQuizId ? (
        // Quiz interactive execution
        <div className="mx-auto w-full max-w-3xl">
          {!isFinished ? (
            // Quiz taking mode
            <Card className="shadow-xl border-primary/25 overflow-hidden transition-all duration-300">
              <CardHeader className="border-b bg-muted/40 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary text-xs font-bold px-2 py-0.5">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] py-0 px-2 font-semibold">
                      {selectedFormat}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    Progress: {Math.round(((currentQuestionIndex) / questions.length) * 100)}%
                  </span>
                </div>
                <h3 className="pt-4 font-semibold text-base sm:text-lg text-foreground leading-snug">
                  {questions[currentQuestionIndex].question}
                </h3>
              </CardHeader>

              <CardContent className="pt-6 flex flex-col gap-4">
                {selectedFormat === "Short Answer" ? (
                  // SHORT ANSWER MODE
                  <div className="flex flex-col gap-4">
                    {!isAnswerSubmitted ? (
                      <div className="flex flex-col gap-2">
                        <label htmlFor="sa-response" className="text-xs font-semibold text-muted-foreground">
                          Type Your Response:
                        </label>
                        <textarea
                          id="sa-response"
                          rows={4}
                          value={typedShortAnswer}
                          onChange={(e) => setTypedShortAnswer(e.target.value)}
                          placeholder="Formulate your diagnostic theory, visual findings, key keywords, or treatment plans here..."
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                        {/* Student Response Display */}
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Your Diagnostic Response:</p>
                          <p className="text-sm font-medium text-foreground italic leading-relaxed">
                            "{typedShortAnswer || "[No response submitted]"}"
                          </p>
                        </div>

                        {/* Official Correct Answer / Rubric */}
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                          <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Model Answer & Key Terms</p>
                          <p className="text-sm font-semibold text-foreground leading-relaxed">
                            {questions[currentQuestionIndex].correct_answer}
                          </p>
                        </div>

                        {/* Grading Explanation */}
                        <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Clinical Evaluation Rubric</p>
                          <p className="text-sm text-foreground leading-relaxed">
                            {questions[currentQuestionIndex].explanation}
                          </p>
                        </div>

                        {/* Interactive Self-Evaluation controls */}
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col items-center gap-2.5 text-center">
                          <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Self-Grading Check</p>
                          <p className="text-xs text-muted-foreground max-w-md">
                            Compare your rationales with the model answer above. Did your diagnosis match the core clinical criteria?
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAnswersState((prev) => ({
                                  ...prev,
                                  [currentQuestionIndex]: { selected: typedShortAnswer, correct: false }
                                }))
                              }}
                              className={`border-destructive text-destructive hover:bg-destructive/10 gap-1.5 px-4 h-8 text-xs font-semibold ${
                                answersState[currentQuestionIndex] !== undefined && !answersState[currentQuestionIndex].correct
                                  ? "bg-destructive/20 ring-1 ring-destructive"
                                  : ""
                              }`}
                            >
                              <X className="size-3.5" /> Mark Incorrect
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAnswersState((prev) => ({
                                  ...prev,
                                  [currentQuestionIndex]: { selected: typedShortAnswer, correct: true }
                                }))
                              }}
                              className={`border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 gap-1.5 px-4 h-8 text-xs font-semibold ${
                                answersState[currentQuestionIndex]?.correct
                                  ? "bg-emerald-500/20 ring-1 ring-emerald-500"
                                  : ""
                              }`}
                            >
                              <Check className="size-3.5" /> Mark Correct
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // MULTIPLE CHOICE / SBA / PICTURE / STEEPLECHASE MODES
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3">
                      {questions[currentQuestionIndex].options.map((option, idx) => {
                        const isSelected = selectedAnswer === option
                        const isCorrectChoice = option === questions[currentQuestionIndex].correct_answer

                        let buttonStyle = "border border-border bg-card text-foreground hover:border-primary/40 text-left transition-all justify-start py-4 px-4 h-auto block w-full whitespace-normal"

                        if (isAnswerSubmitted) {
                          if (isSelected && isCorrectChoice) {
                            buttonStyle = "border-2 border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-50 text-left justify-start py-4 px-4 h-auto block w-full whitespace-normal font-medium"
                          } else if (isSelected && !isCorrectChoice) {
                            buttonStyle = "border-2 border-destructive bg-destructive/10 text-destructive-950 dark:text-destructive-50 text-left justify-start py-4 px-4 h-auto block w-full whitespace-normal"
                          } else if (isCorrectChoice) {
                            buttonStyle = "border-2 border-emerald-500/60 bg-emerald-500/5 text-emerald-950 dark:text-emerald-50 text-left justify-start py-4 px-4 h-auto block w-full whitespace-normal font-medium"
                          } else {
                            buttonStyle = "border border-border bg-card/40 opacity-60 text-muted-foreground text-left justify-start py-4 px-4 h-auto block w-full whitespace-normal"
                          }
                        } else if (isSelected) {
                          buttonStyle = "border-2 border-primary bg-primary/5 text-primary-950 dark:text-primary-50 text-left justify-start py-4 px-4 h-auto block w-full whitespace-normal font-medium"
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectAnswer(option)}
                            disabled={isAnswerSubmitted}
                            className={`rounded-xl text-sm leading-relaxed cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${buttonStyle}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="flex-1">{option}</span>
                              {isAnswerSubmitted && isCorrectChoice && (
                                <CheckCircle2 className="size-5 text-emerald-500 shrink-0 self-center" />
                              )}
                              {isAnswerSubmitted && isSelected && !isCorrectChoice && (
                                <XCircle className="size-5 text-destructive shrink-0 self-center" />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* Explanations block */}
                    {isAnswerSubmitted ? (
                      <div className="mt-4 rounded-xl border border-primary/10 bg-primary/5 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2 mb-2">
                          <HelpCircle className="size-5 text-primary shrink-0" />
                          <p className="font-semibold text-sm text-primary">Explanation & Rationales</p>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {questions[currentQuestionIndex].explanation || "No explanation provided for this question."}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Lower Action buttons */}
                <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                  <Button variant="ghost" size="sm" onClick={handleBackToSetup} className="text-muted-foreground">
                    Exit Quiz
                  </Button>

                  {selectedFormat === "Short Answer" ? (
                    !isAnswerSubmitted ? (
                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={!typedShortAnswer.trim()}
                        className="px-6 py-2"
                      >
                        Submit Response
                      </Button>
                    ) : (
                      answersState[currentQuestionIndex] !== undefined && (
                        <Button
                          onClick={handleNextQuestion}
                          className="px-6 py-2 flex items-center gap-1.5"
                        >
                          {currentQuestionIndex < questions.length - 1 ? (
                            <>Next Question <ChevronRight className="size-4" /></>
                          ) : (
                            <>Finish & Save Result <Award className="size-4" /></>
                          )}
                        </Button>
                      )
                    )
                  ) : (
                    !isAnswerSubmitted ? (
                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={!selectedAnswer}
                        className="px-6 py-2"
                      >
                        Check Answer
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNextQuestion}
                        className="px-6 py-2 flex items-center gap-1.5"
                      >
                        {currentQuestionIndex < questions.length - 1 ? (
                          <>Next Question <ChevronRight className="size-4" /></>
                        ) : (
                          <>Finish & Save Result <Award className="size-4" /></>
                        )}
                      </Button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            // Quiz completed review mode
            <Card className="shadow-xl border-emerald-500/20 overflow-hidden">
              <div className="h-2 bg-emerald-500" />
              <CardHeader className="text-center pb-2 pt-6">
                <div className="flex justify-center mb-3">
                  <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <Award className="size-8" />
                  </span>
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">Quiz Completed!</CardTitle>
                <CardDescription className="text-sm">
                  Review your score summary below. Your progress has been logged.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 flex flex-col gap-6">
                <div className="grid gap-4 sm:grid-cols-2 text-center">
                  <div className="rounded-xl border bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Your Score</p>
                    <p className="text-3xl font-extrabold text-foreground">
                      {Object.values(answersState).filter((a) => a.correct).length} / {questions.length}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Accuracy</p>
                    <p className="text-3xl font-extrabold text-foreground">
                      {Math.round((Object.values(answersState).filter((a) => a.correct).length / questions.length) * 100)}%
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="font-semibold text-sm text-foreground">Question-by-Question breakdown:</p>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {questions.map((q, idx) => {
                      const ans = answersState[idx]
                      return (
                        <div key={idx} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                          <span className="truncate pr-4 text-muted-foreground font-medium flex-1">
                            {idx + 1}. {q.question}
                          </span>
                          <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                            ans?.correct
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-destructive/10 text-destructive"
                          }`}>
                            {ans?.correct ? "CORRECT" : "INCORRECT"}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 border-t border-border pt-4 mt-2">
                  <Button variant="outline" onClick={handleBackToSetup} className="w-full sm:w-auto">
                    Take Another Quiz
                  </Button>
                  <Button onClick={handleGenerateQuiz} disabled={generating} className="w-full sm:w-auto flex-1">
                    {generating ? (
                      <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Regenerating...</span>
                    ) : (
                      "Retry Same Quiz"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Quiz generation Setup UI
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Custom generation panel */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <Card className="border-primary/10 shadow-sm overflow-hidden">
              <div className="h-1 bg-primary" />
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="size-4.5 animate-pulse" />
                  </span>
                  <div>
                    <CardTitle className="text-base">Premium AI Quiz Generator</CardTitle>
                    <CardDescription>Configure and generate customized high-yield questions instantly.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateQuiz} className="flex flex-col gap-6">

                  {/* SELECT FORMAT CARDS */}
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-semibold text-muted-foreground">Select Format</span>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {formats.map((fmt) => {
                        const Icon = fmt.icon
                        const selected = selectedFormat === fmt.id
                        return (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => setSelectedFormat(fmt.id as any)}
                            className={`group text-left border rounded-xl p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-sm cursor-pointer flex flex-col gap-2.5 justify-between ${
                              selected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border bg-card hover:border-primary/40"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`flex size-8 items-center justify-center rounded-lg ${fmt.bg} ${fmt.color}`}>
                                <Icon className="size-4.5" />
                              </span>
                              <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                {fmt.id}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                              {fmt.desc}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* SELECT QUESTION COUNT */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Number of Questions</span>
                    <div className="flex items-center gap-2">
                      {[5, 10, 15].map((val) => {
                        const active = questionCount === val
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setQuestionCount(val)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              active
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-muted-foreground border-input hover:text-foreground hover:border-primary/40"
                            }`}
                          >
                            {val} Questions
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Select Course */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="course-select" className="text-xs font-semibold text-muted-foreground">
                      Target Course {userLevel && `(Matching level ${userLevel} sorted first)`}
                    </label>
                    <select
                      id="course-select"
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {courses.length === 0 ? (
                        <option value="">No courses found</option>
                      ) : (
                        courses.map((course) => {
                          const isMatch = course.level && userLevel && String(course.level) === String(userLevel)
                          return (
                            <option key={course.id} value={course.id}>
                              {course.code ? `${course.code}: ` : ""}{course.title || "Unknown Subject"} {isMatch ? "⭐" : ""}
                            </option>
                          )
                        })
                      )}
                    </select>
                  </div>

                  {/* Input Custom Topic */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="topic-input" className="text-xs font-semibold text-muted-foreground">
                      Custom Topic (Optional)
                    </label>
                    <Input
                      id="topic-input"
                      type="text"
                      placeholder="e.g. G-protein receptors, Lobar pneumonia (leave blank for general high-yield review)"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                    />
                  </div>

                  {/* Display suggestions */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">High-Yield Suggestions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedTopics.map((topic) => (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => setCustomTopic(topic)}
                          className="text-xs border px-2.5 py-1 rounded-full bg-muted/30 text-foreground hover:bg-primary/5 hover:border-primary/40 transition-colors"
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Error display */}
                  {generationError && (
                    <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-xs p-3 rounded-lg border border-destructive/20 font-medium">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Generation Failed: </span>
                        {generationError}
                      </div>
                    </div>
                  )}

                  {generating ? (
                    <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-primary/5 border-primary/10 gap-3 text-center">
                      <Loader2 className="size-8 animate-spin text-primary" />
                      <p className="text-sm font-semibold text-foreground">{loaderMessages[loaderMessageIndex]}</p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Generating premium {selectedFormat} questions. This may take up to 30 seconds for non-cached topics.
                      </p>
                    </div>
                  ) : (
                    <Button
                      type="submit"
                      className="w-full mt-2 font-semibold flex items-center justify-center gap-2 py-5"
                      disabled={courses.length === 0}
                    >
                      Build {selectedFormat} Quiz with AI <Sparkles className="size-4.5" />
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Explanatory notes of the system */}
            <Card className="border-border/60 bg-muted/20">
              <CardContent className="pt-5 flex flex-col gap-3 text-xs leading-relaxed text-muted-foreground">
                <div className="flex items-center gap-2 font-bold text-foreground text-sm mb-1">
                  <BookOpen className="size-4 text-primary" />
                  Premium Medical Quiz Options:
                </div>
                <p>
                  1. <strong>Clinical Alignment</strong>: Quizzes are generated using llama-3.1-8b-instant models tuned specifically for national medical board structures.
                </p>
                <p>
                  2. <strong>Adaptive Format Constraints</strong>: Selection dynamically reformulates the LLM's prompt parameters—Short Answer prompts bypass options completely while Picture Tests contextualize diagnostic image reasoning.
                </p>
                <p>
                  3. <strong>Level-Aware Caching</strong>: Default course quizzes are cached and shared across everyone in your student level instantly to minimize API latency.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Past History attempt list column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Card className="h-full border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="size-4 text-secondary" />
                  Recent Quiz Activity
                </CardTitle>
                <CardDescription>Your 5 most recent quiz submissions.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {attempts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed rounded-xl text-muted-foreground">
                    <ListChecks className="size-8 text-muted-foreground/40 mb-2" />
                    <p className="text-xs font-semibold text-foreground">No recent attempts logged</p>
                    <p className="text-[10px] max-w-[200px] mt-1 leading-normal">
                      Complete your first AI-generated quiz to view progress tracking and accuracy logs here.
                    </p>
                  </div>
                ) : (
                  attempts.map((att) => {
                    const pct = Math.round((att.score / att.total_questions) * 100)
                    const title = att.quizzes?.topic || "Custom Quiz"
                    const courseText = att.quizzes?.courses
                      ? `${att.quizzes.courses.code || ""} · `
                      : ""
                    const formatText = att.quizzes?.format ? ` [${att.quizzes.format}]` : ""
                    const dateFormatted = new Date(att.completed_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })

                    return (
                      <div key={att.id} className="flex flex-col gap-1.5 rounded-xl border border-border p-3 hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-bold text-foreground max-w-[75%]" title={title + formatText}>
                            {title}{formatText}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            pct >= 80
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : pct >= 50
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-destructive/10 text-destructive"
                          }`}>
                            {pct}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                          <span>{courseText}{att.score}/{att.total_questions} Qs</span>
                          <span>{dateFormatted}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
