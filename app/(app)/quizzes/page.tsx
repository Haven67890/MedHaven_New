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
  AlertCircle
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

export default function AIQuizzesPage() {
  const supabase = createClient()

  // Data states
  const [courses, setCourses] = useState<Course[]>([])
  const [attempts, setAttempts] = useState<AttemptWithDetails[]>([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [userSession, setUserSession] = useState<any>(null)

  // Quiz creation states
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [customTopic, setCustomTopic] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Active quiz states
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false)
  const [answersState, setAnswersState] = useState<Record<number, { selected: string; correct: boolean }>>({})

  // Finish states
  const [isFinished, setIsFinished] = useState(false)
  const [savingAttempt, setSavingAttempt] = useState(false)

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

        // 2. Fetch courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("id, code, title, level")
          .order("code", { ascending: true })

        if (coursesError) throw coursesError

        if (active && coursesData) {
          setCourses(coursesData as Course[])
          if (coursesData.length > 0) {
            setSelectedCourseId(coursesData[0].id)
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

    const topicToUse = customTopic.trim() || suggestedTopics[0]

    try {
      setGenerating(true)
      setGenerationError(null)

      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: selectedCourseId,
          topic: topicToUse
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

  // Next question logic
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      const nextAnswer = answersState[currentQuestionIndex + 1]?.selected || null
      setSelectedAnswer(nextAnswer)
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
        <p className="text-sm text-muted-foreground">Initializing MedHaven Quiz Portal...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="AI Quizzes" description="Generate high-yield clinical & premed quizzes instantly using Llama 3.1 8B.">
        {activeQuizId && (
          <Button variant="outline" size="sm" onClick={handleBackToSetup} className="flex items-center gap-1">
            <ArrowLeft className="size-4" /> Reset Portal
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
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="border-b bg-muted/35 pb-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-primary/5 text-primary text-xs font-semibold px-2 py-0.5">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    Progress: {Math.round(((currentQuestionIndex) / questions.length) * 100)}%
                  </span>
                </div>
                <h3 className="pt-3 font-semibold text-lg text-foreground leading-snug">
                  {questions[currentQuestionIndex].question}
                </h3>
              </CardHeader>

              <CardContent className="pt-6 flex flex-col gap-4">
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
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
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

                {/* Submit / Explanations / Progress bar */}
                {isAnswerSubmitted ? (
                  <div className="mt-4 rounded-xl border border-primary/10 bg-primary/5 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="size-5 text-primary shrink-0" />
                      <p className="font-semibold text-sm text-primary">Explanation & Review</p>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {questions[currentQuestionIndex].explanation || "No explanation provided for this question."}
                    </p>
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                  <Button variant="ghost" size="sm" onClick={handleBackToSetup} className="text-muted-foreground">
                    Exit Quiz
                  </Button>

                  {!isAnswerSubmitted ? (
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
                      <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Retrying...</span>
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
          <div className="lg:col-span-7 flex flex-col gap-6">
            <Card className="border-primary/10 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="size-4.5 animate-pulse" />
                  </span>
                  <div>
                    <CardTitle className="text-base">AI Generator</CardTitle>
                    <CardDescription>Configure questions for any topic dynamically.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateQuiz} className="flex flex-col gap-4">
                  {/* Select Course */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="course-select" className="text-xs font-semibold text-muted-foreground">
                      Target Course
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
                        courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.code ? `${course.code}: ` : ""}{course.title || "Unknown Subject"}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Input Custom Topic */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="topic-input" className="text-xs font-semibold text-muted-foreground">
                      Custom Topic (e.g. "G-protein coupled receptors", "Lobar pneumonia")
                    </label>
                    <Input
                      id="topic-input"
                      type="text"
                      placeholder="Enter specific topic, or leave blank to use high-yield suggested topic"
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

                  <Button
                    type="submit"
                    className="w-full mt-2"
                    disabled={generating || courses.length === 0}
                  >
                    {generating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> Generating Quiz...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        Build Quiz with AI <Sparkles className="size-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Explanatory notes of the system */}
            <Card className="border-border/60 bg-muted/20">
              <CardContent className="pt-5 flex flex-col gap-3 text-xs leading-relaxed text-muted-foreground">
                <div className="flex items-center gap-2 font-semibold text-foreground text-sm mb-1">
                  <BookOpen className="size-4 text-primary" />
                  How AI-Generated Quizzes Work:
                </div>
                <p>
                  1. <strong>Strict Medical Alignment</strong>: The LLM model is instructed to match current curriculum themes for gross anatomy, pharmacology, cardiac physiology, and diagnostic clinical workflows.
                </p>
                <p>
                  2. <strong>Adaptive Learning Caching</strong>: Topics generated once are automatically cached for subsequent attempts across the student body, accelerating response speeds and optimizing API usage.
                </p>
                <p>
                  3. <strong>Immediate Explanations</strong>: Every choice displays a detailed rationale upon selection to provide instant feedback and target knowledge gaps immediately.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Past History attempt list column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
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
                    const dateFormatted = new Date(att.completed_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })

                    return (
                      <div key={att.id} className="flex flex-col gap-1.5 rounded-xl border border-border p-3 hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-bold text-foreground max-w-[70%]" title={title}>
                            {title}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            pct >= 80
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : pct >= 50
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-destructive/10 text-destructive"
                          }`}>
                            {pct}% Correct
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
