import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

async function ensureTablesExist(supabaseAdmin: ReturnType<typeof createServiceClient>) {
  try {
    await supabaseAdmin.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS ai_conversations (
          id uuid primary key default gen_random_uuid(),
          user_id uuid references profiles(id) on delete cascade,
          messages jsonb not null default '[]',
          topic_tags text[] default '{}',
          created_at timestamptz default now(),
          updated_at timestamptz default now()
        );
        CREATE INDEX IF NOT EXISTS ai_conversations_user_id_idx ON ai_conversations(user_id);

        CREATE TABLE IF NOT EXISTS ai_feedback (
          id uuid primary key default gen_random_uuid(),
          user_id uuid references profiles(id),
          conversation_id uuid references ai_conversations(id),
          message_index int,
          rating int check (rating in (1, -1)),
          created_at timestamptz default now()
        );
      `
    })
  } catch (_e) {
    // If exec_sql RPC is unavailable, Supabase table queries will fallback or fail gracefully
  }
}

function extractTopicTags(messages: any[]): string[] {
  const text = messages.map((m: any) => String(m.content || "")).join(" ").toLowerCase()
  const candidateTopics = [
    "anatomy", "physiology", "biochemistry", "pharmacology", "pathology",
    "microbiology", "haematology", "chemical pathology", "histopathology",
    "medicine", "surgery", "paediatrics", "obstetrics", "gynaecology",
    "psychiatry", "radiology", "anaesthesia", "ent", "ophthalmology",
    "community medicine", "family medicine", "cardiology", "neurology",
    "gastroenterology", "pulmonology", "nephrology", "endocrinology",
    "dermatology", "rheumatology", "urology", "orthopaedics"
  ]

  const matched = candidateTopics.filter((topic) => text.includes(topic))
  return Array.from(new Set(matched))
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json().catch(() => ({}))
    const { messages: clientMessages, conversation_id } = body

    if (!clientMessages || !Array.isArray(clientMessages)) {
      return NextResponse.json({ error: "Missing or invalid messages array in request body" }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Groq API configuration missing on the server" }, { status: 500 })
    }

    const supabaseAdmin = createServiceClient()
    await ensureTablesExist(supabaseAdmin)

    // 3. Gather Student Context
    // a. Profile details
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, current_level, department, university_id, faculty_id")
      .eq("id", user.id)
      .maybeSingle()

    const studentName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Medical Student"
      : "Medical Student"
    const studentLevel = profile?.current_level || "MBBS Student"
    const studentProgramme = profile?.department || "Medicine & Surgery (MBBS)"

    // b. University
    let studentUniversity = "University of Jos (UNIJOS)"
    if (profile?.university_id) {
      const { data: uni } = await supabaseAdmin
        .from("universities")
        .select("name")
        .eq("id", profile.university_id)
        .maybeSingle()
      if (uni?.name) studentUniversity = uni.name
    }

    // c. Courses this semester / level
    let studentCourses = "MBBS Core Courses"
    const { data: levelCourses } = await supabaseAdmin
      .from("courses")
      .select("code, name")
      .eq("level", profile?.current_level || "")
      .limit(10)

    if (levelCourses && levelCourses.length > 0) {
      studentCourses = levelCourses.map((c) => `${c.code} - ${c.name}`).join(", ")
    }

    // d. Weak Areas from quiz_attempts (<60% in last 30 days)
    let weakAreas = ""
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: quizAttempts } = await supabaseAdmin
      .from("quiz_attempts")
      .select("score, total_questions, topic")
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysAgo)

    if (quizAttempts && quizAttempts.length > 0) {
      const weakTopicsSet = new Set<string>()
      quizAttempts.forEach((attempt: any) => {
        const percentage = (attempt.score / (attempt.total_questions || 1)) * 100
        if (percentage < 60 && attempt.topic) {
          weakTopicsSet.add(attempt.topic)
        }
      })
      if (weakTopicsSet.size > 0) {
        weakAreas = Array.from(weakTopicsSet).slice(0, 5).join(", ")
      }
    }

    // e. Recent topics from ai_conversations
    let recentTopics = ""
    const { data: existingConvs } = await supabaseAdmin
      .from("ai_conversations")
      .select("topic_tags")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5)

    if (existingConvs && existingConvs.length > 0) {
      const allTags = new Set<string>()
      existingConvs.forEach((c: any) => {
        if (Array.isArray(c.topic_tags)) {
          c.topic_tags.forEach((tag: string) => allTags.add(tag))
        }
      })
      if (allTags.size > 0) {
        recentTopics = Array.from(allTags).slice(0, 5).join(", ")
      }
    }

    // 4. Construct System Prompt
    const systemPromptContent = `
You are MedHaven AI, an advanced medical education assistant built specifically for MBBS students in Nigerian medical schools, primarily University of Jos (UNIJOS) and JUTH clinical settings.
You are not a general AI — you are a specialised clinical tutor.

## YOUR IDENTITY
- Expert-level knowledge across all MBBS subjects: Anatomy, Physiology, Biochemistry, Pharmacology, Pathology, Microbiology, Haematology, Chemical Pathology, Histopathology, Medicine, Surgery, Paediatrics, OBG, Psychiatry, Radiology, Anaesthesia, ENT, Ophthalmology, Community Medicine, and Family Medicine.
- You understand the Nigerian medical education system — MBBS examinations, JUTH ward round culture, clinical posting requirements, and locally relevant disease presentations (tropical diseases, sickle cell disease, malaria, TB prevalence, common Nigerian presentations).
- You speak like a knowledgeable senior colleague or registrar, not like a textbook or a general AI.

## STUDENT CONTEXT
You are currently speaking with:
- Name: ${studentName}
- Academic level: ${studentLevel} (MBBS year)
- Programme: ${studentProgramme}
- University: ${studentUniversity}
- Courses this semester: ${studentCourses}
${weakAreas ? `- Known weak areas based on quiz performance: ${weakAreas}` : ''}
${recentTopics ? `- Recently studied topics: ${recentTopics}` : ''}

Adapt your explanation depth and clinical relevance to this student's level. A 200L student needs foundational science explanations. A 500L/600L student needs clinical reasoning, ward-ready answers, and exam-focused depth.

## HOW TO STRUCTURE RESPONSES

For CLINICAL TOPICS always follow this structure where applicable:
1. **Definition/Overview** — concise, accurate
2. **Aetiology/Pathophysiology** — mechanism clearly explained
3. **Clinical Features** — symptoms, signs (use mnemonics where helpful)
4. **Investigations** — what to order and why, expected findings
5. **Diagnosis** — how to confirm
6. **Management** — medical, surgical, or both. Include Nigerian context (what's actually available at JUTH/federal hospitals)
7. **Complications**
8. **Prognosis**
9. **Key Exam Points** — what would actually come up in MBBS finals

For BASIC SCIENCE TOPICS (anatomy, physiology, biochemistry):
- Use diagrams described in text, clear step-by-step explanations
- Relate to clinical relevance ("why does this matter clinically?")
- Use mnemonics freely

For PERSONAL/WELLBEING questions:
- Be supportive, honest, and human
- Acknowledge the pressure of medical school
- Give practical advice without being dismissive

## RESPONSE STYLE
- Use **bold** for key terms, diagnoses, drug names
- Use tables ONLY for these specific situations:
  - Direct side-by-side comparison of 3+ differentials
  - Drug class comparisons (mechanism, indication, side effects)
  - Staging systems (TNM, Child-Pugh, etc.)
  - Investigation interpretation ranges
  For everything else — clinical features, pathophysiology, management steps, explanations — use structured prose with headers and bullet points. A well-written paragraph is better than a table with mostly repeated information. Never use a table when a numbered list or bold headers would work.
- Use numbered lists for steps, lettered lists for options
- Use > blockquotes for important warnings or exam tips
- Include relevant mnemonics in a highlighted blockquote
- Keep responses comprehensive but scannable — not walls of text
- End responses with 3 suggested follow-up questions the student might want to ask next, formatted as:

---
**Want to explore further?**
1. [follow-up question 1]
2. [follow-up question 2]
3. [follow-up question 3]

## CITATIONS AND EVIDENCE
When you cite a fact that might be questioned, mention the source:
"According to Harrison's Principles of Internal Medicine..."
"The WHO 2023 guidelines recommend..."
"In the Nigerian context, FMOH protocols suggest..."
When you search the web for current information, always mention what you found and where.

## IMAGES
When an image would genuinely help understanding, write exactly this format on its own line:
![Descriptive caption for the image](MEDICAL_IMAGE:specific search term)
Example: ![Cross-section of normal liver lobule](MEDICAL_IMAGE:liver histology lobule H&E stain)
Only use this for genuinely visual topics — anatomy diagrams, histology slides, clinical signs, ECG patterns, radiology.
Do not use it for pharmacology mechanisms or non-visual topics.

## LIMITATIONS
- You are an educational tool, not a diagnostic service
- Always encourage students to verify critical clinical decisions with their supervisors
- For drug dosages in real patients, always recommend checking current BNF or hospital formulary
- Append this disclaimer only when discussing clinical management of real patients (not when discussing academic topics):
  "⚠️ Always verify clinical decisions with your supervisor."
`

    // 5. Load past messages if conversation_id exists or slice last 10 messages from request
    let historyMessages = clientMessages.slice(-10)

    if (conversation_id) {
      const { data: convData } = await supabaseAdmin
        .from("ai_conversations")
        .select("messages")
        .eq("id", conversation_id)
        .eq("user_id", user.id)
        .maybeSingle()

      if (convData && Array.isArray(convData.messages) && convData.messages.length > 0) {
        // combine conversation history with current client messages avoiding dupes
        historyMessages = convData.messages.slice(-10)
        const lastClientMsg = clientMessages[clientMessages.length - 1]
        if (lastClientMsg && lastClientMsg.role === "user") {
          historyMessages.push(lastClientMsg)
        }
      }
    }

    const apiMessages = [
      { role: "system", content: systemPromptContent },
      ...historyMessages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").trim()
      }))
    ]

    // 6. Call Groq API with Web Search Tool support (with fallback if unsupported)
    const requestPayload: any = {
      model: "openai/gpt-oss-20b",
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 1800,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search"
        }
      ]
    }

    let groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    })

    let searchedWebQuery: string | null = null

    // Fallback: If model doesn't support tools or throws 400 invalid parameter for tools
    if (!groqResponse.ok) {
      const errBody = await groqResponse.text()
      console.warn("Groq initial request with web search failed:", errBody)

      delete requestPayload.tools
      groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      })
    }

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error("Groq API error response:", errorText)
      return NextResponse.json({ error: "Failed to fetch response from MedHaven AI service" }, { status: 502 })
    }

    const groqData = await groqResponse.json()
    const choice = groqData.choices?.[0]
    let assistantContent = choice?.message?.content

    // Handle tool call results if tool calls were triggered
    const toolCalls = choice?.message?.tool_calls
    if (toolCalls && toolCalls.length > 0) {
      const webSearchCall = toolCalls.find((t: any) => t.function?.name === "web_search" || t.type === "web_search_20250305")
      if (webSearchCall) {
        try {
          const args = JSON.parse(webSearchCall.function?.arguments || "{}")
          searchedWebQuery = args.query || args.q || "medical literature search"
        } catch (_e) {
          searchedWebQuery = "medical literature search"
        }
      }
    }

    if (!assistantContent && !searchedWebQuery) {
      return NextResponse.json({ error: "MedHaven AI service returned an empty response" }, { status: 502 })
    }

    if (!assistantContent) {
      assistantContent = "Based on current medical literature and search findings, here is the information requested."
    }

    // 7. Save conversation & topic tags in database
    const updatedConversationMessages = [
      ...historyMessages,
      { role: "assistant", content: assistantContent }
    ]
    const extractedTags = extractTopicTags(updatedConversationMessages)

    let savedConvId = conversation_id
    if (savedConvId) {
      await supabaseAdmin
        .from("ai_conversations")
        .update({
          messages: updatedConversationMessages,
          topic_tags: extractedTags,
          updated_at: new Date().toISOString()
        })
        .eq("id", savedConvId)
        .eq("user_id", user.id)
    } else {
      const { data: newConv } = await supabaseAdmin
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          messages: updatedConversationMessages,
          topic_tags: extractedTags
        })
        .select("id")
        .maybeSingle()

      if (newConv?.id) {
        savedConvId = newConv.id
      }
    }

    return NextResponse.json({
      content: assistantContent,
      conversationId: savedConvId,
      searchedWebQuery,
      studentName,
      studentLevel
    })
  } catch (err: any) {
    console.error("Unexpected error in chat assistant route:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
