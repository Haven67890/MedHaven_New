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
    const { course_id } = body
    let { topic, format, count } = body

    if (!course_id) {
      return NextResponse.json({ error: "Missing course_id in request body" }, { status: 400 })
    }

    // Define defaults
    const chosenFormat = format ? String(format).trim() : "MCQ"
    const limitCount = count ? parseInt(count, 10) : 10
    const trimmedTopic = topic && String(topic).trim() !== "" ? String(topic).trim() : "General Course Review"

    // 3. Query existing quizzes & questions in Supabase
    // Caching matches course_id, topic (case insensitive), and format
    const { data: existingQuiz, error: fetchError } = await supabase
      .from("quizzes")
      .select(`
        id,
        course_id,
        topic,
        format,
        quiz_questions (
          id,
          question_text,
          options,
          correct_answer,
          explanation,
          tf_options,
          image_bank_id,
          sub_questions,
          quiz_image_bank (
            id,
            title,
            category,
            image_url,
            correct_findings,
            differential_diagnosis
          )
        )
      `)
      .eq("course_id", course_id)
      .ilike("topic", trimmedTopic)
      .eq("format", chosenFormat)
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error("Error querying cached quizzes:", fetchError)
    }

    if (existingQuiz && existingQuiz.quiz_questions && existingQuiz.quiz_questions.length > 0) {
      // Map questions to standard response format, sliced to requested count
      const formattedQuestions = existingQuiz.quiz_questions.map((q: any) => ({
        id: q.id,
        question: q.question_text,
        options: q.options || [],
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        tf_options: q.tf_options || null,
        image_bank_id: q.image_bank_id || null,
        sub_questions: q.sub_questions || null,
        quiz_image_bank: q.quiz_image_bank || null,
      })).slice(0, limitCount)

      return NextResponse.json({
        quiz_id: existingQuiz.id,
        questions: formattedQuestions,
        cached: true,
      })
    }

    // 4. Fetch Course details to provide better prompt context
    const { data: courseData } = await supabase
      .from("courses")
      .select("code, title")
      .eq("id", course_id)
      .maybeSingle()

    const courseContext = courseData
      ? `${courseData.code || ""} ${courseData.title || ""}`.trim()
      : "Medical Course"

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Groq API configuration missing on the server" }, { status: 500 })
    }

    // -------------------------------------------------------------
    // STANDARD QUIZ GENERATION FLOW (MCQ, SBA, OSCE, Short Answer)
    // -------------------------------------------------------------
    const countToGenerate = trimmedTopic === "General Course Review" ? 15 : limitCount

    let systemPrompt = `You are an expert medical educator. Your task is to generate a quiz on the specified medical course and topic.
You must return strictly valid JSON. Do not include any markdown formatting, backticks, or explanatory text outside the JSON structure.

The response must be a single JSON object containing a key "questions", which is an array of exactly ${countToGenerate} question objects.
Each question object in the array must have exactly the following keys:
`

    if (chosenFormat === "Short Answer") {
      systemPrompt += `- "question": string (the short answer question or clinical vignette requiring a free-text response)
- "options": array of strings (MUST be empty: [])
- "correct_answer": string (the correct short answer or key terms/phrases)
- "explanation": string (a brief explanation of why this answer is correct, key terms to include, and a clinical grading rubric)`
    } else if (chosenFormat === "OSCE") {
      systemPrompt += `- "question": string (the OSCE clinical station vignette/scenario, e.g. "A 45-year-old male presents with severe chest pain...")
- "sub_questions": array of 2 to 4 objects, each with {"question": string (a structured follow-up question, e.g. "What is the most likely diagnosis?"), "expected_answer": string (the expected clinical model answer), "explanation": string (brief clinical rationale for this sub-question)}
- "options": array of strings (MUST be empty: [])
- "correct_answer": string (summary answer, e.g. "OSCE Station Evaluation Key")
- "explanation": string (overall station clinical performance rubric)`
    } else if (chosenFormat === "SBA") {
      systemPrompt += `- "question": string (the single best answer clinical vignette question)
- "options": array of exactly 4 strings (the choices)
- "correct_answer": string (the correct answer, which MUST match one of the strings inside the "options" array exactly. Distractors should be highly plausible but clearly inferior to the single best answer)
- "explanation": string (a brief explanation of why this is the single best answer and why other distractors are incorrect)`
    } else { // MCQ
      systemPrompt += `- "question": string (the question stem for the multiple True/False question, e.g. "Regarding acute appendicitis:")
- "tf_options": array of 4 to 5 objects, each with {"statement": string (a medical statement about the question stem), "answer": boolean (true if statement is correct/True, false if statement is incorrect/False)}
- "options": array of strings (MUST be empty: [])
- "correct_answer": string (summary answer, e.g. "A-True, B-False, C-True, D-True")
- "explanation": string (brief explanation for each statement's True/False classification)`
    }

    const userPrompt = `Generate a high-yield medical quiz for:
Course: ${courseContext}
Topic: ${trimmedTopic}
Format: ${chosenFormat}
Number of Questions: ${countToGenerate}

Remember, return strictly a JSON object with a "questions" array of exactly ${countToGenerate} objects matching the format's structural requirements.`

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

    let questionsArray = parsed
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (Array.isArray(parsed.questions)) {
        questionsArray = parsed.questions
      } else {
        const foundArrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]))
        if (foundArrayKey) {
          questionsArray = parsed[foundArrayKey]
        }
      }
    }

    if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
      return NextResponse.json({ error: "AI response did not contain a valid array of questions" }, { status: 502 })
    }

    const validatedQuestions: any[] = []
    for (const q of questionsArray) {
      if (chosenFormat === "Short Answer") {
        if (!q.question || !q.correct_answer) {
          continue
        }
        validatedQuestions.push({
          question: String(q.question),
          options: [],
          correct_answer: String(q.correct_answer),
          explanation: q.explanation ? String(q.explanation) : "No explanation provided.",
        })
      } else if (chosenFormat === "MCQ") {
        if (!q.question || !Array.isArray(q.tf_options) || q.tf_options.length === 0) {
          continue
        }

        const validTfOptions = q.tf_options
          .filter((opt: any) => opt && opt.statement)
          .map((opt: any) => ({
            statement: String(opt.statement).trim(),
            answer: Boolean(opt.answer),
          }))

        if (validTfOptions.length === 0) continue

        const summaryAnswer = validTfOptions
          .map((opt: any, idx: number) => `${String.fromCharCode(65 + idx)}: ${opt.answer ? "True" : "False"}`)
          .join(", ")

        validatedQuestions.push({
          question: String(q.question),
          options: [],
          correct_answer: q.correct_answer ? String(q.correct_answer) : summaryAnswer,
          explanation: q.explanation ? String(q.explanation) : "No explanation provided.",
          tf_options: validTfOptions,
        })
      } else if (chosenFormat === "OSCE") {
        if (!q.question || !Array.isArray(q.sub_questions) || q.sub_questions.length === 0) {
          continue
        }

        const validSubQs = q.sub_questions
          .filter((sq: any) => sq && sq.question && (sq.expected_answer || sq.answer))
          .map((sq: any) => ({
            question: String(sq.question).trim(),
            expected_answer: String(sq.expected_answer || sq.answer).trim(),
            explanation: sq.explanation ? String(sq.explanation).trim() : "No explanation provided.",
          }))

        if (validSubQs.length === 0) continue

        validatedQuestions.push({
          question: String(q.question),
          options: [],
          correct_answer: q.correct_answer ? String(q.correct_answer) : "OSCE Station Evaluation Key",
          explanation: q.explanation ? String(q.explanation) : "No overall rubric provided.",
          sub_questions: validSubQs,
        })
      } else {
        let rawOptions: string[] = []
        if (Array.isArray(q.options)) {
          rawOptions = q.options.map((opt: any) => String(opt).trim())
        } else if (q.options && typeof q.options === "object") {
          rawOptions = Object.values(q.options).map((opt: any) => String(opt).trim())
        }

        if (!q.question || rawOptions.length < 2 || q.correct_answer === undefined || q.correct_answer === null) {
          continue
        }

        let options = [...rawOptions]
        if (options.length < 4) {
          while (options.length < 4) {
            options.push("None of the above")
          }
        } else if (options.length > 4) {
          options = options.slice(0, 4)
        }

        let rawCorrect = String(q.correct_answer).trim()
        let correctAnswer = rawCorrect

        const cleanKey = rawCorrect.replace(/^(option|choice)\s*/i, "").replace(/[\):.]/g, "").trim().toUpperCase()
        if (["A", "B", "C", "D", "E"].includes(cleanKey)) {
          const idx = cleanKey.charCodeAt(0) - 65
          if (rawOptions[idx]) {
            correctAnswer = rawOptions[idx]
          }
        } else if (/^[0-4]$/.test(cleanKey)) {
          const idx = parseInt(cleanKey, 10)
          if (rawOptions[idx]) {
            correctAnswer = rawOptions[idx]
          }
        }

        if (!options.includes(correctAnswer)) {
          const matchedOpt = options.find((opt) => opt.toLowerCase() === rawCorrect.toLowerCase() || opt.toLowerCase().includes(rawCorrect.toLowerCase()))
          correctAnswer = matchedOpt || options[0]
        }

        validatedQuestions.push({
          question: String(q.question),
          options,
          correct_answer: correctAnswer,
          explanation: q.explanation ? String(q.explanation) : "No explanation provided.",
        })
      }
    }

    if (validatedQuestions.length === 0) {
      return NextResponse.json({ error: "AI failed to produce any valid questions" }, { status: 502 })
    }

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
      return NextResponse.json({ error: "Failed to save generated quiz record to the database" }, { status: 500 })
    }

    const questionsToInsert = validatedQuestions.map((q) => ({
      quiz_id: newQuiz.id,
      question_text: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      tf_options: q.tf_options || null,
      sub_questions: q.sub_questions || null,
    }))

    const { data: insertedQuestions, error: insertQuestionsError } = await supabase
      .from("quiz_questions")
      .insert(questionsToInsert)
      .select("id, question_text, options, correct_answer, explanation, tf_options, sub_questions")

    if (insertQuestionsError || !insertedQuestions || insertedQuestions.length === 0) {
      console.error("Failed to insert quiz questions:", insertQuestionsError)
      await supabase.from("quizzes").delete().eq("id", newQuiz.id)
      return NextResponse.json({ error: "Failed to save generated quiz questions to the database" }, { status: 500 })
    }

    const formattedQuestions = insertedQuestions.map((q: any) => ({
      id: q.id,
      question: q.question_text,
      options: q.options || [],
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      tf_options: q.tf_options || null,
      sub_questions: q.sub_questions || null,
    })).slice(0, limitCount)

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
