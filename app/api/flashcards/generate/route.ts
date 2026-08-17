import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import * as pdfjs from "pdfjs-dist"

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
    const { course_id, topic, count } = body

    if (!course_id) {
      return NextResponse.json({ error: "Missing course_id in request body" }, { status: 400 })
    }

    // Define defaults
    const limitCount = count ? parseInt(count, 10) : 15
    const trimmedTopic = topic && String(topic).trim() !== "" ? String(topic).trim() : "General Review"

    // 3. Query existing flashcard decks & flashcards in Supabase (Cache Check)
    const { data: existingDeck, error: fetchError } = await supabase
      .from("flashcard_decks")
      .select(`
        id,
        course_id,
        topic,
        source,
        created_by,
        created_at,
        flashcards (
          id,
          front,
          back
        )
      `)
      .eq("course_id", course_id)
      .ilike("topic", trimmedTopic)
      .eq("source", "ai_generated")
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error("Error querying cached flashcard decks:", fetchError)
    }

    if (existingDeck && existingDeck.flashcards && existingDeck.flashcards.length > 0) {
      return NextResponse.json({
        deck_id: existingDeck.id,
        topic: existingDeck.topic,
        flashcards: existingDeck.flashcards.slice(0, limitCount),
        cached: true,
      })
    }

    // 4. Fetch Course details to provide better prompt context to Groq
    const { data: courseData } = await supabase
      .from("courses")
      .select("code, title")
      .eq("id", course_id)
      .maybeSingle()

    const courseContext = courseData
      ? `${courseData.code || ""} ${courseData.title || ""}`.trim()
      : "Medical Course"

    // 5. Query materials to see if we can find a Supabase PDF for this course
    const { data: materials } = await supabase
      .from("materials")
      .select("id, title, source_url, type")
      .eq("course_id", course_id)
      .eq("status", "published")

    const pdfMaterials = (materials || []).filter(
      (m) =>
        m.source_url?.includes("supabase.co/storage") &&
        (m.type?.toLowerCase() === "pdf" || m.source_url?.toLowerCase().endsWith(".pdf"))
    )

    let selectedPdf = null
    if (pdfMaterials.length > 0) {
      // Find one matching the topic or default to first
      selectedPdf = pdfMaterials.find(
        (m) =>
          m.title?.toLowerCase().includes(trimmedTopic.toLowerCase())
      )
      if (!selectedPdf) {
        selectedPdf = pdfMaterials[0]
      }
    }

    let pdfExcerpt = ""
    if (selectedPdf && selectedPdf.source_url) {
      try {
        const pdfResponse = await fetch(selectedPdf.source_url)
        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch PDF from storage: ${pdfResponse.statusText}`)
        }
        const arrayBuffer = await pdfResponse.arrayBuffer()
        const pdfData = new Uint8Array(arrayBuffer)

        // Parse PDF using pdfjs-dist
        const loadingTask = pdfjs.getDocument({ data: pdfData })
        const pdf = await loadingTask.promise

        let extractedText = ""
        const maxPagesToRead = Math.min(pdf.numPages, 5)
        for (let i = 1; i <= maxPagesToRead; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ")
          extractedText += pageText + "\n"

          if (extractedText.length > 3000) {
            break
          }
        }

        pdfExcerpt = extractedText.trim().slice(0, 2500)
        console.log(`Successfully extracted PDF snippet of length ${pdfExcerpt.length} from PDF: ${selectedPdf.title}`)
      } catch (pdfErr) {
        console.error("PDF text extraction failed, falling back to topic-only generation:", pdfErr)
        pdfExcerpt = ""
      }
    }

    // 6. Call the Groq API
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Groq API configuration missing on the server" }, { status: 500 })
    }

    let systemPrompt = `You are an expert medical educator. Your task is to generate high-yield active recall flashcards for medical students on the specified course and topic.
You must return strictly valid JSON. Do not include any markdown formatting, backticks, or explanatory text outside the JSON structure.

The response must be a single JSON object containing a key "flashcards", which is an array of exactly ${limitCount} flashcard objects.
Each flashcard object in the array must have exactly the following keys:
- "front": string (the active recall question, concept, or term. Make it concise, high-yield, and specific)
- "back": string (the clear, detailed explanation, definition, or key diagnostic/clinical answer)
`

    if (pdfExcerpt) {
      systemPrompt += `\nPrimary Source material (PDF Excerpt):
\"\"\"
${pdfExcerpt}
\"\"\"
You MUST prioritize this extracted PDF text as the primary source of truth for generating these cards, ensuring they match this specific course content. Only fallback to general medical knowledge if the PDF text is completely irrelevant to the requested topic.`
    }

    const userPrompt = `Generate exactly ${limitCount} medical flashcards for:
Course: ${courseContext}
Topic: ${trimmedTopic}

Remember, return strictly a JSON object with a "flashcards" array of exactly ${limitCount} objects matching the structural requirements.`

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error("Groq API error response:", errorText)
      return NextResponse.json({ error: "Failed to generate flashcards from AI service" }, { status: 502 })
    }

    const groqData = await groqResponse.json()
    const rawContent = groqData.choices?.[0]?.message?.content

    if (!rawContent) {
      return NextResponse.json({ error: "AI service returned an empty response" }, { status: 502 })
    }

    let parsed: any
    try {
      parsed = JSON.parse(rawContent)
    } catch (parseErr) {
      console.error("Failed to parse Groq response content as JSON. Raw content:", rawContent)
      return NextResponse.json({ error: "AI generated an invalid JSON response structure" }, { status: 502 })
    }

    let cardsArray = parsed.flashcards || parsed
    if (!Array.isArray(cardsArray) && parsed && typeof parsed === "object") {
      const foundArrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]))
      if (foundArrayKey) {
        cardsArray = parsed[foundArrayKey]
      }
    }

    if (!Array.isArray(cardsArray) || cardsArray.length === 0) {
      return NextResponse.json({ error: "AI response did not contain a valid array of flashcards" }, { status: 502 })
    }

    // Validate structure of cards
    const validatedCards: any[] = []
    for (const c of cardsArray) {
      if (!c.front || !c.back) {
        continue
      }
      validatedCards.push({
        front: String(c.front).trim(),
        back: String(c.back).trim(),
      })
    }

    if (validatedCards.length === 0) {
      return NextResponse.json({ error: "AI failed to produce any valid flashcards" }, { status: 502 })
    }

    // 7. Insert new deck into Supabase
    const { data: newDeck, error: insertDeckError } = await supabase
      .from("flashcard_decks")
      .insert({
        course_id,
        topic: trimmedTopic,
        source: "ai_generated",
        created_by: null,
      })
      .select("id")
      .single()

    if (insertDeckError || !newDeck) {
      console.error("Failed to insert new flashcard deck:", insertDeckError)
      return NextResponse.json({ error: "Failed to save generated deck record to the database" }, { status: 500 })
    }

    // 8. Insert flashcards linked via deck_id
    const cardsToInsert = validatedCards.map((c) => ({
      deck_id: newDeck.id,
      front: c.front,
      back: c.back,
    }))

    const { data: insertedCards, error: insertCardsError } = await supabase
      .from("flashcards")
      .insert(cardsToInsert)
      .select("id, front, back")

    if (insertCardsError || !insertedCards || insertedCards.length === 0) {
      console.error("Failed to insert flashcards:", insertCardsError)
      // Clean up deck if cards fail to save
      await supabase.from("flashcard_decks").delete().eq("id", newDeck.id)
      return NextResponse.json({ error: "Failed to save generated flashcards to the database" }, { status: 500 })
    }

    return NextResponse.json({
      deck_id: newDeck.id,
      topic: trimmedTopic,
      flashcards: insertedCards,
      cached: false,
    })
  } catch (err: any) {
    console.error("Unexpected error generating flashcards:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
