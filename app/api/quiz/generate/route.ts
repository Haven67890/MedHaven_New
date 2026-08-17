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
    // STEEPLECHASE QUIZ GENERATION FLOW
    // -------------------------------------------------------------
    if (chosenFormat === "Steeplechase") {
      // Select real images from quiz_image_bank for this course
      const { data: bankImages, error: bankFetchError } = await supabase
        .from("quiz_image_bank")
        .select("id, title, category, correct_findings, differential_diagnosis, image_url")
        .eq("course_id", course_id)
        .neq("status", "archived")

      if (bankFetchError) {
        console.error("Error querying quiz_image_bank:", bankFetchError)
      }

      if (!bankImages || bankImages.length === 0) {
        return NextResponse.json({
          error: "Insufficient image bank questions available for this course. Please select another course or ask an admin to add images."
        }, { status: 400 })
      }

      // Shuffle images to provide a varied random selection across available categories
      const shuffledImages = [...bankImages].sort(() => Math.random() - 0.5)
      const selectedStations = shuffledImages.slice(0, Math.min(limitCount, Math.max(5, bankImages.length)))

      const generatedStations: any[] = []

      for (const imageItem of selectedStations) {
        const systemPrompt = `You are an expert medical educator creating follow-up exam questions for a Steeplechase station specimen.
You must return strictly valid JSON with a single key "sub_questions" containing an array of 2 to 4 question objects.
Each question object MUST have exactly the following keys:
- "id": string (e.g. "sq1", "sq2")
- "question": string (the follow-up sub-question e.g. identifying a landmark structure, histopathological feature, associated condition, or clinical significance)
- "expected_answer": string (the expected model answer derived strictly from the ground-truth findings)
- "explanation": string (brief clinical rationale or grading rubric)

CRITICAL INSTRUCTION: All sub-questions and expected answers MUST be STRICTLY grounded in the provided Correct Findings. You MUST NOT invent a different diagnosis or contradict the provided findings.`

        const userPrompt = `Specimen Title: ${imageItem.title}
Category: ${imageItem.category}
Correct Findings (Ground Truth Answer Key): ${imageItem.correct_findings}
Differential Diagnosis: ${imageItem.differential_diagnosis || "None"}

Generate 2-4 follow-up sub-questions for this station strictly grounded in the provided findings.`

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
            temperature: 0.5,
          }),
        })

        if (!groqResponse.ok) {
          console.error(`Failed to generate sub-questions for station ${imageItem.id}`)
          continue
        }

        const groqData = await groqResponse.json()
        const rawContent = groqData.choices?.[0]?.message?.content
        if (!rawContent) continue

        let parsedContent: any
        try {
          parsedContent = JSON.parse(rawContent)
        } catch {
          continue
        }

        let subQuestions = parsedContent?.sub_questions
        if (!Array.isArray(subQuestions) && parsedContent && typeof parsedContent === "object") {
          const firstKey = Object.keys(parsedContent).find(k => Array.isArray(parsedContent[k]))
          if (firstKey) subQuestions = parsedContent[firstKey]
        }

        if (Array.isArray(subQuestions) && subQuestions.length > 0) {
          const validatedSubQs = subQuestions.map((sq: any, idx: number) => ({
            id: sq.id || `sq_${idx + 1}`,
            question: String(sq.question || sq.question_text || "Identify key features on this specimen."),
            expected_answer: String(sq.expected_answer || sq.correct_answer || imageItem.correct_findings),
            explanation: String(sq.explanation || "Derived from official specimen findings."),
          }))

          generatedStations.push({
            image_bank_id: imageItem.id,
            question_text: imageItem.title,
            correct_answer: imageItem.correct_findings,
            explanation: imageItem.differential_diagnosis ? `Differential Diagnosis: ${imageItem.differential_diagnosis}` : "Steeplechase specimen station.",
            sub_questions: validatedSubQs,
            quiz_image_bank: imageItem,
          })
        }
      }

      if (generatedStations.length === 0) {
        return NextResponse.json({ error: "AI failed to produce valid station questions from the image bank." }, { status: 502 })
      }

      // Save Steeplechase quiz
      const { data: newQuiz, error: insertQuizError } = await supabase
        .from("quizzes")
        .insert({
          course_id,
          topic: trimmedTopic,
          format: "Steeplechase",
        })
        .select("id")
        .single()

      if (insertQuizError || !newQuiz) {
        console.error("Failed to insert Steeplechase quiz:", insertQuizError)
        return NextResponse.json({ error: "Failed to save generated Steeplechase quiz record" }, { status: 500 })
      }

      const questionsToInsert = generatedStations.map((st) => ({
        quiz_id: newQuiz.id,
        question_text: st.question_text,
        options: [],
        correct_answer: st.correct_answer,
        explanation: st.explanation,
        image_bank_id: st.image_bank_id,
        sub_questions: st.sub_questions,
      }))

      const { data: insertedQuestions, error: insertQuestionsError } = await supabase
        .from("quiz_questions")
        .insert(questionsToInsert)
        .select("id, question_text, options, correct_answer, explanation, image_bank_id, sub_questions")

      if (insertQuestionsError || !insertedQuestions || insertedQuestions.length === 0) {
        console.error("Failed to insert Steeplechase questions:", insertQuestionsError)
        await supabase.from("quizzes").delete().eq("id", newQuiz.id)
        return NextResponse.json({ error: "Failed to save Steeplechase quiz questions" }, { status: 500 })
      }

      const formattedQuestions = insertedQuestions.map((q: any, idx: number) => ({
        id: q.id,
        question: q.question_text,
        options: [],
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        image_bank_id: q.image_bank_id,
        sub_questions: q.sub_questions,
        quiz_image_bank: generatedStations[idx]?.quiz_image_bank || null,
      }))

      return NextResponse.json({
        quiz_id: newQuiz.id,
        questions: formattedQuestions,
        cached: false,
      })
    }

    // -------------------------------------------------------------
    // STANDARD QUIZ GENERATION FLOW (MCQ, SBA, Picture Test, Short Answer)
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
    } else if (chosenFormat === "SBA") {
      systemPrompt += `- "question": string (the single best answer clinical vignette question)
- "options": array of exactly 4 strings (the choices)
- "correct_answer": string (the correct answer, which MUST match one of the strings inside the "options" array exactly. Distractors should be highly plausible but clearly inferior to the single best answer)
- "explanation": string (a brief explanation of why this is the single best answer and why other distractors are incorrect)`
    } else if (chosenFormat === "Picture Test") {
      systemPrompt += `- "question": string (the visual question. Since images are not directly rendered, you must explicitly reference a visual clinical image concept in the question, e.g. "On this chest X-ray...", "This histological slide shows...", "This clinical photo of...", etc.)
- "options": array of exactly 4 strings (the choices)
- "correct_answer": string (the correct answer, which MUST match one of the strings inside the "options" array exactly)
- "explanation": string (a brief explanation of why the correct answer is right and why other options are incorrect)`
    } else { // MCQ
      systemPrompt += `- "question": string (the multiple choice question text)
- "options": array of exactly 4 strings (the choices)
- "correct_answer": string (the correct answer, which MUST match one of the strings inside the "options" array exactly)
- "explanation": string (a brief explanation of why the correct answer is right and why other options are incorrect)`
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
      } else {
        if (!q.question || !Array.isArray(q.options) || q.options.length < 2 || !q.correct_answer) {
          continue
        }

        let options = q.options.map((opt: any) => String(opt))
        if (options.length < 4) {
          while (options.length < 4) {
            options.push("None of the above")
          }
        } else if (options.length > 4) {
          options = options.slice(0, 4)
        }

        let correctAnswer = String(q.correct_answer)
        if (!options.includes(correctAnswer)) {
          correctAnswer = options[0]
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
    }))

    const { data: insertedQuestions, error: insertQuestionsError } = await supabase
      .from("quiz_questions")
      .insert(questionsToInsert)
      .select("id, question_text, options, correct_answer, explanation")

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
