import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Missing or invalid messages array in request body" }, { status: 400 })
    }

    // 3. Prepare the API Key
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Groq API configuration missing on the server" }, { status: 500 })
    }

    // 4. Define specialized JUTH MBBS System Prompt
    const systemPrompt = {
      role: "system",
      content: "You are MedHaven AI, a dedicated, helpful, and highly accurate medical study assistant specialized for MBBS students at Jos University Teaching Hospital (JUTH). " +
               "Your purpose is to assist students with their coursework, medical concepts, ward-round preparations, and clinical scenarios. " +
               "Always encourage students to check primary medical literature, local clinical guidelines, and standard textbooks (e.g., Davidson's, Bailey & Love, Kumar & Clark, or local JUTH lecture notes). " +
               "Remind students that your guidance is purely for educational support and does not replace the instructions of JUTH lecturers, consultants, or independent clinical judgment. " +
               "Where applicable, tailor clinical advice to Nigerian epidemiological and resource-limited contexts (e.g., tuberculosis management, malaria treatment guidelines, or sickle cell disease management)."
    }

    // Combine system prompt and incoming conversation history
    const apiMessages = [
      systemPrompt,
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").trim()
      }))
    ]

    // 5. Call the Groq API
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error("Groq API error response:", errorText)
      return NextResponse.json({ error: "Failed to fetch response from MedHaven AI service" }, { status: 502 })
    }

    const groqData = await groqResponse.json()
    const assistantContent = groqData.choices?.[0]?.message?.content

    if (!assistantContent) {
      return NextResponse.json({ error: "MedHaven AI service returned an empty response" }, { status: 502 })
    }

    return NextResponse.json({ content: assistantContent })
  } catch (err: any) {
    console.error("Unexpected error in chat assistant route:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
