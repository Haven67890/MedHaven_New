"use client"

import { useEffect, useState } from "react"
import { Sparkles, Brain, RefreshCw, CheckCircle, Ban, Trash2, Plus, Target, Check, AlertCircle, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Course {
  id: string
  code?: string | null
  title?: string | null
}

interface Blueprint {
  id: string
  course_id: string
  topic: string
  high_yield_concepts: string[]
  exam_emphasis: string
  difficulty_patterns: string
  reasoning_patterns: string
  distractor_patterns: string
  format_styles: Record<string, string>
  sources_analyzed: any[]
  version?: number
  updated_at: string
}

interface QuestionItem {
  id: string
  course_id: string
  topic: string
  format: string
  difficulty: string
  question_text: string
  options: string[]
  correct_answer: string
  explanation: string
  status: "draft" | "validated" | "active" | "rejected"
  created_at: string
  courses?: { code: string; title: string }
}

export function QuizIntelligenceAdminSection({ courses }: { courses: Course[] }) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || "")
  const [topic, setTopic] = useState<string>("General")

  // Blueprint state
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null)
  const [loadingBlueprint, setLoadingBlueprint] = useState<boolean>(false)
  const [learningBlueprint, setLearningBlueprint] = useState<boolean>(false)

  // Question Generation state
  const [genFormat, setGenFormat] = useState<"MCQ" | "SBA" | "Short Answer" | "OSCE">("SBA")
  const [genCount, setGenCount] = useState<number>(5)
  const [generating, setGenerating] = useState<boolean>(false)

  // Bank Questions list & review state
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Load blueprint and bank questions whenever course or topic changes
  const loadBlueprint = async () => {
    if (!selectedCourseId) return
    setLoadingBlueprint(true)
    try {
      const res = await fetch(`/api/admin/quiz-intelligence/blueprint?course_id=${selectedCourseId}&topic=${encodeURIComponent(topic)}`)
      const data = await res.json()
      if (res.ok) {
        setBlueprint(data.blueprint || null)
      }
    } catch (err) {
      console.error("Failed to load blueprint:", err)
    } finally {
      setLoadingBlueprint(false)
    }
  }

  const loadQuestions = async () => {
    if (!selectedCourseId) return
    setLoadingQuestions(true)
    try {
      const params = new URLSearchParams({
        course_id: selectedCourseId,
        topic: topic === "General" ? "all" : topic,
        status: statusFilter,
      })
      const res = await fetch(`/api/admin/quiz-intelligence/questions?${params.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setQuestions(data.questions || [])
      }
    } catch (err) {
      console.error("Failed to load bank questions:", err)
    } finally {
      setLoadingQuestions(false)
    }
  }

  useEffect(() => {
    void loadBlueprint()
    void loadQuestions()
  }, [selectedCourseId, topic, statusFilter])

  // One-time Learn Exam Pattern trigger
  const handleLearnPattern = async () => {
    if (!selectedCourseId) return
    setLearningBlueprint(true)
    setActionError(null)
    try {
      const res = await fetch("/api/admin/quiz-intelligence/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: selectedCourseId,
          topic: topic.trim() || "General"
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to learn exam pattern")
      }
      setBlueprint(data.blueprint)
    } catch (err: any) {
      setActionError(err.message || "Blueprint learning failed")
    } finally {
      setLearningBlueprint(false)
    }
  }

  // Generate NEW candidates trigger
  const handleGenerateCandidates = async () => {
    if (!selectedCourseId) return
    setGenerating(true)
    setActionError(null)
    try {
      const res = await fetch("/api/admin/quiz-intelligence/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: selectedCourseId,
          topic: topic.trim() || "General",
          format: genFormat,
          count: genCount,
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate candidates")
      }
      void loadQuestions()
    } catch (err: any) {
      setActionError(err.message || "Candidate generation failed")
    } finally {
      setGenerating(false)
    }
  }

  // Approve / Activate or Reject Question
  const handleUpdateStatus = async (id: string, newStatus: "active" | "rejected" | "draft") => {
    try {
      const res = await fetch("/api/admin/quiz-intelligence/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus })
      })
      if (res.ok) {
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q))
      }
    } catch (err) {
      console.error("Failed to update status:", err)
    }
  }

  // Delete Question
  const handleDeleteQuestion = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/quiz-intelligence/questions?id=${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        setQuestions(prev => prev.filter(q => q.id !== id))
      }
    } catch (err) {
      console.error("Failed to delete question:", err)
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* HEADER CONTROL PANEL */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="size-5 text-primary" /> Exam Blueprint & Quiz Intelligence Pipeline
          </CardTitle>
          <CardDescription>
            One-time exam pattern learning derived from past questions and course material. Generates persistent blueprints to populate the active question bank.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Select Course</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code || "Course"}: {course.title || "Untitled Subject"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Topic Focus</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. General or Lower GIT Radiology"
              className="h-10 text-sm"
            />
          </div>

          <div className="flex flex-col justify-end">
            <Button
              onClick={handleLearnPattern}
              disabled={learningBlueprint || !selectedCourseId}
              className="h-10 font-semibold gap-2"
            >
              {learningBlueprint ? (
                <><RefreshCw className="size-4 animate-spin" /> Learning Pattern...</>
              ) : (
                <><Sparkles className="size-4 text-amber-300" /> Learn Exam Pattern</>
              )}
            </Button>
          </div>

          <div className="flex flex-col justify-end">
            <div className="p-2 border rounded-lg bg-muted/20 text-xs flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Blueprint Status:</span>
              <Badge variant={blueprint ? "default" : "outline"} className="capitalize">
                {blueprint ? "Learned (v" + (blueprint.version || 1) + ")" : "Not Learned"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {actionError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-center gap-2 font-medium">
          <AlertCircle className="size-4 shrink-0" />
          {actionError}
        </div>
      )}

      {/* BLUEPRINT DISPLAY CARD */}
      {blueprint && (
        <Card className="border-primary/20 bg-primary/5 shadow-xs">
          <CardHeader className="pb-3 border-b border-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="size-5 text-primary" />
                <CardTitle className="text-base">Stored Exam Blueprint — {blueprint.topic}</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                Updated: {new Date(blueprint.updated_at).toLocaleDateString()}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs leading-relaxed">
            <div className="space-y-1">
              <span className="font-bold text-foreground uppercase tracking-wider block">High-Yield Concepts</span>
              <div className="flex flex-wrap gap-1">
                {(blueprint.high_yield_concepts || []).map((c, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-foreground uppercase tracking-wider block">Exam Emphasis & Reasoning</span>
              <p className="text-muted-foreground">{blueprint.exam_emphasis}</p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-foreground uppercase tracking-wider block">Distractor & Trap Patterns</span>
              <p className="text-muted-foreground">{blueprint.distractor_patterns}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QUESTION GENERATION CONTROL PANEL */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="size-4 text-primary" /> Generate Draft Candidates
          </CardTitle>
          <CardDescription>
            Use the stored Exam Blueprint to generate new candidate questions. Generated questions are stored in Draft state for admin review.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Format:</span>
            <select
              value={genFormat}
              onChange={(e) => setGenFormat(e.target.value as any)}
              className="h-9 text-xs rounded-md border border-input bg-background px-3"
            >
              <option value="SBA">SBA (Single Best Answer)</option>
              <option value="MCQ">MCQ (Multiple True/False)</option>
              <option value="Short Answer">Short Answer</option>
              <option value="OSCE">OSCE Station</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Quantity:</span>
            <select
              value={genCount}
              onChange={(e) => setGenCount(parseInt(e.target.value, 10))}
              className="h-9 text-xs rounded-md border border-input bg-background px-3"
            >
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions</option>
            </select>
          </div>

          <Button
            onClick={handleGenerateCandidates}
            disabled={generating || !selectedCourseId}
            size="sm"
            className="font-semibold gap-1.5"
          >
            {generating ? (
              <><RefreshCw className="size-3.5 animate-spin" /> Generating Candidates...</>
            ) : (
              <><Sparkles className="size-3.5" /> Generate Candidates</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* QUESTION BANK REVIEW & ACTIVATION TABLE */}
      <Card className="border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Question Bank Candidate Review</CardTitle>
            <CardDescription>
              Review draft questions, inspect structural integrity, and approve them into the active question bank.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs rounded-md border border-input bg-background px-3"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft Only</option>
              <option value="active">Active Only</option>
              <option value="rejected">Rejected Only</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Question Stem</th>
                  <th className="p-4">Format</th>
                  <th className="p-4">Options / Structure</th>
                  <th className="p-4">Correct Key</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {loadingQuestions ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading candidate questions...
                    </td>
                  </tr>
                ) : questions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No questions found matching selected filter.
                    </td>
                  </tr>
                ) : (
                  questions.map((q) => (
                    <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 max-w-xs">
                        <div className="font-semibold text-foreground truncate" title={q.question_text}>
                          {q.question_text}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate" title={q.explanation}>
                          {q.explanation}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-[10px]">
                          {q.format}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {Array.isArray(q.options) && q.options.length > 0 ? (
                          <span>{q.options.length} choices</span>
                        ) : (
                          <span>Structured</span>
                        )}
                      </td>
                      <td className="p-4 text-xs font-semibold text-foreground max-w-[150px] truncate" title={q.correct_answer}>
                        {q.correct_answer}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            q.status === "active"
                              ? "default"
                              : q.status === "rejected"
                                ? "destructive"
                                : "outline"
                          }
                          className="capitalize"
                        >
                          {q.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {q.status !== "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Approve / Make Active"
                              onClick={() => handleUpdateStatus(q.id, "active")}
                              className="h-8 px-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                            >
                              <Check className="size-4" />
                            </Button>
                          )}
                          {q.status === "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Move to Draft"
                              onClick={() => handleUpdateStatus(q.id, "draft")}
                              className="h-8 px-2 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                            >
                              <Ban className="size-4" />
                            </Button>
                          )}
                          {q.status !== "rejected" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Reject Candidate"
                              onClick={() => handleUpdateStatus(q.id, "rejected")}
                              className="h-8 px-2 text-slate-500 hover:text-slate-600 hover:bg-slate-500/10"
                            >
                              <Ban className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="h-8 px-2 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
