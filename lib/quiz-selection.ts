import { SupabaseClient } from "@supabase/supabase-js"
import { QuizFormat, ValidatedQuestion } from "./quiz-types"
import { validateQuestion } from "./quiz-validator"

export interface FetchBankQuestionsOptions {
  supabase: SupabaseClient
  courseId: string
  topic?: string | null
  subtopic?: string | null
  format?: QuizFormat | null
  requestedCount: number // strictly 5 or 10
  userId?: string | null
}

export interface FetchBankQuestionsResult {
  questions: ValidatedQuestion[]
  fallbackUsed: boolean
  fallbackNotice: string | null
}

export async function fetchBankQuestions({
  supabase,
  courseId,
  topic,
  subtopic,
  format,
  requestedCount,
  userId,
}: FetchBankQuestionsOptions): Promise<FetchBankQuestionsResult> {
  const normTopic = topic && topic.trim() !== "" ? topic.trim() : null
  const normSubtopic = subtopic && subtopic.trim() !== "" ? subtopic.trim() : null
  const normFormat = format && ["MCQ", "SBA", "Short Answer", "OSCE"].includes(format) ? format : null

  // 1. Fetch user question history IDs to deprioritize
  let historyQuestionIds: Set<string> = new Set()
  if (userId) {
    const { data: historyData } = await supabase
      .from("user_question_history")
      .select("question_id")
      .eq("user_id", userId)
      .limit(500)

    if (historyData) {
      historyData.forEach((row: any) => {
        if (row.question_id) historyQuestionIds.add(row.question_id)
      })
    }
  }

  // Helper to query question_bank
  async function queryBank(builderFn: (query: any) => any): Promise<ValidatedQuestion[]> {
    let query = supabase
      .from("question_bank")
      .select(`
        id,
        course_id,
        topic,
        subtopic,
        format,
        question_text,
        options,
        correct_answer,
        explanation,
        tf_options,
        sub_questions,
        image_bank_id,
        difficulty,
        high_yield_weight,
        provenance,
        question_fingerprint,
        status
      `)
      .eq("status", "active")
      .eq("course_id", courseId)

    query = builderFn(query)

    const { data, error } = await query
    if (error || !data) {
      console.error("[quiz-selection] DB Query error:", error)
      return []
    }

    const validated: ValidatedQuestion[] = []
    for (const raw of data) {
      const v = validateQuestion(raw, normFormat || undefined)
      if (v) validated.push(v)
    }
    return validated
  }

  const selectedQuestions: ValidatedQuestion[] = []
  const seenFingerprints: Set<string> = new Set()
  const seenIds: Set<string> = new Set()

  function addCandidates(candidates: ValidatedQuestion[], preferUnanswered: boolean) {
    // Sort candidates by history status first, then by high_yield_weight
    const sorted = [...candidates].sort((a, b) => {
      const aSeen = a.id ? historyQuestionIds.has(a.id) : false
      const bSeen = b.id ? historyQuestionIds.has(b.id) : false

      if (preferUnanswered && aSeen !== bSeen) {
        return aSeen ? 1 : -1 // Unseen first
      }

      const weightA = a.high_yield_weight || 1.0
      const weightB = b.high_yield_weight || 1.0
      return weightB - weightA
    })

    for (const q of sorted) {
      if (selectedQuestions.length >= requestedCount) break

      const fp = q.question_fingerprint || `${q.format}:${q.question_text}`
      if (seenFingerprints.has(fp)) continue
      if (q.id && seenIds.has(q.id)) continue

      seenFingerprints.add(fp)
      if (q.id) seenIds.add(q.id)
      selectedQuestions.push({
        ...q,
        provenance: q.provenance || { source_type: "local_bank" },
      })
    }
  }

  let fallbackUsed = false
  let fallbackNotice: string | null = null

  // HIERARCHY LEVEL 1: Exact Topic (+ Subtopic) & Format
  if (normTopic) {
    const l1Candidates = await queryBank((q) => {
      let b = q.ilike("topic", normTopic)
      if (normSubtopic) b = b.ilike("subtopic", normSubtopic)
      if (normFormat) b = b.eq("format", normFormat)
      return b
    })

    addCandidates(l1Candidates, true)
    if (selectedQuestions.length < requestedCount && l1Candidates.length > 0) {
      // Re-try adding seen candidates if we preferUnanswered earlier
      addCandidates(l1Candidates, false)
    }
  }

  // HIERARCHY LEVEL 2: Exact Topic without Format restriction (or format matched without subtopic)
  if (selectedQuestions.length < requestedCount && normTopic) {
    fallbackUsed = true
    const l2Candidates = await queryBank((q) => {
      let b = q.ilike("topic", normTopic)
      if (normFormat) b = b.eq("format", normFormat)
      return b
    })
    addCandidates(l2Candidates, true)
    addCandidates(l2Candidates, false)
  }

  // HIERARCHY LEVEL 3: Related Topics / Subtopics in the same course
  if (selectedQuestions.length < requestedCount) {
    fallbackUsed = true
    const l3Candidates = await queryBank((q) => {
      let b = q
      if (normFormat) b = b.eq("format", normFormat)
      return b.limit(100)
    })
    addCandidates(l3Candidates, true)
    addCandidates(l3Candidates, false)
  }

  // HIERARCHY LEVEL 4: Broad Course Fallback (any format if requested format ran out)
  if (selectedQuestions.length < requestedCount) {
    fallbackUsed = true
    const l4Candidates = await queryBank((q) => q.limit(100))
    addCandidates(l4Candidates, true)
    addCandidates(l4Candidates, false)
  }

  if (selectedQuestions.length === 0) {
    fallbackNotice = "There aren't enough validated questions available for this topic yet. Try Practice mode with a broader topic or try AI Quiz again later."
  } else if (selectedQuestions.length < requestedCount) {
    fallbackNotice = `Only ${selectedQuestions.length} validated question(s) are available for this topic.`
  } else if (fallbackUsed && normTopic) {
    fallbackNotice = `Included questions from related concepts in this course to complete your ${requestedCount}-question quiz.`
  }

  return {
    questions: selectedQuestions,
    fallbackUsed,
    fallbackNotice,
  }
}
