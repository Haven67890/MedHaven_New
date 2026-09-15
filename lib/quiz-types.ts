export type QuizFormat = "MCQ" | "SBA" | "Short Answer" | "OSCE"
export type QuizMode = "practice" | "ai" | "mixed"
export type QuizCount = 5 | 10

export type QuestionProvenanceSource =
  | "local_bank"
  | "medhaven_material"
  | "past_question_inspired"
  | "ai_generated"
  | "external_knowledge"
  | "mixed"

export interface QuestionProvenance {
  source_type: QuestionProvenanceSource
  material_ids?: string[]
  past_question_id?: string
  generated_at?: string
  model?: string
  confidence?: number
  notes?: string
}

export interface TFStatement {
  statement: string
  answer: boolean
}

export interface SubQuestion {
  id?: string
  question: string
  expected_answer: string
  explanation?: string
}

export interface ValidatedQuestion {
  id?: string
  course_id?: string
  topic: string
  subtopic?: string | null
  format: QuizFormat
  question_text: string
  options?: string[]
  correct_answer: string
  explanation: string
  tf_options?: TFStatement[] | null
  sub_questions?: SubQuestion[] | null
  image_bank_id?: string | null
  difficulty?: "easy" | "medium" | "hard"
  high_yield_weight?: number
  provenance?: QuestionProvenance | null
  question_fingerprint?: string
  status?: "draft" | "validation" | "active" | "archived"
  created_at?: string
  updated_at?: string
}

export interface QuizGenerationRequest {
  course_id: string
  topic?: string
  subtopic?: string
  format?: QuizFormat
  count?: number // strictly 5 or 10
  mode?: QuizMode // practice, ai, or mixed
}

export interface QuizGenerationResponse {
  quiz_id?: string
  course_id: string
  topic: string
  format: QuizFormat
  requested_count: number
  returned_count: number
  mode: QuizMode
  fallback_used: boolean
  fallback_notice?: string | null
  questions: ValidatedQuestion[]
}
