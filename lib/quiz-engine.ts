import { createHash } from "crypto"

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
  question: string
  options: string[]
  correct_answer: string
  explanation: string
  tf_options?: TFStatement[] | null
  sub_questions?: SubQuestion[] | null
  image_bank_id?: string | null
  difficulty?: string
  high_yield_weight?: number
  provenance?: Record<string, any>
  question_fingerprint?: string
  format?: string
  topic?: string
  subtopic?: string
}

export function createQuestionFingerprint(questionText: string, format: string): string {
  const normalized = `${format.toUpperCase()}:${questionText.trim().toLowerCase().replace(/\s+/g, " ")}`
  return createHash("sha256").update(normalized).digest("hex")
}

/**
 * Strict Validation Engine for Medical Questions
 * Enforces format expectations and rejects malformed questions without guessing or fixing correctness.
 */
export function validateQuestion(raw: any, expectedFormat: string): ValidatedQuestion | null {
  if (!raw || typeof raw !== "object") return null
  const format = expectedFormat || raw.format || "MCQ"

  const questionText = typeof raw.question === "string" ? raw.question.trim() : typeof raw.question_text === "string" ? raw.question_text.trim() : ""
  if (!questionText || questionText.length < 5) return null

  const fingerprint = createQuestionFingerprint(questionText, format)

  if (format === "SBA") {
    let options: string[] = []
    if (Array.isArray(raw.options)) {
      options = raw.options.map((o: any) => String(o).trim()).filter(Boolean)
    } else if (raw.options && typeof raw.options === "object") {
      options = Object.values(raw.options).map((o: any) => String(o).trim()).filter(Boolean)
    }

    if (options.length !== 4) return null

    let rawCorrect = typeof raw.correct_answer === "string" ? raw.correct_answer.trim() : ""
    if (!rawCorrect) return null

    // Check if correct_answer matches option letter e.g., "A", "Option A", "Choice B"
    const cleanKey = rawCorrect.replace(/^(option|choice)\s*/i, "").replace(/[\):.]/g, "").trim().toUpperCase()
    let matchedCorrect = rawCorrect

    if (["A", "B", "C", "D"].includes(cleanKey)) {
      const idx = cleanKey.charCodeAt(0) - 65
      if (options[idx]) {
        matchedCorrect = options[idx]
      }
    } else if (/^[0-3]$/.test(cleanKey)) {
      const idx = parseInt(cleanKey, 10)
      if (options[idx]) {
        matchedCorrect = options[idx]
      }
    }

    // Must match one of the 4 options exactly
    const exactMatch = options.find((opt) => opt === matchedCorrect) || options.find((opt) => opt.toLowerCase() === matchedCorrect.toLowerCase())
    if (!exactMatch) {
      return null // Reject question rather than guessing or picking options[0]
    }

    return {
      id: raw.id,
      question: questionText,
      options,
      correct_answer: exactMatch,
      explanation: typeof raw.explanation === "string" && raw.explanation.trim() ? raw.explanation.trim() : "No explanation provided.",
      image_bank_id: raw.image_bank_id || null,
      difficulty: raw.difficulty || "medium",
      high_yield_weight: Number(raw.high_yield_weight) || 1.0,
      provenance: raw.provenance || { source: "validated" },
      question_fingerprint: fingerprint,
      format: "SBA",
      topic: raw.topic,
      subtopic: raw.subtopic
    }
  }

  if (format === "MCQ") {
    const rawTf = raw.tf_options || raw.tfOptions
    if (!Array.isArray(rawTf) || rawTf.length < 4 || rawTf.length > 5) return null

    const validTf: TFStatement[] = []
    for (const item of rawTf) {
      if (!item || typeof item !== "object") return null
      const statement = typeof item.statement === "string" ? item.statement.trim() : ""
      if (!statement) return null
      const answer = Boolean(item.answer)
      validTf.push({ statement, answer })
    }

    const summaryAnswer = validTf
      .map((opt, idx) => `${String.fromCharCode(65 + idx)}: ${opt.answer ? "True" : "False"}`)
      .join(", ")

    return {
      id: raw.id,
      question: questionText,
      options: [],
      correct_answer: typeof raw.correct_answer === "string" && raw.correct_answer.trim() ? raw.correct_answer.trim() : summaryAnswer,
      explanation: typeof raw.explanation === "string" && raw.explanation.trim() ? raw.explanation.trim() : "No explanation provided.",
      tf_options: validTf,
      image_bank_id: raw.image_bank_id || null,
      difficulty: raw.difficulty || "medium",
      high_yield_weight: Number(raw.high_yield_weight) || 1.0,
      provenance: raw.provenance || { source: "validated" },
      question_fingerprint: fingerprint,
      format: "MCQ",
      topic: raw.topic,
      subtopic: raw.subtopic
    }
  }

  if (format === "Short Answer") {
    const correctAnswer = typeof raw.correct_answer === "string" ? raw.correct_answer.trim() : ""
    if (!correctAnswer) return null

    return {
      id: raw.id,
      question: questionText,
      options: [],
      correct_answer: correctAnswer,
      explanation: typeof raw.explanation === "string" && raw.explanation.trim() ? raw.explanation.trim() : "Model rubric & clinical guidance provided above.",
      image_bank_id: raw.image_bank_id || null,
      difficulty: raw.difficulty || "medium",
      high_yield_weight: Number(raw.high_yield_weight) || 1.0,
      provenance: raw.provenance || { source: "validated" },
      question_fingerprint: fingerprint,
      format: "Short Answer",
      topic: raw.topic,
      subtopic: raw.subtopic
    }
  }

  if (format === "OSCE") {
    const rawSubQs = raw.sub_questions || raw.subQuestions
    if (!Array.isArray(rawSubQs) || rawSubQs.length < 2 || rawSubQs.length > 5) return null

    const validSubQs: SubQuestion[] = []
    for (const sq of rawSubQs) {
      if (!sq || typeof sq !== "object") return null
      const q = typeof sq.question === "string" ? sq.question.trim() : ""
      const exp = typeof sq.expected_answer === "string" ? sq.expected_answer.trim() : typeof sq.answer === "string" ? sq.answer.trim() : ""
      if (!q || !exp) return null
      validSubQs.push({
        id: sq.id,
        question: q,
        expected_answer: exp,
        explanation: typeof sq.explanation === "string" ? sq.explanation.trim() : undefined
      })
    }

    return {
      id: raw.id,
      question: questionText,
      options: [],
      correct_answer: typeof raw.correct_answer === "string" && raw.correct_answer.trim() ? raw.correct_answer.trim() : "OSCE Station Evaluation Key",
      explanation: typeof raw.explanation === "string" && raw.explanation.trim() ? raw.explanation.trim() : "Overall station clinical performance rubric.",
      sub_questions: validSubQs,
      image_bank_id: raw.image_bank_id || null,
      difficulty: raw.difficulty || "medium",
      high_yield_weight: Number(raw.high_yield_weight) || 1.0,
      provenance: raw.provenance || { source: "validated" },
      question_fingerprint: fingerprint,
      format: "OSCE",
      topic: raw.topic,
      subtopic: raw.subtopic
    }
  }

  return null
}

export interface BankSelectionParams {
  course_id: string
  topic?: string
  subtopic?: string
  format: string
  count: number
  user_id?: string
  exclude_ids?: string[]
}

export interface BankSelectionResult {
  questions: ValidatedQuestion[]
  match_level: "exact_topic" | "subtopic" | "course_level" | "broad_fallback"
  is_partial: boolean
  total_found: number
}

/**
 * Fast, deterministic, database-driven question selection from question_bank
 */
export async function selectBankQuestions(
  supabase: any,
  params: BankSelectionParams
): Promise<BankSelectionResult> {
  const { course_id, topic, subtopic, format, count, user_id, exclude_ids = [] } = params
  const targetCount = Math.min(Math.max(count, 1), 10)

  // Fetch excluded question IDs from user_question_history if user_id is supplied
  const historyExcludedSet = new Set<string>(exclude_ids)
  if (user_id) {
    try {
      const { data: history } = await supabase
        .from("user_question_history")
        .select("question_id")
        .eq("user_id", user_id)
        .order("attempted_at", { ascending: false })
        .limit(100)

      if (history && history.length > 0) {
        history.forEach((h: any) => {
          if (h.question_id) historyExcludedSet.add(h.question_id)
        })
      }
    } catch (err) {
      console.warn("Could not fetch user question history for exclusion:", err)
    }
  }

  let selectedQuestions: ValidatedQuestion[] = []
  let matchLevel: "exact_topic" | "subtopic" | "course_level" | "broad_fallback" = "exact_topic"

  const fetchCandidates = async (queryModifier: (query: any) => any) => {
    let query = supabase
      .from("question_bank")
      .select("*")
      .eq("status", "active")
      .eq("format", format)

    query = queryModifier(query)

    const { data, error } = await query
      .order("high_yield_weight", { ascending: false })
      .limit(50)

    if (error || !data) {
      console.error("Error querying question_bank:", error)
      return []
    }

    const validList: ValidatedQuestion[] = []
    for (const item of data) {
      if (historyExcludedSet.has(item.id)) continue
      const vq = validateQuestion(item, format)
      if (vq) validList.push(vq)
    }
    return validList
  }

  // STEP 1: Exact Topic matching
  if (topic && topic.trim() && topic !== "General Course Review") {
    const trimmedTopic = topic.trim()
    const exactMatches = await fetchCandidates((q) =>
      q.eq("course_id", course_id).ilike("topic", `%${trimmedTopic}%`)
    )

    for (const q of exactMatches) {
      if (!selectedQuestions.some((s) => s.id === q.id || s.question_fingerprint === q.question_fingerprint)) {
        selectedQuestions.push(q)
        historyExcludedSet.add(q.id!)
      }
      if (selectedQuestions.length >= targetCount) break
    }
  }

  // STEP 2: Subtopic or Related topic matching if count not reached
  if (selectedQuestions.length < targetCount && subtopic && subtopic.trim()) {
    matchLevel = "subtopic"
    const subMatches = await fetchCandidates((q) =>
      q.eq("course_id", course_id).ilike("subtopic", `%${subtopic.trim()}%`)
    )

    for (const q of subMatches) {
      if (!selectedQuestions.some((s) => s.id === q.id || s.question_fingerprint === q.question_fingerprint)) {
        selectedQuestions.push(q)
        historyExcludedSet.add(q.id!)
      }
      if (selectedQuestions.length >= targetCount) break
    }
  }

  // STEP 3: Course-level fallback if count still not reached
  if (selectedQuestions.length < targetCount) {
    if (selectedQuestions.length === 0) matchLevel = "course_level"
    const courseMatches = await fetchCandidates((q) =>
      q.eq("course_id", course_id)
    )

    for (const q of courseMatches) {
      if (!selectedQuestions.some((s) => s.id === q.id || s.question_fingerprint === q.question_fingerprint)) {
        selectedQuestions.push(q)
        historyExcludedSet.add(q.id!)
      }
      if (selectedQuestions.length >= targetCount) break
    }
  }

  // STEP 4: Broad fallback (any active question in this format) if needed
  if (selectedQuestions.length < targetCount) {
    if (selectedQuestions.length === 0) matchLevel = "broad_fallback"
    const broadMatches = await fetchCandidates((q) => q)

    for (const q of broadMatches) {
      if (!selectedQuestions.some((s) => s.id === q.id || s.question_fingerprint === q.question_fingerprint)) {
        selectedQuestions.push(q)
        historyExcludedSet.add(q.id!)
      }
      if (selectedQuestions.length >= targetCount) break
    }
  }

  const isPartial = selectedQuestions.length < targetCount

  return {
    questions: selectedQuestions.slice(0, targetCount),
    match_level: matchLevel,
    is_partial: isPartial,
    total_found: selectedQuestions.length
  }
}

export interface AIGenerationOptions {
  courseCodeTitle: string
  topic: string
  format: string
  count: number // Max 5 or 10
  groundingContext?: string
  blueprintContext?: string
  existingFingerprints?: Set<string>
}

/**
 * Generates questions using bounded Groq AI calls with strict validation & fingerprint duplicate suppression
 */
export async function generateAIQuestionsBatch(
  options: AIGenerationOptions
): Promise<ValidatedQuestion[]> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error("GROQ_API_KEY configuration missing on server")
  }

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b"
  const countToGenerate = Math.min(Math.max(options.count, 1), 10)
  const existingFingerprints = options.existingFingerprints || new Set<string>()

  let formatInstruction = ""
  if (options.format === "SBA") {
    formatInstruction = `Generate Single Best Answer (SBA) questions in professional medical school examination style (MBBS finals / University exam format) with a course-aware, balanced spectrum across the requested question set:

1. TARGET SBA STYLE DISTRIBUTION:
   - 60–70% Concise Knowledge, Concept & Direct Application SBAs: Direct, high-yield questions testing core principles, mechanisms, definitions, classifications, anatomy, physiology, pathology, pharmacology, drug selection, indications, contraindications, complications, first-line/next-best investigations, diagnosis, management, radiological findings, clinical distinctions, important exceptions, comparisons, and common examination traps.
     Use natural medical-school examination constructions where appropriate, such as:
     * "Concerning..."
     * "Regarding..."
     * "The following are true concerning..."
     * "The following are false concerning..."
     * "Which of the following is true?"
     * "Which of the following is incorrect?"
     * "Which of the following is NOT..."
     * "...except"
     * "All of the following..."
     * "Which of the following is the most appropriate..."
     * "Which of the following best explains..."
     Note: Difficulty must stem from challenging medical concepts, subtle clinical distinctions, and highly plausible distractors—NOT from making the stem artificially long.
   - 20–25% Short Clinical-Application SBAs: Focused clinical scenarios (1–2 sentences) that test conceptual application using concise, decision-relevant clinical context.
   - 10–15% Longer Clinical Vignettes: Full clinical cases (3–4 sentences) reserved for when detailed clinical context genuinely drives clinical decision-making (e.g. multi-step diagnosis, differential diagnosis, risk stratification, prognosis, or complex treatment choice).

2. COURSE-AWARE & DISCIPLINE-SENSITIVE STYLE:
   - Adapt the SBA wording and style to the specific specialty and course (${options.courseCodeTitle}).
   - Where course-specific past question patterns or grounding references are available, use them as the primary reference for wording, stem structure, topic emphasis, and distractor style.
   - Respect specialty-specific examination conventions (e.g. Anaesthesiology emphasizing concise conceptual, physiological, and pharmacological principles; Radiology emphasizing modality selection, imaging findings, anatomical relationships; Ophthalmology emphasizing pathology, clinical signs, investigations, concise management; Surgery/Medicine emphasizing focused diagnostic and management steps).
   - Preserve the general principle across ALL specialties: test medical knowledge and reasoning efficiently rather than turning every question into a long clinical story.

3. CLINICAL VIGNETTES & BIODATA GUIDELINES:
   - Do NOT convert a straightforward knowledge question into a long patient story merely to make it look "more clinical". (e.g., if asking which intravenous agent is a barbiturate, ask directly about thiopentone rather than inventing an entire operating theatre story).
   - For clinical vignettes, retain clinically meaningful biodata (age, sex, pregnancy status, gestational age, BMI, relevant medical history, examination findings, vital signs, laboratory results, imaging findings, medication history, duration/severity) WHEN those details meaningfully affect diagnosis, risk stratification, drug selection, investigation, management, or prognosis.
   - RELEVANT CLINICAL DETAIL = KEEP IT. IRRELEVANT CLINICAL PADDING = REMOVE IT.

4. STRUCTURE REQUIREMENTS:
   Return a JSON object with a "questions" key containing an array of objects.
   Each object MUST have:
   - "question": string (the question stem, formatted according to the style guidelines above)
   - "options": array of EXACTLY 4 distinct, plausible strings
   - "correct_answer": string (MUST match one of the strings inside "options" EXACTLY)
   - "explanation": string (clear, thorough rationale explaining why the correct choice is the single best answer and why key alternative choices are inferior)`
  } else if (options.format === "MCQ") {
    formatInstruction = `Generate MCQ questions in Nigerian MBBS finals style: a clinical stem followed by 4 to 5 independent True/False statements.
Return a JSON object with a "questions" key containing an array of objects.
Each object MUST have:
- "question": string (the stem e.g., "Regarding acute appendicitis:")
- "tf_options": array of 4 to 5 objects with {"statement": string, "answer": boolean}
- "correct_answer": string summary (e.g. "A: True, B: False, C: True, D: False")
- "explanation": string (rationale for each statement classification)`
  } else if (options.format === "Short Answer") {
    formatInstruction = `Generate Short Answer questions requiring 1-3 sentence clinical responses.
Return a JSON object with a "questions" key containing an array of objects.
Each object MUST have:
- "question": string (the specific clinical query including mark allocation hint e.g., "(2 marks)")
- "correct_answer": string (the ground-truth expected answer / key terms)
- "explanation": string (clinical grading rubric and rationale)`
  } else if (options.format === "OSCE") {
    formatInstruction = `Generate a realistic OSCE clinical station with a scenario and 2 to 4 structured sub-questions.
Return a JSON object with a "questions" key containing an array of objects.
Each object MUST have:
- "question": string (the station scenario vignette)
- "sub_questions": array of 2 to 4 objects with {"question": string, "expected_answer": string, "explanation": string}
- "correct_answer": string ("OSCE Station Evaluation Key")
- "explanation": string (overall performance rubric)`
  }

  let systemPrompt = `You are a top-tier medical professor and board exam creator. Generate exactly ${countToGenerate} questions.
You MUST return ONLY valid JSON matching the format structure. Do NOT wrap in markdown backticks or include raw conversational text.

${formatInstruction}`

  if (options.groundingContext) {
    systemPrompt += `\n\nMedHaven Material Reference:\n${options.groundingContext}`
  }

  if (options.blueprintContext) {
    systemPrompt += `\n\nExam Blueprint & Style Patterns:\n${options.blueprintContext}`
  }

  const userPrompt = `Generate ${countToGenerate} ${options.format} questions for:
Course: ${options.courseCodeTitle}
Topic: ${options.topic}`

  // Timeout controller to fail fast (15s) and trigger bank fallback cleanly
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 4096
      })
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const errText = await res.text()
      console.error(`Groq AI request failed with status ${res.status}:`, errText)
      throw new Error(`AI Provider HTTP Error ${res.status}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error("AI returned empty completion content")
    }

    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      throw new Error("AI output was not valid JSON")
    }

    let rawQuestions: any[] = []
    if (Array.isArray(parsed)) {
      rawQuestions = parsed
    } else if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.questions)) rawQuestions = parsed.questions
      else {
        const found = Object.values(parsed).find((val) => Array.isArray(val))
        if (found) rawQuestions = found as any[]
      }
    }

    const validatedBatch: ValidatedQuestion[] = []
    for (const item of rawQuestions) {
      const vq = validateQuestion(item, options.format)
      if (vq) {
        if (!existingFingerprints.has(vq.question_fingerprint!)) {
          existingFingerprints.add(vq.question_fingerprint!)
          vq.provenance = { source: "ai_generated", model, generated_at: new Date().toISOString() }
          validatedBatch.push(vq)
        }
      }
    }

    return validatedBatch
  } catch (err: any) {
    clearTimeout(timeoutId)
    console.warn("AI generation batch failed or timed out:", err?.message || err)
    throw err
  }
}
