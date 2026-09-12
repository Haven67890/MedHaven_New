import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateAIQuestionsBatch } from "@/lib/quiz-engine"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { course_id, topic, format = "SBA", count = 5 } = body

    if (!course_id || !topic) {
      return NextResponse.json({ error: "Missing required fields: course_id, topic" }, { status: 400 })
    }

    const { data: courseData } = await supabase
      .from("courses")
      .select("code, title")
      .eq("id", course_id)
      .maybeSingle()

    const courseCodeTitle = courseData ? `${courseData.code || ""} ${courseData.title || ""}` : "Medical Course"

    // Generate candidate batch
    const batch = await generateAIQuestionsBatch({
      courseCodeTitle,
      topic,
      format,
      count: Math.min(Math.max(count, 1), 10)
    })

    if (batch.length === 0) {
      return NextResponse.json({ error: "Failed to generate valid candidate questions" }, { status: 500 })
    }

    // Insert into question_bank with status='draft'
    const toInsert = batch.map((q) => ({
      course_id,
      topic,
      format: q.format,
      question_text: q.question,
      options: q.options || [],
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      tf_options: q.tf_options || null,
      sub_questions: q.sub_questions || null,
      high_yield_weight: 1.0,
      provenance: q.provenance || { source: "admin_ai_generation" },
      question_fingerprint: q.question_fingerprint,
      status: "draft"
    }))

    const { data: inserted, error: insertError } = await supabase
      .from("question_bank")
      .insert(toInsert)
      .select("id, question_text, format, status")

    if (insertError) {
      console.error("Failed to insert draft candidates into question_bank:", insertError)
      return NextResponse.json({ error: "Failed to store candidates in question bank" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      generated_count: inserted?.length || 0,
      candidates: inserted
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}
