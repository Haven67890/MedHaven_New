import crypto from "crypto"
import { QuizFormat, ValidatedQuestion, TFStatement, SubQuestion } from "./quiz-types"

export function generateQuestionFingerprint(questionText: string, options?: string[] | null, format?: string): string {
  const normText = questionText.toLowerCase().replace(/\s+/g, " ").trim()
  const normOptions = (options || []).map(o => o.toLowerCase().replace(/\s+/g, " ").trim()).sort().join("|")
  const normFormat = (format || "").toLowerCase().trim()
  const payload = `${normFormat}:${normText}:${normOptions}`
  return crypto.createHash("sha256").update(payload).digest("hex")
}

export function validateQuestion(q: any, expectedFormat?: QuizFormat): ValidatedQuestion | null {
  if (!q || typeof q !== "object") return null

  const format: QuizFormat = (q.format || expectedFormat || "SBA") as QuizFormat
  if (!["MCQ", "SBA", "Short Answer", "OSCE"].includes(format)) return null

  const questionText = String(q.question_text || q.question || "").trim()
  if (!questionText) return null

  const topic = String(q.topic || "General").trim()
  const subtopic = q.subtopic ? String(q.subtopic).trim() : null
  const explanation = q.explanation ? String(q.explanation).trim() : "No detailed explanation provided."

  if (format === "MCQ") {
    // MCQ expects an array of T/F statements
    const tfRaw = q.tf_options || q.tfOptions || q.statements
    if (!Array.isArray(tfRaw) || tfRaw.length === 0) return null

    const validTfOptions: TFStatement[] = []
    for (const item of tfRaw) {
      if (!item || typeof item !== "object") continue
      const statement = String(item.statement || item.text || "").trim()
      if (!statement) continue
      const answer = Boolean(item.answer)
      validTfOptions.push({ statement, answer })
    }

    if (validTfOptions.length < 3) return null // Need at least 3 statements for a valid MCQ

    const summaryAnswer = validTfOptions
      .map((opt, idx) => `${String.fromCharCode(65 + idx)}: ${opt.answer ? "True" : "False"}`)
      .join(", ")

    const fingerprint = generateQuestionFingerprint(questionText, validTfOptions.map(t => t.statement), format)

    return {
      id: q.id,
      course_id: q.course_id,
      topic,
      subtopic,
      format: "MCQ",
      question_text: questionText,
      options: [],
      correct_answer: q.correct_answer ? String(q.correct_answer).trim() : summaryAnswer,
      explanation,
      tf_options: validTfOptions,
      sub_questions: null,
      image_bank_id: q.image_bank_id || null,
      difficulty: q.difficulty || "medium",
      high_yield_weight: q.high_yield_weight || 1.0,
      provenance: q.provenance || null,
      question_fingerprint: fingerprint,
      status: q.status || "active",
    }
  }

  if (format === "SBA") {
    let rawOptions: string[] = []
    if (Array.isArray(q.options)) {
      rawOptions = q.options.map((opt: any) => String(opt).trim()).filter(Boolean)
    } else if (q.options && typeof q.options === "object") {
      rawOptions = Object.values(q.options).map((opt: any) => String(opt).trim()).filter(Boolean)
    }

    if (rawOptions.length < 4) return null

    // Ensure options are limited to top 4 options
    const options = rawOptions.slice(0, 4)

    let rawCorrect = String(q.correct_answer || "").trim()
    if (!rawCorrect) return null

    let correctAnswer = rawCorrect

    // Handle choice letters e.g. "Option A", "Choice B", "A", "0"
    const cleanKey = rawCorrect.replace(/^(option|choice)\s*/i, "").replace(/[\):.]/g, "").trim().toUpperCase()
    if (["A", "B", "C", "D"].includes(cleanKey)) {
      const idx = cleanKey.charCodeAt(0) - 65
      if (options[idx]) {
        correctAnswer = options[idx]
      }
    } else if (/^[0-3]$/.test(cleanKey)) {
      const idx = parseInt(cleanKey, 10)
      if (options[idx]) {
        correctAnswer = options[idx]
      }
    }

    if (!options.includes(correctAnswer)) {
      const matchedOpt = options.find((opt) => opt.toLowerCase() === rawCorrect.toLowerCase())
      if (matchedOpt) {
        correctAnswer = matchedOpt
      } else {
        // Correct answer does NOT match any option -> REJECT question
        return null
      }
    }

    const fingerprint = generateQuestionFingerprint(questionText, options, format)

    return {
      id: q.id,
      course_id: q.course_id,
      topic,
      subtopic,
      format: "SBA",
      question_text: questionText,
      options,
      correct_answer: correctAnswer,
      explanation,
      tf_options: null,
      sub_questions: null,
      image_bank_id: q.image_bank_id || null,
      difficulty: q.difficulty || "medium",
      high_yield_weight: q.high_yield_weight || 1.0,
      provenance: q.provenance || null,
      question_fingerprint: fingerprint,
      status: q.status || "active",
    }
  }

  if (format === "Short Answer") {
    const correctAnswer = String(q.correct_answer || q.model_answer || q.answer || "").trim()
    if (!correctAnswer) return null

    const fingerprint = generateQuestionFingerprint(questionText, [], format)

    return {
      id: q.id,
      course_id: q.course_id,
      topic,
      subtopic,
      format: "Short Answer",
      question_text: questionText,
      options: [],
      correct_answer: correctAnswer,
      explanation,
      tf_options: null,
      sub_questions: null,
      image_bank_id: q.image_bank_id || null,
      difficulty: q.difficulty || "medium",
      high_yield_weight: q.high_yield_weight || 1.0,
      provenance: q.provenance || null,
      question_fingerprint: fingerprint,
      status: q.status || "active",
    }
  }

  if (format === "OSCE") {
    const subQsRaw = q.sub_questions || q.subQuestions
    if (!Array.isArray(subQsRaw) || subQsRaw.length === 0) return null

    const validSubQs: SubQuestion[] = []
    for (const sq of subQsRaw) {
      if (!sq || typeof sq !== "object") continue
      const subQuestion = String(sq.question || sq.text || "").trim()
      const expectedAnswer = String(sq.expected_answer || sq.expectedAnswer || sq.answer || "").trim()
      if (!subQuestion || !expectedAnswer) continue
      validSubQs.push({
        id: sq.id,
        question: subQuestion,
        expected_answer: expectedAnswer,
        explanation: sq.explanation ? String(sq.explanation).trim() : undefined,
      })
    }

    if (validSubQs.length === 0) return null

    const fingerprint = generateQuestionFingerprint(questionText, validSubQs.map(s => s.question), format)

    return {
      id: q.id,
      course_id: q.course_id,
      topic,
      subtopic,
      format: "OSCE",
      question_text: questionText,
      options: [],
      correct_answer: q.correct_answer ? String(q.correct_answer).trim() : "OSCE Station Standard Checklist",
      explanation,
      tf_options: null,
      sub_questions: validSubQs,
      image_bank_id: q.image_bank_id || null,
      difficulty: q.difficulty || "medium",
      high_yield_weight: q.high_yield_weight || 1.0,
      provenance: q.provenance || null,
      question_fingerprint: fingerprint,
      status: q.status || "active",
    }
  }

  return null
}
