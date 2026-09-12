import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import crypto from "crypto"

function computeQuestionHash(questionText: string, options: string[], format: string): string {
  const normText = questionText.trim().toLowerCase().replace(/\s+/g, " ")
  const normOpts = (options || []).map(o => o.trim().toLowerCase()).sort().join("|")
  const raw = `${format.toUpperCase()}:${normText}:${normOpts}`
  return crypto.createHash("sha256").update(raw).digest("hex")
}

async function checkAdminAccess(supabase: any, serviceSupabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null }
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return { errorResponse: NextResponse.json({ error: "Forbidden: No profile found" }, { status: 403 }), user: null }
  }

  const callerRole = String(profile.role || "").toLowerCase()
  const isAdmin = callerRole === "admin" || callerRole === "super_admin" || callerRole === "moderator"

  if (!isAdmin) {
    return { errorResponse: NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 }), user: null }
  }

  return { errorResponse: null, user }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { errorResponse, user } = await checkAdminAccess(supabase, serviceSupabase)
    if (errorResponse) return errorResponse

    const body = await request.json().catch(() => ({}))
    const { course_id, topic, format, count } = body

    if (!course_id) {
      return NextResponse.json({ error: "course_id is required" }, { status: 400 })
    }

    const targetTopic = topic && String(topic).trim() !== "" ? String(topic).trim() : "General"
    const chosenFormat = format ? String(format).trim() : "SBA"
    const countToGenerate = Math.min(Math.max(parseInt(String(count || 5), 10), 1), 20)

    // 1. Retrieve stored blueprint if available
    const { data: blueprint } = await serviceSupabase
      .from("course_blueprints")
      .select("*")
      .eq("course_id", course_id)
      .ilike("topic", targetTopic)
      .maybeSingle()

    // 2. Fetch course code/title
    const { data: course } = await serviceSupabase
      .from("courses")
      .select("code, title")
      .eq("id", course_id)
      .maybeSingle()

    const courseContext = course ? `${course.code || ""} ${course.title || ""}`.trim() : "Medical Course"

    // 3. Prepare AI generation prompt incorporating stored blueprint instructions
    let blueprintGuidance = ""
    if (blueprint) {
      blueprintGuidance = `
STRICT EXAM BLUEPRINT GUIDELINES TO FOLLOW:
- High-Yield Concepts to emphasize: ${(blueprint.high_yield_concepts || []).join(", ")}
- Exam Style & Emphasis: ${blueprint.exam_emphasis || "Clinical emphasis"}
- Reasoning Patterns: ${blueprint.reasoning_patterns || "Vignette-driven clinical decision making"}
- Distractor Patterns: ${blueprint.distractor_patterns || "Highly plausible clinical options"}
- Format Style Guidelines for ${chosenFormat}: ${blueprint.format_styles?.[chosenFormat] || "Standard MBBS board style"}
`
    } else {
      blueprintGuidance = `
STRICT EXAM BLUEPRINT GUIDELINES:
- Follow standard Nigerian MBBS and West African Board Exam standards for ${courseContext}.
- Focus on high-yield clinical presentations, diagnostics, and evidence-based management.
`
    }

    let formatStyleInstruction = ""
    if (chosenFormat === "Short Answer") {
      formatStyleInstruction = `Generate short answer questions: direct clinical questions requiring a 1-3 sentence model response. Include mark allocation hint e.g. "(2 marks)".

Each question object in the array must have exactly:
- "question": string (the short answer question or vignette, including mark allocation e.g. "(2 marks)")
- "options": []
- "correct_answer": string (model answer/key points)
- "explanation": string (grading rubric and rationale)`
    } else if (chosenFormat === "OSCE") {
      formatStyleInstruction = `Generate realistic OSCE station vignettes followed by 2-4 structured sub-questions.

Each question object in the array must have exactly:
- "question": string (OSCE station vignette/scenario)
- "sub_questions": array of 2-4 objects: [{"question": string, "expected_answer": string, "explanation": string}]
- "options": []
- "correct_answer": string ("OSCE Station Key")
- "explanation": string (overall station evaluation rubric)`
    } else if (chosenFormat === "SBA") {
      formatStyleInstruction = `Generate Single Best Answer questions: 3-5 sentence clinical vignette, followed by EXACTLY 4 plausible options where only one is correct.

Each question object in the array must have:
- "question": string (clinical vignette)
- "options": array of EXACTLY 4 distinct strings
- "correct_answer": string (MUST match one of the 4 options exactly)
- "explanation": string (why this is the single best answer and why other distractors are inferior)`
    } else { // MCQ
      formatStyleInstruction = `Generate multiple True/False questions: clinical stem followed by 4-5 independent True/False statements.

Each question object in the array must have:
- "question": string (question stem, e.g., "Regarding acute appendicitis:")
- "tf_options": array of 4-5 objects: [{"statement": string, "answer": boolean}]
- "options": []
- "correct_answer": string (summary answer string)
- "explanation": string (rationale for each statement)`
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY is missing on server" }, { status: 500 })
    }

    const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"

    const systemPrompt = `You are an expert medical examiner generating NEW, ORIGINAL assessment questions for a medical question bank.
Do NOT copy existing past questions verbatim. Construct new clinical scenarios reflecting the stored Exam Blueprint parameters.

You MUST return strictly a single JSON object containing a "questions" array of exactly ${countToGenerate} objects matching the format structural requirements.

${formatStyleInstruction}

${blueprintGuidance}`

    const userPrompt = `Generate ${countToGenerate} NEW candidate questions for:
Course: ${courseContext}
Topic: ${targetTopic}
Format: ${chosenFormat}

Return strictly a JSON object with a "questions" array.`

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      console.error("Groq API candidate generation error:", errText)
      return NextResponse.json({ error: "Failed to generate candidates from AI service" }, { status: 502 })
    }

    const groqData = await groqRes.json()
    const rawContent = groqData.choices?.[0]?.message?.content

    if (!rawContent) {
      return NextResponse.json({ error: "AI service returned empty candidate response" }, { status: 502 })
    }

    let parsed: any
    try {
      parsed = JSON.parse(rawContent)
    } catch (parseErr) {
      return NextResponse.json({ error: "AI response was not valid JSON" }, { status: 502 })
    }

    let rawQuestions: any[] = []
    if (Array.isArray(parsed)) {
      rawQuestions = parsed
    } else if (parsed && Array.isArray(parsed.questions)) {
      rawQuestions = parsed.questions
    } else if (parsed && typeof parsed === "object") {
      const foundArrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]))
      if (foundArrayKey) rawQuestions = parsed[foundArrayKey]
    }

    if (rawQuestions.length === 0) {
      return NextResponse.json({ error: "AI service produced no questions" }, { status: 502 })
    }

    // 4. Validate candidates structurally and compute SHA-256 question hashes
    const draftCandidates: any[] = []

    for (const q of rawQuestions) {
      if (!q || !q.question) continue

      let validOpts: string[] = []
      let validTf: any = null
      let validSub: any = null
      let finalCorrect = String(q.correct_answer || "").trim()

      if (chosenFormat === "SBA") {
        if (Array.isArray(q.options)) {
          validOpts = q.options.map((o: any) => String(o).trim())
        }
        if (validOpts.length < 4) {
          while (validOpts.length < 4) validOpts.push("None of the above")
        } else if (validOpts.length > 4) {
          validOpts = validOpts.slice(0, 4)
        }
        if (!validOpts.includes(finalCorrect)) {
          finalCorrect = validOpts[0]
        }
      } else if (chosenFormat === "MCQ") {
        if (Array.isArray(q.tf_options) && q.tf_options.length > 0) {
          validTf = q.tf_options.map((tf: any) => ({
            statement: String(tf.statement || "").trim(),
            answer: Boolean(tf.answer),
          }))
        } else continue
      } else if (chosenFormat === "OSCE") {
        if (Array.isArray(q.sub_questions) && q.sub_questions.length > 0) {
          validSub = q.sub_questions.map((sq: any) => ({
            question: String(sq.question || "").trim(),
            expected_answer: String(sq.expected_answer || sq.answer || "").trim(),
            explanation: String(sq.explanation || "").trim(),
          }))
        } else continue
      }

      const hash = computeQuestionHash(q.question, validOpts, chosenFormat)

      draftCandidates.push({
        course_id,
        topic: targetTopic,
        format: chosenFormat,
        difficulty: q.difficulty || "medium",
        question_text: String(q.question).trim(),
        options: validOpts,
        correct_answer: finalCorrect,
        explanation: q.explanation ? String(q.explanation).trim() : "No explanation provided.",
        tf_options: validTf,
        sub_questions: validSub,
        status: "draft", // Stored as DRAFT initially for admin review
        blueprint_id: blueprint?.id || null,
        question_hash: hash,
        created_by: user.id,
      })
    }

    if (draftCandidates.length === 0) {
      return NextResponse.json({ error: "No structurally valid question candidates were produced" }, { status: 502 })
    }

    // 5. Insert draft candidates into question_bank with duplicate suppression
    const insertedItems: any[] = []
    let skippedDuplicates = 0

    for (const item of draftCandidates) {
      const { data: inserted, error: insertErr } = await serviceSupabase
        .from("question_bank")
        .insert(item)
        .select()
        .single()

      if (insertErr) {
        if (insertErr.code === "23505") { // Unique constraint violation (question_hash duplicate)
          skippedDuplicates++
        } else {
          console.warn("Error inserting candidate question:", insertErr)
        }
      } else if (inserted) {
        insertedItems.push(inserted)
      }
    }

    return NextResponse.json({
      success: true,
      generated_count: insertedItems.length,
      skipped_duplicates: skippedDuplicates,
      questions: insertedItems,
    })
  } catch (err: any) {
    console.error("Unexpected error in POST question generation:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
