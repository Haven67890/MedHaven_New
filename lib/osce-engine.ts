import crypto from "crypto"

export interface OSCESpecimenImage {
  id: string
  course_id?: string | null
  title: string
  image_url: string
  category: string
  correct_findings: string
  differential_diagnosis?: string | null
  source?: string | null
  question?: string | null
}

export interface OSCESubQuestion {
  question: string
  expected_answer: string
  explanation: string
}

export interface OSCEStation {
  id?: string
  image_bank_id: string
  question_text: string
  topic: string
  sub_questions: OSCESubQuestion[]
  correct_answer: string
  explanation: string
  difficulty?: string
  image_bank?: OSCESpecimenImage
}

export interface OSCEGenerationBatchOptions {
  courseCodeTitle: string
  images: OSCESpecimenImage[]
}

export interface OSCEAnswerEvaluation {
  score: number
  maxScore: number
  isCorrect: boolean
  matchedKeywords: string[]
  feedback?: string
}

/**
 * Common medical synonym/phrase mapping for smart semantic equivalence checking
 */
const MEDICAL_SYNONYM_GROUPS: string[][] = [
  ["ct", "computed tomography", "cat scan", "ct scan"],
  ["mri", "magnetic resonance imaging", "mr scan"],
  ["xray", "x-ray", "radiograph", "roentgenogram", "plain film"],
  ["tb", "tuberculosis", "mycobacterium tuberculosis"],
  ["ecg", "electrocardiogram", "ekg"],
  ["mi", "myocardial infarction", "heart attack"],
  ["cva", "cerebrovascular accident", "stroke"],
  ["copd", "chronic obstructive pulmonary disease"],
  ["sle", "systemic lupus erythematosus"],
  ["dvt", "deep vein thrombosis"],
  ["pe", "pulmonary embolism"],
  ["arfs", "acute renal failure", "acute kidney injury", "aki"],
  ["dm", "diabetes mellitus", "diabetes"]
]

/**
 * Evaluates a student's OSCE answer against an expected marking rubric.
 * Tolerates reasonable medical terminology variations, acronyms, and synonyms.
 */
export function evaluateOSCEAnswer(
  userAnswer: string,
  expectedAnswer: string
): OSCEAnswerEvaluation {
  if (!userAnswer || !userAnswer.trim()) {
    return {
      score: 0,
      maxScore: 1,
      isCorrect: false,
      matchedKeywords: [],
      feedback: "No answer provided."
    }
  }

  const cleanUser = userAnswer.toLowerCase().trim()
  const cleanExpected = expectedAnswer.toLowerCase().trim()

  // Exact or near-exact match
  if (cleanUser === cleanExpected || cleanUser.includes(cleanExpected)) {
    return {
      score: 1,
      maxScore: 1,
      isCorrect: true,
      matchedKeywords: [cleanExpected],
      feedback: "Exact match with marking key."
    }
  }

  const matchedKeywords: string[] = []

  // 1. Check medical phrase synonym groups
  for (const group of MEDICAL_SYNONYM_GROUPS) {
    const expectedHasGroupTerm = group.some((term) => cleanExpected.includes(term))
    const userHasGroupTerm = group.some((term) => cleanUser.includes(term))

    if (expectedHasGroupTerm && userHasGroupTerm) {
      matchedKeywords.push(`Medical term: ${group[0]}`)
    }
  }

  // 2. Tokenize and extract essential keywords (>2 chars, excluding stop words)
  const stopWords = new Set(["the", "and", "that", "with", "this", "from", "for", "are", "was", "were", "been", "have", "has", "had", "may", "can", "see", "shown", "there", "type", "note"])

  const expectedTokens = cleanExpected
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w))

  const userTextNormalized = cleanUser.replace(/[^\w\s]/g, " ")

  for (const token of expectedTokens) {
    if (userTextNormalized.includes(token)) {
      if (!matchedKeywords.includes(token)) {
        matchedKeywords.push(token)
      }
    }
  }

  const totalTokens = expectedTokens.length || 1
  const ratio = matchedKeywords.length / totalTokens

  // Require at least 30% or key medical phrase match for a full mark
  const isCorrect = ratio >= 0.30 || matchedKeywords.length >= 2
  const score = isCorrect ? 1 : 0

  return {
    score,
    maxScore: 1,
    isCorrect,
    matchedKeywords,
    feedback: isCorrect
      ? `Correct key concept identified (${matchedKeywords.length} marking points matched).`
      : `Key clinical concepts missing from marking rubric.`
  }
}

/**
 * Generates structured OSCE station tasks using Groq AI grounded in actual quiz_image_bank medical images.
 */
export async function generateOSCEStationsBatch(
  options: OSCEGenerationBatchOptions
): Promise<OSCEStation[]> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error("GROQ_API_KEY configuration missing on server")
  }

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b"
  const { courseCodeTitle, images } = options

  if (!images || images.length === 0) {
    return []
  }

  const imageDescriptions = images.map((img, idx) => `
[IMAGE STATION ${idx + 1}]
ID: ${img.id}
Title: ${img.title}
Category: ${img.category}
Key Findings: ${img.correct_findings}
Differentials: ${img.differential_diagnosis || "None listed"}
Original Context: ${img.question || "Identify features."}
  `).join("\n")

  const systemPrompt = `You are a Senior Medical Professor and OSCE Examiner for Medicine & Surgery 600L / Final Year MBBS examinations.
You are provided with real medical images/specimens from the MedHaven specimen bank.

YOUR TASK:
Generate structured, examination-grade OSCE stations for each provided image station.
Each station MUST be image-first and task-oriented.

STATION TYPES COVERED IN OSCE EXAMS:
- IMAGE → IDENTIFY & FOLLOW-UP (Identification + uses/complications/features)
- CLINICAL IMAGE → DIAGNOSIS & DIFFERENTIALS (Diagnosis + key abnormal findings + differentials)
- RADIOLOGY STATION (X-ray/CT/MRI modality identification + abnormality + management)
- INSTRUMENT/EQUIPMENT STATION (Identification + indications + complications + structures handled)
- PATHOLOGY/SPECIMEN STATION (Gross/Histology identification + characteristic features + management)

REQUIREMENTS:
1. Do NOT fabricate images or alter the core medical findings of the image.
2. Produce 2 to 4 focused sub-questions per station.
3. Keep questions concise and suitable for a timed 1-minute station.
4. Each sub-question MUST include a clear, specific "expected_answer" (marking point rubric) and a brief "explanation".
5. Return JSON matching the required schema:

{
  "stations": [
    {
      "image_bank_id": "string matching the exact ID of the image provided",
      "topic": "string (e.g., Radiology, Surgical Instruments, Pathology, Clinical Medicine)",
      "question_text": "string (Station introductory clinical vignette or examination context)",
      "sub_questions": [
        {
          "question": "string (The concise task e.g. '1. Identify the radiological abnormality demonstrated.')",
          "expected_answer": "string (Key marking rubric answer point)",
          "explanation": "string (Clinical rationale)"
        }
      ],
      "correct_answer": "string (Overall summary marking key)",
      "explanation": "string (Overall station rationale & teaching points)"
    }
  ]
}`

  const userPrompt = `Course: ${courseCodeTitle}
Generate OSCE stations for the following ${images.length} images:
${imageDescriptions}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)

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
        temperature: 0.5,
        max_tokens: 4096
      })
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      throw new Error(`Groq HTTP Error ${res.status}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error("AI returned empty content")
    }

    const parsed = JSON.parse(content)
    let rawStations: any[] = []
    if (Array.isArray(parsed)) {
      rawStations = parsed
    } else if (parsed && Array.isArray(parsed.stations)) {
      rawStations = parsed.stations
    }

    const validatedStations: OSCEStation[] = []
    for (const raw of rawStations) {
      if (raw && raw.image_bank_id && Array.isArray(raw.sub_questions)) {
        validatedStations.push({
          image_bank_id: String(raw.image_bank_id),
          topic: String(raw.topic || "Clinical OSCE"),
          question_text: String(raw.question_text || "Examine the image and answer the tasks below."),
          sub_questions: raw.sub_questions.map((sq: any, i: number) => ({
            question: String(sq.question || `Task ${i + 1}`),
            expected_answer: String(sq.expected_answer || "Key marking point"),
            explanation: String(sq.explanation || "Clinical rationale")
          })),
          correct_answer: String(raw.correct_answer || "OSCE Marking Key"),
          explanation: String(raw.explanation || "Station rationale")
        })
      }
    }

    return validatedStations
  } catch (err: any) {
    clearTimeout(timeoutId)
    console.warn("Groq OSCE station batch generation error:", err?.message || err)
    throw err
  }
}
