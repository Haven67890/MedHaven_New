import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { selectQuizQuestions } from "@/lib/quiz-selection"

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
    const { course_id } = body
    let { topic, format, count } = body

    if (!course_id) {
      return NextResponse.json({ error: "Missing course_id in request body" }, { status: 400 })
    }

    // Define defaults
    const chosenFormat = format ? String(format).trim() : "MCQ"
    const limitCount = count ? parseInt(count, 10) : 10
    const trimmedTopic = topic && String(topic).trim() !== "" ? String(topic).trim() : "General Course Review"

    const validFormats = ["MCQ", "SBA", "OSCE", "Short Answer"]
    if (!validFormats.includes(chosenFormat)) {
      return NextResponse.json({ error: `Invalid format: ${chosenFormat}` }, { status: 400 })
    }

    // 3. Select questions directly from Database Question Bank (Zero Groq/PDF dependency)
    const { questions: bankQuestions } = await selectQuizQuestions(supabase, {
      userId: user.id,
      courseId: course_id,
      topic: trimmedTopic,
      format: chosenFormat as any,
      count: limitCount,
    })

    if (!bankQuestions || bankQuestions.length === 0) {
      return NextResponse.json(
        {
          error: `No active questions found in the Question Bank for course and format (${chosenFormat}). Please try another topic or format.`,
        },
        { status: 404 }
      )
    }

    const selectedQuestions = bankQuestions.slice(0, limitCount)

    // 4. Create new quiz session record in `quizzes` table
    const { data: newQuiz, error: insertQuizError } = await supabase
      .from("quizzes")
      .insert({
        course_id,
        topic: trimmedTopic,
        format: chosenFormat,
      })
      .select("id")
      .single()

    if (insertQuizError || !newQuiz) {
      console.error("Failed to insert new quiz:", insertQuizError)
      return NextResponse.json({ error: "Failed to save quiz record to database" }, { status: 500 })
    }

    // 5. Insert mapped questions into `quiz_questions` for frontend backward-compatibility
    const questionsToInsert = selectedQuestions.map((q) => ({
      quiz_id: newQuiz.id,
      question_text: q.question_text,
      options: q.options || [],
      correct_answer: q.correct_answer,
      explanation: q.explanation || "",
      tf_options: q.tf_options || null,
      sub_questions: q.sub_questions || null,
      image_bank_id: q.image_bank_id || null,
    }))

    const { data: insertedQuestions, error: insertQuestionsError } = await supabase
      .from("quiz_questions")
      .insert(questionsToInsert)
      .select("id, question_text, options, correct_answer, explanation, tf_options, sub_questions, image_bank_id")

    if (insertQuestionsError || !insertedQuestions || insertedQuestions.length === 0) {
      console.error("Failed to insert quiz questions:", insertQuestionsError)
      await supabase.from("quizzes").delete().eq("id", newQuiz.id)
      return NextResponse.json({ error: "Failed to link questions to quiz record" }, { status: 500 })
    }

    const formattedQuestions = insertedQuestions.map((q: any, idx: number) => {
      const originalBankQ = selectedQuestions[idx]
      return {
        id: q.id,
        question_bank_id: originalBankQ?.id,
        question: q.question_text,
        options: q.options || [],
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        tf_options: q.tf_options || null,
        sub_questions: q.sub_questions || null,
        image_bank_id: q.image_bank_id || null,
        quiz_image_bank: originalBankQ?.quiz_image_bank || null,
      }
    })

    return NextResponse.json({
      quiz_id: newQuiz.id,
      questions: formattedQuestions,
      cached: false,
    })
  } catch (err: any) {
    console.error("Unexpected error fetching database quiz:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
