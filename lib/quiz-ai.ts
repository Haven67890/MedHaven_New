import { SupabaseClient } from "@supabase/supabase-js"
import { QuizFormat, ValidatedQuestion, QuestionProvenance } from "./quiz-types"
import { validateQuestion } from "./quiz-validator"

export interface GenerateAiQuestionsOptions {
  supabase: SupabaseClient
  courseId: string
  topic?: string | null
  subtopic?: string | null
  format?: QuizFormat | null
  requestedCount: number // 5 or 10
}

export interface GenerateAiQuestionsResult {
  questions: ValidatedQuestion[]
  error: string | null
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) })
    const pdf = await loadingTask.promise
    let fullText = ""
    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: any) => item.str || "")
        .filter(Boolean)
        .join(" ")
      fullText += pageText + "\n"
    }
    return fullText.trim()
  } catch {
    return ""
  }
}

export async function generateAiQuestions({
  supabase,
  courseId,
  topic,
  subtopic,
  format,
  requestedCount,
}: GenerateAiQuestionsOptions): Promise<GenerateAiQuestionsResult> {
  const groqApiKey = process.env.GROQ_API_KEY
  if (!groqApiKey) {
    return { questions: [], error: "Missing GROQ_API_KEY environment variable" }
  }

  const groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-20b"
  const chosenFormat: QuizFormat = format && ["MCQ", "SBA", "Short Answer", "OSCE"].includes(format) ? format : "SBA"
  const normTopic = topic && topic.trim() !== "" ? topic.trim() : "General Clinical Practice"

  // 1. Fetch Course Context
  const { data: courseData } = await supabase
    .from("courses")
    .select("code, title, description")
    .eq("id", courseId)
    .maybeSingle()

  const courseTitle = courseData
    ? `${courseData.code || ""} ${courseData.title || ""}`.trim()
    : "Medical Course"

  // 2. Fetch Blueprint Context
  const { data: blueprintData } = await supabase
    .from("course_blueprints")
    .select("high_yield_concepts, exam_emphasis, question_style_patterns")
    .eq("course_id", courseId)
    .ilike("topic", normTopic)
    .maybeSingle()

  let blueprintContext = ""
  if (blueprintData) {
    blueprintContext = `\nEXAM BLUEPRINT CONTEXT:
High-Yield Concepts: ${JSON.stringify(blueprintData.high_yield_concepts || [])}
Exam Emphasis: ${blueprintData.exam_emphasis || "Standard medical board level"}
Question Patterns: ${JSON.stringify(blueprintData.question_style_patterns || {})}`
  }

  // 3. Fetch Educational Materials Context
  let groundingContext = ""
  const { data: materials } = await supabase
    .from("materials")
    .select("id, title, type, storage_path, description")
    .eq("course_id", courseId)
    .eq("status", "published")
    .limit(3)

  if (materials && materials.length > 0) {
    groundingContext = `\nEDUCATIONAL MATERIAL REFERENCES:\n` + materials.map((m: any) => `- ${m.title} (${m.type}): ${m.description || ""}`).join("\n")

    // Attempt light extraction for PDF past question if storage_path available
    const pastQuestionMat = materials.find((m: any) => m.type === "past_question" && m.storage_path)
    if (pastQuestionMat?.storage_path) {
      try {
        const workerBase = process.env.CLOUDFLARE_WORKER_URL || "https://medhaven-b2-proxy.dachenaugustine.workers.dev"
        const fileUrl = `${workerBase}/${encodeURIComponent(pastQuestionMat.storage_path)}`
        const res = await fetch(fileUrl, { signal: AbortSignal.timeout(3000) })
        if (res.ok) {
          const buffer = await res.arrayBuffer()
          const text = await extractPdfText(buffer)
          if (text) {
            groundingContext += `\nPAST QUESTION EXCERPT (${pastQuestionMat.title}):\n${text.slice(0, 1500)}`
          }
        }
      } catch {
        // Silently skip PDF extraction if network / worker fails
      }
    }
  }

  // Function to request a batch of 5 questions
  async function generateBatch(batchSize: number): Promise<ValidatedQuestion[]> {
    let formatRules = ""
    if (chosenFormat === "SBA") {
      formatRules = `Format: SBA (Single Best Answer)
Each question object MUST have:
- "question_text": string (clinical stem with patient vignette)
- "options": array of 4 distinct strings
- "correct_answer": string (exact match to ONE of the 4 options)
- "explanation": string (detailed reasoning)`
    } else if (chosenFormat === "MCQ") {
      formatRules = `Format: MCQ (Multiple True/False)
Each question object MUST have:
- "question_text": string (clinical lead-in stem)
- "tf_options": array of 4 to 5 objects with {"statement": string, "answer": boolean}
- "explanation": string`
    } else if (chosenFormat === "Short Answer") {
      formatRules = `Format: Short Answer
Each question object MUST have:
- "question_text": string (direct clinical question)
- "correct_answer": string (model answer & key points)
- "explanation": string`
    } else if (chosenFormat === "OSCE") {
      formatRules = `Format: OSCE (Objective Structured Clinical Examination)
Each question object MUST have:
- "question_text": string (station scenario / specimen details)
- "sub_questions": array of 2 to 4 objects with {"question": string, "expected_answer": string, "explanation": string}
- "explanation": string`
    }

    const systemPrompt = `You are a medical professor. Generate exactly ${batchSize} high-yield medical quiz questions.
Return strictly a JSON object with a top-level key "questions" containing an array of question objects.
No markdown backticks, no code blocks, no text before or after JSON.

${formatRules}
${blueprintContext}
${groundingContext}`

    const userPrompt = `Course: ${courseTitle}
Topic: ${normTopic}
${subtopic ? `Subtopic: ${subtopic}` : ""}
Format: ${chosenFormat}
Count: ${batchSize}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout per batch

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[quiz-ai] Groq API error response:", errorText)
        return []
      }

      const groqData = await response.json()
      const content = groqData.choices?.[0]?.message?.content
      if (!content) return []

      let parsed: any
      try {
        parsed = JSON.parse(content)
      } catch {
        return []
      }

      let rawQuestions: any[] = []
      if (Array.isArray(parsed)) {
        rawQuestions = parsed
      } else if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.questions)) {
          rawQuestions = parsed.questions
        } else {
          const key = Object.keys(parsed).find((k) => Array.isArray(parsed[k]))
          if (key) rawQuestions = parsed[key]
        }
      }

      const validBatch: ValidatedQuestion[] = []
      for (const item of rawQuestions) {
        const v = validateQuestion(
          {
            ...item,
            course_id: courseId,
            topic: normTopic,
            subtopic,
            format: chosenFormat,
          },
          chosenFormat
        )

        if (v) {
          const provenance: QuestionProvenance = {
            source_type: groundingContext ? "medhaven_material" : "ai_generated",
            generated_at: new Date().toISOString(),
            model: groqModel,
          }
          validBatch.push({ ...v, provenance })
        }
      }

      return validBatch
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error("[quiz-ai] Exception generating AI batch:", err?.message || err)
      return []
    }
  }

  // Bound generation into small batches of 5
  const allValidatedQuestions: ValidatedQuestion[] = []
  const batchesCount = Math.ceil(requestedCount / 5)

  for (let i = 0; i < batchesCount; i++) {
    const needed = requestedCount - allValidatedQuestions.length
    if (needed <= 0) break

    const batchToFetch = Math.min(needed, 5)
    const batchResults = await generateBatch(batchToFetch)

    for (const q of batchResults) {
      if (allValidatedQuestions.length < requestedCount) {
        allValidatedQuestions.push(q)
      }
    }
  }

  if (allValidatedQuestions.length === 0) {
    return { questions: [], error: "AI service failed to produce valid questions" }
  }

  return { questions: allValidatedQuestions, error: null }
}
