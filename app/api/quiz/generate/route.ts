import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import {
  selectBankQuestions,
  generateAIQuestionsBatch,
  ValidatedQuestion
} from "@/lib/quiz-engine"

/**
 * Persist or reuse an AI-generated question in public.question_bank
 */
async function syncQuestionToBank(dbClient: any, q: ValidatedQuestion, courseId: string, topic: string, format: string): Promise<string | null> {
  if (q.id) return q.id // Already has a bank ID

  const fingerprint = q.question_fingerprint
  if (!fingerprint) return null

  try {
    // 1. Check if fingerprint exists in question_bank
    const { data: existing } = await dbClient
      .from("question_bank")
      .select("id")
      .eq("question_fingerprint", fingerprint)
      .maybeSingle()

    if (existing?.id) {
      return existing.id
    }

    // 2. Insert new record into question_bank
    const toInsert = {
      course_id: courseId,
      topic: q.topic || topic,
      subtopic: q.subtopic || null,
      format,
      question_text: q.question,
      options: q.options || [],
      correct_answer: q.correct_answer,
      explanation: q.explanation || "No explanation provided.",
      tf_options: q.tf_options || null,
      sub_questions: q.sub_questions || null,
      image_bank_id: q.image_bank_id || null,
      difficulty: q.difficulty || "medium",
      high_yield_weight: q.high_yield_weight || 1.0,
      provenance: q.provenance || { source: "ai_generated", generated_at: new Date().toISOString() },
      question_fingerprint: fingerprint,
      status: "active"
    }

    const { data: inserted, error } = await dbClient
      .from("question_bank")
      .insert(toInsert)
      .select("id")
      .maybeSingle()

    if (inserted?.id) {
      return inserted.id
    }

    if (error) {
      // Handle unique constraint conflict e.g. concurrent insert
      const { data: retryCheck } = await dbClient
        .from("question_bank")
        .select("id")
        .eq("question_fingerprint", fingerprint)
        .maybeSingle()
      if (retryCheck?.id) return retryCheck.id
      console.warn("Could not insert or reuse question_bank record:", error.message)
    }
  } catch (err: any) {
    console.warn("Error persisting question to bank:", err?.message || err)
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create service client for database operations
    let serviceDb = supabase
    try {
      serviceDb = createServiceClient()
    } catch {
      // Fallback to user client if service key not available
    }

    // 2. Parse request body
    const body = await request.json().catch(() => ({}))
    const { course_id } = body
    let { topic, format, count, mode } = body

    if (!course_id) {
      return NextResponse.json({ error: "Missing course_id in request body" }, { status: 400 })
    }

    // Support available quiz sizes: 5, 10, 15, 20, 25, 30
    let limitCount = count ? parseInt(count, 10) : 10
    if (isNaN(limitCount) || limitCount < 5) {
      limitCount = 5
    } else if (limitCount > 30) {
      limitCount = 30
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
      const bankResult = await selectBankQuestions(serviceDb, {
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
          message: "There aren't enough new practice questions available for this selection. Previously answered questions were excluded. Try another topic or try AI Quiz mode.",
          questions: [],
          quiz_id: null
        }, { status: 200 })
      }
    }

    // -----------------------------------------------------------------
    // MODE 2 & 3: AI QUIZ or MIXED MODE (With Controlled Batching & Automatic Safety Net Fallback)
    // -----------------------------------------------------------------
    else {
      let groundingContext = ""
      let blueprintContext = ""

      // Fetch grounding materials metadata if available
      try {
        const { data: materials } = await serviceDb
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
        const { data: blueprint } = await serviceDb
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

      // Pre-seed existingFingerprints with user history to prevent repeating seen AI/bank questions
      try {
        const { data: userHistory } = await serviceDb
          .from("user_question_history")
          .select("question_id, question_bank:question_bank(question_fingerprint)")
          .eq("user_id", user.id)

        if (userHistory && userHistory.length > 0) {
          userHistory.forEach((h: any) => {
            if (h.question_bank?.question_fingerprint) {
              existingFingerprints.add(h.question_bank.question_fingerprint)
            }
          })
        }
      } catch (histFetchErr) {
        console.warn("Could not fetch user question history for AI exclusion pre-seeding:", histFetchErr)
      }

      if (quizMode === "mixed") {
        // Fetch 50% from bank first
        const bankHalfCount = Math.floor(limitCount / 2)
        const bankResult = await selectBankQuestions(serviceDb, {
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

        // Generate remaining from AI in controlled batches of max 5
        const remainingForAi = limitCount - finalQuestions.length
        if (remainingForAi > 0) {
          try {
            let neededAi = remainingForAi
            while (neededAi > 0) {
              const currentBatchCount = Math.min(neededAi, 5)
              const aiBatch = await generateAIQuestionsBatch({
                courseCodeTitle,
                topic: trimmedTopic,
                format: chosenFormat,
                count: currentBatchCount,
                groundingContext,
                blueprintContext,
                existingFingerprints
              })
              if (aiBatch.length === 0) break
              finalQuestions.push(...aiBatch)
              neededAi -= aiBatch.length
            }
          } catch (aiErr: any) {
            usedFallback = true
            fallbackReason = "AI generation partially failed during mixed mode. Filled remaining slots from validated question bank."
          }

          // Fall back to bank for any missing slots
          if (finalQuestions.length < limitCount) {
            const extraBank = await selectBankQuestions(serviceDb, {
              course_id,
              topic: trimmedTopic,
              format: chosenFormat,
              count: limitCount - finalQuestions.length,
              user_id: user.id,
              exclude_ids: finalQuestions.map((f) => f.id!).filter(Boolean),
              exclude_fingerprints: existingFingerprints
            })
            finalQuestions.push(...extraBank.questions)
          }
        }
      } else {
        // Pure AI Mode request: controlled batch generation (max 5 Qs per Groq batch call)
        try {
          let neededCount = limitCount
          let batchConsecutiveFailures = 0

          while (neededCount > 0 && batchConsecutiveFailures < 2) {
            const currentBatchCount = Math.min(neededCount, 5)
            const aiBatch = await generateAIQuestionsBatch({
              courseCodeTitle,
              topic: trimmedTopic,
              format: chosenFormat,
              count: currentBatchCount,
              groundingContext,
              blueprintContext,
              existingFingerprints
            })

            if (aiBatch.length > 0) {
              finalQuestions.push(...aiBatch)
              neededCount -= aiBatch.length
              batchConsecutiveFailures = 0
            } else {
              batchConsecutiveFailures++
            }
          }

          // If AI produced fewer than requested count, top up from Question Bank
          if (finalQuestions.length < limitCount) {
            usedFallback = true
            fallbackReason = `AI produced ${finalQuestions.length} unique questions. Topped up remaining slots from validated Question Bank.`
            const topUp = await selectBankQuestions(serviceDb, {
              course_id,
              topic: trimmedTopic,
              format: chosenFormat,
              count: limitCount - finalQuestions.length,
              user_id: user.id,
              exclude_ids: finalQuestions.map((f) => f.id!).filter(Boolean),
              exclude_fingerprints: existingFingerprints
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

          const bankFallback = await selectBankQuestions(serviceDb, {
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

    // 5. Synchronize/persist all questions to question_bank & get question_bank_id array
    const questionBankIds: (string | null)[] = await Promise.all(
      finalQuestions.map((q) => syncQuestionToBank(serviceDb, q, course_id, trimmedTopic, chosenFormat))
    )

    // 6. Save Quiz session record in `quizzes` and `quiz_questions`
    const { data: newQuiz, error: insertQuizError } = await serviceDb
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

    const questionsToInsert = finalQuestions.map((q, idx) => ({
      quiz_id: newQuiz.id,
      question_bank_id: questionBankIds[idx] || null,
      question_text: q.question,
      options: q.options || [],
      correct_answer: q.correct_answer,
      explanation: q.explanation || "No explanation provided.",
      tf_options: q.tf_options || null,
      sub_questions: q.sub_questions || null,
      image_bank_id: q.image_bank_id || null
    }))

    const { data: insertedQuestions, error: insertQuestionsError } = await serviceDb
      .from("quiz_questions")
      .insert(questionsToInsert)
      .select("id, question_bank_id, question_text, options, correct_answer, explanation, tf_options, sub_questions, image_bank_id")

    if (insertQuestionsError || !insertedQuestions) {
      console.error("Failed to insert quiz questions:", insertQuestionsError)
      await serviceDb.from("quizzes").delete().eq("id", newQuiz.id)
      return NextResponse.json({ error: "Failed to save quiz questions to database" }, { status: 500 })
    }

    const formattedQuestions = insertedQuestions.map((q: any, idx: number) => ({
      id: q.id,
      question_bank_id: q.question_bank_id || questionBankIds[idx] || null,
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
