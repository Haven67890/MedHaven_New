import { NextResponse } from "next/server"
import crypto from "crypto"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/config"
import { generateOSCEStationsBatch, type OSCESpecimenImage, type OSCEStation } from "@/lib/osce-engine"

function generateQuestionFingerprint(questionText: string, imageBankId: string): string {
  const norm = `${questionText.trim().toLowerCase()}::${imageBankId}`
  return crypto.createHash("sha256").update(norm).digest("hex")
}

export async function POST(req: Request) {
  try {
    const userClient = await createServerClient()
    const {
      data: { user },
      error: userError
    } = await userClient.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const {
      course_id,
      station_count = 5,
      category,
      duration_seconds = 60
    } = body

    if (!course_id) {
      return NextResponse.json({ error: "course_id is required" }, { status: 400 })
    }

    const limitCount = Math.min(Math.max(Number(station_count) || 5, 1), 10)
    const serviceDb = createServiceClient() || userClient

    // Fetch course details
    const { data: course, error: courseError } = await serviceDb
      .from("courses")
      .select("id, code, title, level")
      .eq("id", course_id)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 404 })
    }

    const courseCodeTitle = `${course.code || ""} ${course.title || ""}`.trim()

    // Query quiz_image_bank for active medical images
    let imageQuery = serviceDb
      .from("quiz_image_bank")
      .select("id, course_id, title, image_url, category, correct_findings, differential_diagnosis, source, question")
      .eq("status", "active")

    if (category) {
      imageQuery = imageQuery.eq("category", category)
    }

    // Try course-specific images first
    let { data: images } = await imageQuery.eq("course_id", course_id)

    // Fall back to all active images if fewer than requested
    if (!images || images.length < limitCount) {
      let fallbackQuery = serviceDb
        .from("quiz_image_bank")
        .select("id, course_id, title, image_url, category, correct_findings, differential_diagnosis, source, question")
        .eq("status", "active")

      if (category) {
        fallbackQuery = fallbackQuery.eq("category", category)
      }

      const { data: globalImages } = await fallbackQuery
      images = globalImages || []
    }

    if (!images || images.length === 0) {
      return NextResponse.json({
        error: "No active specimen or diagnostic images found in quiz_image_bank for OSCE assessment."
      }, { status: 404 })
    }

    // Shuffle and pick target count of images
    const shuffledImages: OSCESpecimenImage[] = [...images]
      .sort(() => Math.random() - 0.5)
      .slice(0, limitCount)

    // Check for existing OSCE stations in question_bank linked to these image_bank_ids
    const imageIds = shuffledImages.map(img => img.id)
    const { data: existingStations } = await serviceDb
      .from("question_bank")
      .select("id, image_bank_id, question_text, sub_questions, correct_answer, explanation, topic, difficulty, question_fingerprint")
      .eq("format", "OSCE")
      .in("image_bank_id", imageIds)

    const existingByImageId = new Map<string, any>()
    if (existingStations) {
      existingStations.forEach(st => {
        if (st.image_bank_id && !existingByImageId.has(st.image_bank_id)) {
          existingByImageId.set(st.image_bank_id, st)
        }
      })
    }

    const imagesNeedingAi: OSCESpecimenImage[] = []
    const readyStationsMap = new Map<string, any>()

    shuffledImages.forEach(img => {
      if (existingByImageId.has(img.id)) {
        readyStationsMap.set(img.id, existingByImageId.get(img.id))
      } else {
        imagesNeedingAi.push(img)
      }
    })

    // Generate AI stations for images without cached question_bank records
    if (imagesNeedingAi.length > 0) {
      try {
        const generatedAiStations = await generateOSCEStationsBatch({
          courseCodeTitle,
          images: imagesNeedingAi
        })

        generatedAiStations.forEach(st => {
          readyStationsMap.set(st.image_bank_id, st)
        })
      } catch (aiErr) {
        console.warn("AI OSCE Station generation failed, using structured image fallback:", aiErr)
        imagesNeedingAi.forEach(img => {
          if (!readyStationsMap.has(img.id)) {
            const fallbackStation: OSCEStation = {
              image_bank_id: img.id,
              question_text: `Station: ${img.title}\n\nStudy the provided image carefully and answer the follow-up tasks.`,
              topic: img.category || "Clinical OSCE",
              sub_questions: [
                {
                  question: img.question || "Identify the main abnormality or feature demonstrated in this image.",
                  expected_answer: img.correct_findings,
                  explanation: "Key diagnostic finding demonstrated on image."
                },
                ...(img.differential_diagnosis ? [{
                  question: "State the main differential diagnoses or associated clinical features.",
                  expected_answer: img.differential_diagnosis,
                  explanation: "Important differential diagnostic considerations."
                }] : [{
                  question: "State the primary clinical management or next diagnostic investigation step.",
                  expected_answer: "Obtain targeted clinical history, focused examination, and definitive confirmatory evaluation.",
                  explanation: "Standard clinical approach."
                }])
              ],
              correct_answer: img.correct_findings,
              explanation: `Diagnostic Summary: ${img.correct_findings}`
            }
            readyStationsMap.set(img.id, fallbackStation)
          }
        })
      }
    }

    // Persist newly generated stations into question_bank
    const finalStationsToPersist: any[] = []
    for (const img of shuffledImages) {
      const st = readyStationsMap.get(img.id)
      if (!st.id) { // New station generated, needs database sync
        const fingerprint = generateQuestionFingerprint(st.question_text, img.id)
        const bankPayload = {
          course_id,
          topic: st.topic || "Clinical OSCE",
          format: "OSCE",
          question_text: st.question_text,
          sub_questions: st.sub_questions,
          correct_answer: st.correct_answer,
          explanation: st.explanation,
          image_bank_id: img.id,
          question_fingerprint: fingerprint,
          status: "active",
          provenance: { source: "ai_generated_osce", created_at: new Date().toISOString() }
        }

        const { data: insertedBank, error: insertBankError } = await serviceDb
          .from("question_bank")
          .insert(bankPayload)
          .select("id, image_bank_id, question_text, sub_questions, correct_answer, explanation, topic")
          .single()

        if (!insertBankError && insertedBank) {
          readyStationsMap.set(img.id, insertedBank)
        }
      }
    }

    // Create session record in `quizzes`
    const { data: quizSession, error: quizSessionError } = await serviceDb
      .from("quizzes")
      .insert({
        course_id,
        topic: `${courseCodeTitle} OSCE Assessment`,
        format: "OSCE"
      })
      .select("id")
      .single()

    if (quizSessionError || !quizSession) {
      console.error("Failed to create OSCE quiz session:", quizSessionError)
      return NextResponse.json({ error: "Failed to record OSCE session" }, { status: 500 })
    }

    // Prepare records for `quiz_questions`
    const quizQuestionsToInsert = shuffledImages.map((img) => {
      const st = readyStationsMap.get(img.id)
      return {
        quiz_id: quizSession.id,
        question_bank_id: st.id || null,
        image_bank_id: img.id,
        question_text: st.question_text,
        sub_questions: st.sub_questions,
        correct_answer: st.correct_answer,
        explanation: st.explanation || "OSCE Station Evaluation Key"
      }
    })

    const { data: insertedQuizQuestions, error: insertQuizQuestionsError } = await serviceDb
      .from("quiz_questions")
      .insert(quizQuestionsToInsert)
      .select("id, question_bank_id, image_bank_id, question_text, sub_questions, correct_answer, explanation")

    if (insertQuizQuestionsError || !insertedQuizQuestions) {
      console.error("Failed to insert OSCE quiz questions:", insertQuizQuestionsError)
      await serviceDb.from("quizzes").delete().eq("id", quizSession.id)
      return NextResponse.json({ error: "Failed to save OSCE questions to session" }, { status: 500 })
    }

    // Map inserted quiz questions with their corresponding image records
    const finalFormattedStations = insertedQuizQuestions.map((qq: any, idx: number) => {
      const img = shuffledImages[idx]
      return {
        id: qq.id,
        question_bank_id: qq.question_bank_id,
        image_bank_id: qq.image_bank_id,
        question_text: qq.question_text,
        sub_questions: qq.sub_questions,
        correct_answer: qq.correct_answer,
        explanation: qq.explanation,
        image_bank: img
      }
    })

    return NextResponse.json({
      quiz_id: quizSession.id,
      stations: finalFormattedStations,
      course_id,
      course_title: courseCodeTitle,
      duration_seconds,
      count: finalFormattedStations.length
    })
  } catch (err: any) {
    console.error("OSCE generation API error:", err)
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}
