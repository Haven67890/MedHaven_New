import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { generateOSCEStationsBatch, type OSCESpecimenImage, type OSCEStation } from "@/lib/osce-engine"

function generateQuestionFingerprint(questionText: string, imageBankId: string): string {
  const norm = `${questionText.toLowerCase().trim()}_${imageBankId}`
  return crypto.createHash("sha256").update(norm).digest("hex")
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { course_id, limit = 5 } = body

    let serviceSupabase
    try {
      serviceSupabase = createServiceClient()
    } catch {
      serviceSupabase = supabase
    }

    // 1. Fetch active specimen images from quiz_image_bank
    let query = serviceSupabase
      .from("quiz_image_bank")
      .select(`
        id,
        course_id,
        title,
        image_url,
        category,
        correct_findings,
        differential_diagnosis,
        source,
        question,
        courses ( id, code, title, level )
      `)
      .eq("status", "active")

    if (course_id) {
      query = query.eq("course_id", course_id)
    }

    const { data: rawImages, error: imagesError } = await query.limit(30)

    if (imagesError) {
      console.error("Error fetching quiz_image_bank images for OSCE:", imagesError)
      return NextResponse.json({ error: "Failed to load specimen images" }, { status: 500 })
    }

    if (!rawImages || rawImages.length === 0) {
      return NextResponse.json({
        error: "No active specimen images found in quiz_image_bank. Please add or publish medical images first."
      }, { status: 404 })
    }

    // Shuffle and pick requested limit
    const shuffled = [...rawImages].sort(() => 0.5 - Math.random()).slice(0, Number(limit) || 5)

    const specimenImages: OSCESpecimenImage[] = shuffled.map((img: any) => ({
      id: img.id,
      course_id: img.course_id,
      title: img.title || "Specimen Image",
      image_url: img.image_url,
      category: img.category || "Clinical Medicine",
      correct_findings: img.correct_findings || "Identification features.",
      differential_diagnosis: img.differential_diagnosis,
      source: img.source,
      question: img.question
    }))

    const firstCourseCode = (shuffled[0]?.courses as any)?.code || "MED 601"
    const firstCourseTitle = (shuffled[0]?.courses as any)?.title || "Medicine & Surgery 600L"
    const courseCodeTitle = `${firstCourseCode} - ${firstCourseTitle}`

    // 2. Generate OSCE stations with AI
    let generatedStations: OSCEStation[] = []
    try {
      generatedStations = await generateOSCEStationsBatch({
        courseCodeTitle,
        images: specimenImages
      })
    } catch (aiErr: any) {
      console.warn("AI OSCE generation failed, falling back to direct image bank stations:", aiErr?.message || aiErr)
    }

    // Fallback if AI generation failed or returned incomplete
    if (!generatedStations || generatedStations.length === 0) {
      generatedStations = specimenImages.map((img) => ({
        image_bank_id: img.id,
        topic: img.category || "Clinical OSCE",
        question_text: `Examine the clinical specimen/radiology image below. Identify key findings and answer the tasks.`,
        sub_questions: [
          {
            question: "1. Identify the principal structure or diagnostic abnormality demonstrated.",
            expected_answer: img.correct_findings,
            explanation: `Key findings: ${img.correct_findings}`
          },
          {
            question: "2. State two important clinical differential diagnoses or associated complications.",
            expected_answer: img.differential_diagnosis || "Noted in clinical presentation.",
            explanation: `Differentials: ${img.differential_diagnosis || "Clinical evaluation required."}`
          }
        ],
        correct_answer: img.correct_findings,
        explanation: `Findings: ${img.correct_findings}. Differentials: ${img.differential_diagnosis || "None"}`
      }))
    }

    // Attach full image object to each station
    const fullStations = generatedStations.map((st) => {
      const img = specimenImages.find((i) => i.id === st.image_bank_id) || specimenImages[0]
      return {
        ...st,
        image_bank: img
      }
    })

    // 3. Save quiz record in `quizzes`
    let quizId: string | null = null
    const targetCourseId = course_id || specimenImages[0]?.course_id || null

    if (targetCourseId) {
      const { data: newQuiz, error: quizInsertError } = await serviceSupabase
        .from("quizzes")
        .insert({
          course_id: targetCourseId,
          topic: `OSCE Practical Exam — ${firstCourseCode}`,
          format: "osce"
        })
        .select("id")
        .single()

      if (!quizInsertError && newQuiz) {
        quizId = newQuiz.id

        // Insert questions into `quiz_questions`
        const questionRows = fullStations.map((st) => ({
          quiz_id: quizId,
          question_text: st.question_text,
          options: [],
          correct_answer: st.correct_answer,
          explanation: st.explanation,
          image_bank_id: st.image_bank_id,
          sub_questions: st.sub_questions
        }))

        await serviceSupabase.from("quiz_questions").insert(questionRows)
      }
    }

    return NextResponse.json({
      quiz_id: quizId,
      stations: fullStations
    })
  } catch (err: any) {
    console.error("Error in POST /api/osce/generate:", err)
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}
