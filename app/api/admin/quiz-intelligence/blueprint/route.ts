import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
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
  } catch (err) {
    console.warn("Failed to extract PDF text for blueprint learning:", err)
    return ""
  }
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { errorResponse } = await checkAdminAccess(supabase, serviceSupabase)
    if (errorResponse) return errorResponse

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("course_id")
    const topic = searchParams.get("topic") || "General"

    if (!courseId) {
      return NextResponse.json({ error: "course_id is required" }, { status: 400 })
    }

    const { data: blueprint, error } = await serviceSupabase
      .from("course_blueprints")
      .select("*")
      .eq("course_id", courseId)
      .ilike("topic", topic)
      .maybeSingle()

    if (error) {
      console.error("Error fetching course blueprint:", error)
      return NextResponse.json({ error: "Failed to fetch blueprint" }, { status: 500 })
    }

    return NextResponse.json({ blueprint: blueprint || null })
  } catch (err: any) {
    console.error("Unexpected error in GET blueprint:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { errorResponse } = await checkAdminAccess(supabase, serviceSupabase)
    if (errorResponse) return errorResponse

    const body = await request.json().catch(() => ({}))
    const { course_id, topic } = body

    if (!course_id) {
      return NextResponse.json({ error: "course_id is required" }, { status: 400 })
    }

    const targetTopic = topic && String(topic).trim() !== "" ? String(topic).trim() : "General"

    // 1. Fetch course details
    const { data: course } = await serviceSupabase
      .from("courses")
      .select("id, code, title, description")
      .eq("id", course_id)
      .maybeSingle()

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const courseContext = `${course.code || ""} ${course.title || ""}`.trim()

    // 2. Query relevant past question materials & study materials for this course/topic
    const { data: materials } = await serviceSupabase
      .from("materials")
      .select("id, title, description, storage_path, source_url, tier")
      .eq("course_id", course_id)
      .limit(5)

    const sourcesAnalyzed: Array<{ id: string; title: string; tier: string }> = []
    let combinedSourceText = ""

    const workerBase = process.env.CLOUDFLARE_WORKER_URL || "https://medhaven-b2-proxy.v10.workers.dev"

    if (materials && materials.length > 0) {
      for (const mat of materials) {
        sourcesAnalyzed.push({
          id: mat.id,
          title: mat.title || "Untitled Resource",
          tier: mat.tier || "study",
        })

        if (mat.description) {
          combinedSourceText += `Resource Title: ${mat.title}\nDescription: ${mat.description}\n\n`
        }

        if (mat.storage_path) {
          try {
            const fetchUrl = `${workerBase}/${mat.storage_path}`
            const res = await fetch(fetchUrl)
            if (res.ok) {
              const isPdf = mat.storage_path.toLowerCase().endsWith(".pdf")
              if (isPdf) {
                const arrayBuf = await res.arrayBuffer()
                const pdfText = await extractTextFromPdfBuffer(arrayBuf)
                if (pdfText) {
                  combinedSourceText += `Source Content (${mat.title}):\n${pdfText.slice(0, 4000)}\n\n`
                }
              } else {
                const text = await res.text()
                if (text && text.length < 10000) {
                  combinedSourceText += `Source Content (${mat.title}):\n${text.slice(0, 3000)}\n\n`
                }
              }
            }
          } catch (fetchErr) {
            console.warn(`Failed to fetch material ${mat.id} for blueprint analysis:`, fetchErr)
          }
        }
      }
    }

    // Standard fallback context if no files exist or failed to fetch
    const sourceContentPrompt = combinedSourceText.trim()
      ? `Extracted Source Evidence:\n${combinedSourceText.slice(0, 8000)}`
      : `Note: No past question files were found attached. Perform pattern learning based on standard Nigerian MBBS / West African University examination standards for course "${courseContext}".`

    // 3. AI Analysis call to Groq
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY is missing on server" }, { status: 500 })
    }

    const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"

    const systemPrompt = `You are a Chief Medical Examiner and Curriculum Architect specializing in Nigerian MBBS and West African University medical board examination structures.
Your task is to conduct a ONE-TIME exam blueprint analysis for the specified course and topic based on source material evidence.

You MUST return strictly valid JSON matching this exact structure:
{
  "high_yield_concepts": ["concept 1", "concept 2", ...],
  "topic_weighting": {
    "core_pathology": 40,
    "diagnostics": 30,
    "therapeutics": 30
  },
  "exam_emphasis": "Detailed description of clinical vs factual emphasis and recurring themes for this examination framework.",
  "difficulty_patterns": "Analysis of difficulty progression, multi-step clinical reasoning expectations, and depth of knowledge required.",
  "reasoning_patterns": "Analysis of question-stem patterns, vignette structures, and clinical decision-making triggers.",
  "distractor_patterns": "Analysis of typical distractor styles, common clinical traps, and differential diagnosis mimickers used.",
  "recurring_concepts": ["recurring concept 1", "recurring concept 2"],
  "format_styles": {
    "MCQ": "MCQ stem length, True/False statement specificity, and fact/reasoning balance.",
    "SBA": "Clinical vignette length, diagnostic triggers, and option plausibility.",
    "Short_Answer": "Expected directness, key terms required, and mark allocation structure.",
    "OSCE": "Station scenario design, sub-question breakdown, and mark scheme expectation."
  }
}`

    const userPrompt = `Analyze exam pattern and construct a persistent Exam Blueprint for:
Course: ${courseContext}
Topic: ${targetTopic}

${sourceContentPrompt}

Return ONLY the JSON object conforming to the system prompt.`

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
        temperature: 0.4,
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      console.error("Groq AI blueprint analysis error:", errText)
      return NextResponse.json({ error: "Failed to analyze exam pattern with AI service" }, { status: 502 })
    }

    const groqData = await groqRes.json()
    const rawContent = groqData.choices?.[0]?.message?.content

    if (!rawContent) {
      return NextResponse.json({ error: "AI service returned empty analysis response" }, { status: 502 })
    }

    let parsed: any
    try {
      parsed = JSON.parse(rawContent)
    } catch (parseErr) {
      console.error("Failed to parse blueprint JSON:", rawContent)
      return NextResponse.json({ error: "AI response was not valid JSON" }, { status: 502 })
    }

    // 4. Save persistent Exam Blueprint into course_blueprints table
    const blueprintPayload = {
      course_id,
      topic: targetTopic,
      high_yield_concepts: Array.isArray(parsed.high_yield_concepts) ? parsed.high_yield_concepts : [],
      topic_weighting: parsed.topic_weighting && typeof parsed.topic_weighting === "object" ? parsed.topic_weighting : {},
      exam_emphasis: parsed.exam_emphasis || "Clinical vignette focus with high emphasis on diagnostics.",
      difficulty_patterns: parsed.difficulty_patterns || "Moderate to high difficulty with two-step clinical reasoning.",
      reasoning_patterns: parsed.reasoning_patterns || "Vignette-based stems triggering diagnostic or management choices.",
      distractor_patterns: parsed.distractor_patterns || "Highly plausible differential diagnosis choices.",
      recurring_concepts: Array.isArray(parsed.recurring_concepts) ? parsed.recurring_concepts : [],
      format_styles: parsed.format_styles && typeof parsed.format_styles === "object" ? parsed.format_styles : {},
      sources_analyzed: sourcesAnalyzed,
      updated_at: new Date().toISOString(),
    }

    const { data: savedBlueprint, error: upsertErr } = await serviceSupabase
      .from("course_blueprints")
      .upsert(blueprintPayload, { onConflict: "course_id,topic" })
      .select()
      .single()

    if (upsertErr) {
      console.error("Failed to save blueprint:", upsertErr)
      return NextResponse.json({ error: "Failed to save exam blueprint to database" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      blueprint: savedBlueprint,
    })
  } catch (err: any) {
    console.error("Unexpected error in POST blueprint:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
