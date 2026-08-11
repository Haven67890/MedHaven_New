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
    const { course_id, topic } = body

    if (!course_id || !topic) {
      return NextResponse.json({ error: "Missing course_id or topic in request body" }, { status: 400 })
    }

    const trimmedTopic = topic.trim()

    // 3. Query existing quizzes & questions in Supabase
    const { data: existingQuiz, error: fetchError } = await supabase
      .from("quizzes")
      .select(`
        id,
        course_id,
        topic,
        quiz_questions (
          id,
          question_text,
          options,
          correct_answer,
          explanation
        )
      `)
      .eq("course_id", course_id)
      .ilike("topic", trimmedTopic)
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error("Error querying cached quizzes:", fetchError)
    }

    if (existingQuiz && existingQuiz.quiz_questions && existingQuiz.quiz_questions.length > 0) {
      // Map questions to standard response format
      const formattedQuestions = existingQuiz.quiz_questions.map((q: any) => ({
        id: q.id,
        question: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      }))

      return NextResponse.json({
        quiz_id: existingQuiz.id,
        questions: formattedQuestions,
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

    // 5. Call the Groq API
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Groq API configuration missing on the server" }, { status: 500 })
    }

    const systemPrompt = `You are an expert medical educator. Your task is to generate a quiz on the specified medical course and topic.
You must return strictly valid JSON. Do not include any markdown formatting, backticks, or explanatory text outside the JSON structure.

The response must be a single JSON object containing a key "questions", which is an array of 5 to 10 question objects.
Each question object in the array must have exactly the following keys:
- "question": string (the multiple choice question text)
- "options": array of exactly 4 strings (the choices)
- "correct_answer": string (the correct answer, which MUST match one of the strings inside the "options" array exactly)
- "explanation": string (a brief explanation of why the correct answer is right and why other options are incorrect)`

    const userPrompt = `Generate a high-yield medical quiz for:
Course: ${courseContext}
Topic: ${trimmedTopic}

Remember, return strictly a JSON object with a "questions" array of 5 to 10 objects.`

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
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
      return NextResponse.json({ error: "Failed to generate quiz questions from AI service" }, { status: 502 })
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

    // Support both directly returning an array or an object containing 'questions' array
    let questionsArray = parsed
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (Array.isArray(parsed.questions)) {
        questionsArray = parsed.questions
      } else {
        // Fallback: search for any array key
        const foundArrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]))
        if (foundArrayKey) {
          questionsArray = parsed[foundArrayKey]
        }
      }
    }

    if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
      return NextResponse.json({ error: "AI response did not contain a valid array of questions" }, { status: 502 })
    }

    // Validate structure of questions
    const validatedQuestions: any[] = []
    for (const q of questionsArray) {
      if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || !q.correct_answer) {
        continue // skip malformed question
      }

      // Ensure options has exactly 4 items, padding if necessary
      let options = q.options.map((opt: any) => String(opt))
      if (options.length < 4) {
        while (options.length < 4) {
          options.push("None of the above")
        }
      } else if (options.length > 4) {
        options = options.slice(0, 4)
      }

      // Ensure correct_answer is one of the options
      let correctAnswer = String(q.correct_answer)
      if (!options.includes(correctAnswer)) {
        // fallback: set correct_answer to the first option
        correctAnswer = options[0]
      }

      validatedQuestions.push({
        question: String(q.question),
        options,
        correct_answer: correctAnswer,
        explanation: q.explanation ? String(q.explanation) : "No explanation provided.",
      })
    }

    if (validatedQuestions.length === 0) {
      return NextResponse.json({ error: "AI failed to produce any valid questions" }, { status: 502 })
    }

    // 6. Insert new quiz into Supabase
    const { data: newQuiz, error: insertQuizError } = await supabase
      .from("quizzes")
      .insert({
        course_id,
        topic: trimmedTopic,
      })
      .select("id")
      .single()

    if (insertQuizError || !newQuiz) {
      console.error("Failed to insert new quiz:", insertQuizError)
      return NextResponse.json({ error: "Failed to save generated quiz record to the database" }, { status: 500 })
    }

    // 7. Insert quiz questions linked via quiz_id
    const questionsToInsert = validatedQuestions.map((q) => ({
      quiz_id: newQuiz.id,
      question_text: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }))

    const { data: insertedQuestions, error: insertQuestionsError } = await supabase
      .from("quiz_questions")
      .insert(questionsToInsert)
      .select("id, question_text, options, correct_answer, explanation")

    if (insertQuestionsError || !insertedQuestions || insertedQuestions.length === 0) {
      console.error("Failed to insert quiz questions:", insertQuestionsError)
      // Rollback quiz insertion if possible (by deleting it) to prevent orphan records
      await supabase.from("quizzes").delete().eq("id", newQuiz.id)
      return NextResponse.json({ error: "Failed to save generated quiz questions to the database" }, { status: 500 })
    }

    // Map questions to standard response format
    const formattedQuestions = insertedQuestions.map((q: any) => ({
      id: q.id,
      question: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
    }))

    return NextResponse.json({
      quiz_id: newQuiz.id,
      questions: formattedQuestions,
      cached: false,
    })
  } catch (err: any) {
    console.error("Unexpected error generating quiz:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
