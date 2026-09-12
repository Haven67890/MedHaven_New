import { createHash } from "crypto"

export interface SelectionParams {
  userId: string
  courseId: string
  topic?: string
  format: "MCQ" | "SBA" | "OSCE" | "Short Answer"
  count: number
}

export interface ValidatedQuestion {
  id: string
  course_id: string
  topic: string
  subtopic?: string | null
  format: string
  question_text: string
  options: string[]
  correct_answer: string
  explanation: string
  tf_options?: any
  sub_questions?: any
  image_bank_id?: string | null
  difficulty: string
  high_yield_weight: number
  question_hash?: string | null
  quiz_image_bank?: any
}

export function generateQuestionHash(questionText: string, format: string): string {
  const normalized = `${format.toUpperCase()}:${questionText.trim().toLowerCase().replace(/\s+/g, " ")}`
  return createHash("sha256").update(normalized).digest("hex")
}

export function validateQuestionStructure(q: any, format: string): boolean {
  if (!q || !q.question_text || typeof q.question_text !== "string" || !q.question_text.trim()) {
    return false
  }

  if (format === "SBA") {
    if (!Array.isArray(q.options) || q.options.length < 2) return false
    const cleanOptions = q.options.map((opt: any) => String(opt).trim())
    if (cleanOptions.length !== 4) return false
    if (!q.correct_answer || typeof q.correct_answer !== "string") return false
    const match = cleanOptions.includes(q.correct_answer.trim())
    if (!match) return false
    return true
  }

  if (format === "MCQ") {
    if (!Array.isArray(q.tf_options) || q.tf_options.length === 0) return false
    return q.tf_options.every(
      (tf: any) => tf && typeof tf.statement === "string" && tf.statement.trim() && typeof tf.answer === "boolean"
    )
  }

  if (format === "Short Answer") {
    return Boolean(q.correct_answer && typeof q.correct_answer === "string" && q.correct_answer.trim())
  }

  if (format === "OSCE") {
    if (!Array.isArray(q.sub_questions) || q.sub_questions.length === 0) return false
    return q.sub_questions.every(
      (sq: any) =>
        sq &&
        typeof sq.question === "string" &&
        sq.question.trim() &&
        ((typeof sq.expected_answer === "string" && sq.expected_answer.trim()) ||
          (typeof sq.answer === "string" && sq.answer.trim()))
    )
  }

  return false
}

export async function selectQuizQuestions(
  supabase: any,
  params: SelectionParams
): Promise<{ questions: ValidatedQuestion[]; blueprint: any | null }> {
  const { userId, courseId, topic, format, count } = params
  const requestedCount = Math.max(1, count)
  const cleanTopic = topic && topic.trim() ? topic.trim() : ""

  // 1. Fetch relevant blueprint if exists
  let blueprint: any = null
  if (cleanTopic) {
    const { data: bpData } = await supabase
      .from("course_blueprints")
      .select("*")
      .eq("course_id", courseId)
      .ilike("topic", cleanTopic)
      .maybeSingle()
    blueprint = bpData || null
  }

  // 2. Query active question bank for course & format
  const { data: bankData, error: bankError } = await supabase
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
      question_hash,
      status,
      quiz_image_bank (
        id,
        title,
        category,
        image_url,
        correct_findings,
        differential_diagnosis
      )
    `)
    .eq("course_id", courseId)
    .eq("format", format)
    .eq("status", "active")

  if (bankError) {
    console.error("Error querying question_bank:", bankError)
  }

  const allActiveCandidates = (bankData || []).filter((q: any) => validateQuestionStructure(q, format))

  if (allActiveCandidates.length === 0) {
    return { questions: [], blueprint }
  }

  // 3. Score & Categorize Candidates by Topic Matching
  const exactMatches: ValidatedQuestion[] = []
  const subtopicMatches: ValidatedQuestion[] = []
  const broaderMatches: ValidatedQuestion[] = []

  const targetLower = cleanTopic.toLowerCase()

  for (const q of allActiveCandidates) {
    const qTopicLower = (q.topic || "").toLowerCase()
    const qSubLower = (q.subtopic || "").toLowerCase()

    if (cleanTopic && qTopicLower === targetLower) {
      exactMatches.push(q)
    } else if (cleanTopic && (qTopicLower.includes(targetLower) || targetLower.includes(qTopicLower) || (qSubLower && qSubLower.includes(targetLower)))) {
      subtopicMatches.push(q)
    } else {
      broaderMatches.push(q)
    }
  }

  // 4. Query user attempt history for question IDs
  const candidateIds = allActiveCandidates.map((q: ValidatedQuestion) => q.id)
  let attemptedMap: Map<string, Date> = new Map()

  if (userId && candidateIds.length > 0) {
    const { data: historyData } = await supabase
      .from("user_question_history")
      .select("question_id, attempted_at")
      .eq("user_id", userId)
      .in("question_id", candidateIds)

    if (historyData) {
      for (const h of historyData) {
        const prevDate = attemptedMap.get(h.question_id)
        const curDate = new Date(h.attempted_at || 0)
        if (!prevDate || curDate > prevDate) {
          attemptedMap.set(h.question_id, curDate)
        }
      }
    }
  }

  // Helper to split pool into unseen and seen, sorted by high_yield_weight DESC then oldest attempted
  const partitionAndSortPool = (pool: ValidatedQuestion[]) => {
    const unseen: ValidatedQuestion[] = []
    const seen: ValidatedQuestion[] = []

    for (const item of pool) {
      if (attemptedMap.has(item.id)) {
        seen.push(item)
      } else {
        unseen.push(item)
      }
    }

    // Sort unseen by high_yield_weight DESC, then random jitter for variety
    unseen.sort((a, b) => {
      const weightDiff = (b.high_yield_weight || 1.0) - (a.high_yield_weight || 1.0)
      if (weightDiff !== 0) return weightDiff
      return Math.random() - 0.5
    })

    // Sort seen by oldest attempted_at ASC so least recently seen questions repeat first
    seen.sort((a, b) => {
      const timeA = attemptedMap.get(a.id)?.getTime() || 0
      const timeB = attemptedMap.get(b.id)?.getTime() || 0
      if (timeA !== timeB) return timeA - timeB
      return Math.random() - 0.5
    })

    return { unseen, seen }
  }

  const selectedQuestions: ValidatedQuestion[] = []
  const selectedIds = new Set<string>()

  const poolsToProcess = [exactMatches, subtopicMatches, broaderMatches]

  for (const pool of poolsToProcess) {
    if (selectedQuestions.length >= requestedCount) break
    if (pool.length === 0) continue

    const { unseen, seen } = partitionAndSortPool(pool)

    // First take unseen from this pool
    for (const q of unseen) {
      if (selectedQuestions.length >= requestedCount) break
      if (!selectedIds.has(q.id)) {
        selectedIds.add(q.id)
        selectedQuestions.push(q)
      }
    }

    // Next take seen if needed from this pool
    for (const q of seen) {
      if (selectedQuestions.length >= requestedCount) break
      if (!selectedIds.has(q.id)) {
        selectedIds.add(q.id)
        selectedQuestions.push(q)
      }
    }
  }

  return { questions: selectedQuestions, blueprint }
}
