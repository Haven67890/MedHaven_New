import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  selectBankQuestions,
  generateAIQuestionsBatch,
  ValidatedQuestion
} from "@/lib/quiz-engine"

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
    let { topic, format, count, mode } = body

    if (!course_id) {
      return NextResponse.json({ error: "Missing course_id in request body" }, { status: 400 })
    }

    // Enforce strictly 5 or 10 questions limit
    let limitCount = count ? parseInt(count, 10) : 10
    if (isNaN(limitCount) || limitCount <= 5) {
      limitCount = 5
    } else {
      limitCount = 10
    }

    const chosenFormat = format ? String(format).trim() : "MCQ"
    const trimmedTopic = topic && String(topic).trim() !== "" ? String(topic).trim() : "General Course Review"
    const quizMode = mode === "practice" || mode === "mixed" ? mode : "ai"

    // 3. Fetch Course details
    const { data: courseData } = await supabase
      .from("courses")
      .select("code, title")
      .eq("id", course_id)
      .maybeSingle()

    const courseCodeTitle = courseData
      ? `${courseData.code || ""} ${courseData.title || ""}`.trim()
      : "Medical Course"

    let finalQuestions: ValidatedQuestion[] = []
    let usedFallback = false
    let fallbackReason = ""
    let matchLevel = "exact_topic"

    // -----------------------------------------------------------------
    // MODE 1: PRACTICE BANK (Zero AI call)
    // -----------------------------------------------------------------
    if (quizMode === "practice") {
      const bankResult = await selectBankQuestions(supabase, {
        course_id,
        topic: trimmedTopic,
        format: chosenFormat,
        count: limitCount,
        user_id: user.id
      })

      finalQuestions = bankResult.questions
      matchLevel = bankResult.match_level

      if (finalQuestions.length === 0) {
        return NextResponse.json({
          message: "There aren't enough validated practice questions available for this topic yet. Try a broader topic or try AI Quiz mode.",
          questions: [],
          quiz_id: null
        }, { status: 200 })
      }
    }

    // -----------------------------------------------------------------
    // MODE 2 & 3: AI QUIZ or MIXED MODE (With Automatic Safety Net Fallback)
    // -----------------------------------------------------------------
    else {
      let groundingContext = ""
      let blueprintContext = ""

      // Fetch grounding materials metadata if available
      try {
        const { data: materials } = await supabase
          .from("materials")
          .select("title, description")
          .eq("course_id", course_id)
          .limit(3)

        if (materials && materials.length > 0) {
          groundingContext = materials.map((m: any) => `${m.title}: ${m.description || ""}`).join("; ")
        }
      } catch (matErr) {
        console.warn("Could not load material grounding context:", matErr)
      }

      // Fetch course blueprint if available
      try {
        const { data: blueprint } = await supabase
          .from("course_blueprints")
          .select("high_yield_concepts, question_style_patterns, exam_emphasis")
          .eq("course_id", course_id)
          .maybeSingle()

        if (blueprint) {
          blueprintContext = `Emphasis: ${blueprint.exam_emphasis || "Standard Finals"}. Patterns: ${JSON.stringify(blueprint.question_style_patterns || {})}`
        }
      } catch (bpErr) {
        console.warn("Could not load blueprint context:", bpErr)
      }

      const existingFingerprints = new Set<string>()

      if (quizMode === "mixed") {
        // Fetch 50% from bank first
        const bankHalfCount = Math.floor(limitCount / 2)
        const bankResult = await selectBankQuestions(supabase, {
          course_id,
          topic: trimmedTopic,
          format: chosenFormat,
          count: bankHalfCount,
          user_id: user.id
        })

        bankResult.questions.forEach((q) => {
          finalQuestions.push(q)
          if (q.question_fingerprint) existingFingerprints.add(q.question_fingerprint)
        })

        // Generate remaining from AI
        const remainingForAi = limitCount - finalQuestions.length
        if (remainingForAi > 0) {
          try {
            const aiBatch = await generateAIQuestionsBatch({
              courseCodeTitle,
              topic: trimmedTopic,
              format: chosenFormat,
              count: remainingForAi,
              groundingContext,
              blueprintContext,
              existingFingerprints
            })
            finalQuestions.push(...aiBatch)
          } catch (aiErr: any) {
            usedFallback = true
            fallbackReason = "AI generation partially failed during mixed mode. Filled remaining slots from validated question bank."
            // Fall back to bank for missing
            const extraBank = await selectBankQuestions(supabase, {
              course_id,
              topic: trimmedTopic,
              format: chosenFormat,
              count: limitCount - finalQuestions.length,
              user_id: user.id,
              exclude_ids: finalQuestions.map((f) => f.id!).filter(Boolean)
            })
            finalQuestions.push(...extraBank.questions)
          }
        }
      } else {
        // Pure AI Mode request: bounded generation
        try {
          // Bounded small batch generation
          const aiQuestions = await generateAIQuestionsBatch({
            courseCodeTitle,
            topic: trimmedTopic,
            format: chosenFormat,
            count: limitCount,
            groundingContext,
            blueprintContext,
            existingFingerprints
          })

          finalQuestions = aiQuestions

          // If AI produced fewer than requested count, top up from Bank
          if (finalQuestions.length < limitCount) {
            usedFallback = true
            fallbackReason = `AI produced ${finalQuestions.length} valid questions. Topped up remaining with validated question bank questions.`
            const topUp = await selectBankQuestions(supabase, {
              course_id,
              topic: trimmedTopic,
              format: chosenFormat,
              count: limitCount - finalQuestions.length,
              user_id: user.id,
              exclude_ids: finalQuestions.map((f) => f.id!).filter(Boolean)
            })
            finalQuestions.push(...topUp.questions)
          }
        } catch (aiError: any) {
          // -----------------------------------------------------------
          // CRITICAL AUTOMATIC FALLBACK ON AI FAILURE
          // -----------------------------------------------------------
          console.warn("AI Quiz Generation failed. Triggering automatic Question Bank fallback:", aiError?.message || aiError)
          usedFallback = true
          fallbackReason = "AI generation encountered a transient issue. Automatically loaded validated questions from MedHaven Question Bank."

          const bankFallback = await selectBankQuestions(supabase, {
            course_id,
            topic: trimmedTopic,
            format: chosenFormat,
            count: limitCount,
            user_id: user.id
          })

          finalQuestions = bankFallback.questions
          matchLevel = bankFallback.match_level
        }
      }
    }

    // 4. Handle Case where question count is still zero or insufficient
    if (finalQuestions.length === 0) {
      return NextResponse.json({
        message: "There aren't enough validated questions available for this topic yet. Try Practice mode with a broader topic or try AI Quiz again later.",
        questions: [],
        quiz_id: null
      }, { status: 200 })
    }

    // 5. Save Quiz session record in `quizzes` and `quiz_questions`
    const { data: newQuiz, error: insertQuizError } = await supabase
      .from("quizzes")
      .insert({
        course_id,
        topic: trimmedTopic,
        format: chosenFormat
      })
      .select("id")
      .single()

    if (insertQuizError || !newQuiz) {
      console.error("Failed to insert quiz session record:", insertQuizError)
      return NextResponse.json({ error: "Failed to record quiz session in database" }, { status: 500 })
    }

    const questionsToInsert = finalQuestions.map((q) => ({
      quiz_id: newQuiz.id,
      question_text: q.question,
      options: q.options || [],
      correct_answer: q.correct_answer,
      explanation: q.explanation || "No explanation provided.",
      tf_options: q.tf_options || null,
      sub_questions: q.sub_questions || null,
      image_bank_id: q.image_bank_id || null
    }))

    const { data: insertedQuestions, error: insertQuestionsError } = await supabase
      .from("quiz_questions")
      .insert(questionsToInsert)
      .select("id, question_text, options, correct_answer, explanation, tf_options, sub_questions, image_bank_id")

    if (insertQuestionsError || !insertedQuestions) {
      console.error("Failed to insert quiz questions:", insertQuestionsError)
      await supabase.from("quizzes").delete().eq("id", newQuiz.id)
      return NextResponse.json({ error: "Failed to save quiz questions to database" }, { status: 500 })
    }

    const formattedQuestions = insertedQuestions.map((q: any, idx: number) => ({
      id: q.id,
      question: q.question_text,
      options: q.options || [],
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      tf_options: q.tf_options || null,
      sub_questions: q.sub_questions || null,
      image_bank_id: q.image_bank_id || null,
      provenance: finalQuestions[idx]?.provenance || { source: "validated_bank" }
    }))

    return NextResponse.json({
      quiz_id: newQuiz.id,
      questions: formattedQuestions,
      count: formattedQuestions.length,
      mode: quizMode,
      fallback: usedFallback,
      fallback_reason: usedFallback ? fallbackReason : null,
      match_level: matchLevel
    })
  } catch (err: any) {
    console.error("Unexpected error in quiz generation API:", err)
    return NextResponse.json({ error: err?.message || "An unexpected error occurred" }, { status: 500 })
  }
}
