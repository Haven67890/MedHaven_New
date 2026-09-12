import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) })
    const pdf = await loadingTask.promise
    let fullText = ""
    const maxPages = Math.min(pdf.numPages, 5)
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: any) => item.str || "")
        .filter(Boolean)
        .join(" ")
      fullText += pageText + "\n"
      if (fullText.length > 4000) break
    }
    return fullText.trim()
  } catch (err) {
    console.warn("Failed to extract PDF text from past question material:", err)
    return ""
  }
}

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

    // Define defaults & requested values
    const chosenFormat = format ? String(format).trim() : "MCQ"
    const parsedCount = count ? parseInt(count, 10) : 10
    const countToGenerate = isNaN(parsedCount) || parsedCount <= 0 ? 10 : Math.min(parsedCount, 30)
    const trimmedTopic = topic && String(topic).trim() !== "" ? String(topic).trim() : "General Course Review"

    // 3. Fetch Course details to provide better prompt context
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
      console.error("[Quiz Generator Error]: GROQ_API_KEY is not configured in server environment variables.")
      return NextResponse.json({ error: "Groq API configuration missing on the server" }, { status: 500 })
    }

    const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"

    // 4. Query local past question materials first for grounding context
    // Process is bounded, size-limited, timeout-safe, and failure-tolerant
    let groundingContext = ""
    try {
      const { data: pqMaterials } = await supabase
        .from("materials")
        .select("id, title, storage_path")
        .eq("course_id", course_id)
        .ilike("storage_path", "%past-questions%")
        .limit(3)

      if (pqMaterials && pqMaterials.length > 0) {
        const workerBase = process.env.CLOUDFLARE_WORKER_URL || "https://medhaven-b2-proxy.v10.workers.dev"
        const extractedTexts: string[] = []

        for (const mat of pqMaterials) {
          if (!mat.storage_path) continue
          const fetchUrl = `${workerBase}/${mat.storage_path}`
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000)

            const res = await fetch(fetchUrl, { signal: controller.signal })
            clearTimeout(timeoutId)

            if (res.ok) {
              const isPdf = mat.storage_path.toLowerCase().endsWith(".pdf")
              if (isPdf) {
                const arrayBuf = await res.arrayBuffer()
                const text = await extractTextFromPdfBuffer(arrayBuf)
                if (text) extractedTexts.push(text)
              } else {
                const text = await res.text()
                if (text) extractedTexts.push(text.slice(0, 3000))
              }
            } else {
              console.warn(`[Quiz Grounding]: Could not fetch PQ material ${mat.id}, HTTP status: ${res.status}`)
            }
          } catch (fetchErr) {
            console.warn(`[Quiz Grounding]: Failed or timed out fetching PQ material ${mat.id}:`, fetchErr)
          }
        }

        const combinedPqText = extractedTexts.join("\n\n").trim()
        if (combinedPqText) {
          groundingContext = `Use the following past questions from this institution as style and content reference. Generate questions that closely mirror the format, difficulty, and topics of these past questions:\n\n${combinedPqText.slice(0, 4000)}`
        }
      }
    } catch (pqErr) {
      console.warn("[Quiz Grounding]: Error querying local past questions, proceeding without PQ grounding:", pqErr)
    }

    // 5. Build Format Style Instructions
    let formatStyleInstruction = ""
    if (chosenFormat === "Short Answer") {
      formatStyleInstruction = `Generate short answer questions in the UNIJOS written exam style: direct, specific questions that require a 1-3 sentence factual answer. Include marks allocation hint in brackets e.g. (2 marks).

Each question object in the array must have exactly the following keys:
- "question": string (the short answer question or clinical vignette requiring a free-text response, including mark allocation e.g. "(2 marks)")
- "options": array of strings (MUST be empty: [])
- "correct_answer": string (the correct short answer or key terms/phrases)
- "explanation": string (a brief explanation of why this answer is correct, key terms to include, and a clinical grading rubric)`
    } else if (chosenFormat === "OSCE") {
      formatStyleInstruction = `Generate a realistic OSCE station as set in Nigerian teaching hospitals: a brief clinical scenario followed by 2-4 structured tasks (examination findings to elicit, investigations to request, diagnosis to state, or management steps to outline).

Each question object in the array must have exactly the following keys:
- "question": string (the OSCE clinical station vignette/scenario, e.g. "A 45-year-old male presents with severe chest pain...")
- "sub_questions": array of 2 to 4 objects, each with {"question": string (a structured follow-up question), "expected_answer": string (the expected clinical model answer), "explanation": string (brief clinical rationale)}
- "options": array of strings (MUST be empty: [])
- "correct_answer": string (summary answer, e.g. "OSCE Station Evaluation Key")
- "explanation": string (overall station clinical performance rubric)`
    } else if (chosenFormat === "SBA") {
      formatStyleInstruction = `Generate SBA questions in the Nigerian MBBS finals style: a clinical vignette of 3-5 sentences describing a real patient presentation, followed by 4 options where only one is the single best answer. Options should be plausible and closely related.

Each question object in the array must have exactly the following keys:
- "question": string (the single best answer clinical vignette question)
- "options": array of exactly 4 strings (the choices)
- "correct_answer": string (the correct answer, which MUST match one of the strings inside the "options" array exactly)
- "explanation": string (a brief explanation of why this is the single best answer and why other distractors are incorrect)`
    } else { // MCQ
      formatStyleInstruction = `Generate questions in the USMLE/Nigerian MBBS MCQ style: one clinical stem followed by 4-5 independent True/False statements. Each statement should test a distinct fact about the condition.

Each question object in the array must have exactly the following keys:
- "question": string (the question stem for the multiple True/False question, e.g. "Regarding acute appendicitis:")
- "tf_options": array of 4 to 5 objects, each with {"statement": string (a medical statement about the stem), "answer": boolean (true if statement is True, false if statement is False)}
- "options": array of strings (MUST be empty: [])
- "correct_answer": string (summary answer, e.g. "A-True, B-False, C-True, D-True")
- "explanation": string (brief explanation for each statement's True/False classification)`
    }

    // 6. Batch Generation Loop
    // To reliably support counts 5, 10, 15, 20, 25, 30 without exceeding output token limits,
    // we generate in safe batches of up to 10 questions per request.
    const BATCH_SIZE = 10
    const validatedQuestions: any[] = []
    const existingStemsSet = new Set<string>()

    let totalAttempts = 0
    const MAX_TOTAL_ATTEMPTS = 6

    while (validatedQuestions.length < countToGenerate && totalAttempts < MAX_TOTAL_ATTEMPTS) {
      totalAttempts++
      const neededCount = countToGenerate - validatedQuestions.length
      const currentBatchTarget = Math.min(neededCount, BATCH_SIZE)

      let systemPrompt = `You are an expert medical educator. Your task is to generate a quiz on the specified medical course and topic.
You must return strictly valid JSON. Do not include any markdown formatting, backticks, or explanatory text outside the JSON structure.

The response must be a single JSON object containing a key "questions", which is an array of exactly ${currentBatchTarget} question objects.

${formatStyleInstruction}`

      if (groundingContext) {
        systemPrompt += `\n\n${groundingContext}`
      }

      let userPrompt = `Generate a high-yield medical quiz batch:
Course: ${courseContext}
Topic: ${trimmedTopic}
Format: ${chosenFormat}
Number of Questions in this batch: ${currentBatchTarget}`

      if (validatedQuestions.length > 0) {
        const previousTopics = validatedQuestions.map((q) => q.question.slice(0, 60)).join("; ")
        userPrompt += `\n\nDo NOT duplicate these previously generated question stems/topics: [${previousTopics}]`
      }

      userPrompt += `\n\nRemember, return strictly a JSON object with a "questions" array of exactly ${currentBatchTarget} objects.`

      let groqResponse: Response
      try {
        groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.6,
            max_tokens: 3500,
          }),
        })
      } catch (networkErr: any) {
        console.error(`[Quiz Generator Groq Network Failure] Attempt ${totalAttempts}/${MAX_TOTAL_ATTEMPTS}:`, {
          model: groqModel,
          requestedBatchSize: currentBatchTarget,
          error: networkErr?.message || networkErr,
        })
        continue
      }

      if (!groqResponse.ok) {
        const errorText = await groqResponse.text().catch(() => "Unable to read error body")
        console.error(`[Quiz Generator Groq Error Response] Attempt ${totalAttempts}/${MAX_TOTAL_ATTEMPTS}:`, {
          status: groqResponse.status,
          statusText: groqResponse.statusText,
          model: groqModel,
          requestedBatchSize: currentBatchTarget,
          errorDetails: errorText,
        })
        continue
      }

      const groqData = await groqResponse.json().catch(() => null)
      const rawContent = groqData?.choices?.[0]?.message?.content

      if (!rawContent) {
        console.error(`[Quiz Generator Groq Empty Content] Attempt ${totalAttempts}/${MAX_TOTAL_ATTEMPTS}:`, {
          model: groqModel,
          groqData,
        })
        continue
      }

      let parsed: any
      try {
        parsed = JSON.parse(rawContent)
      } catch (parseErr) {
        console.error(`[Quiz Generator JSON Parse Error] Attempt ${totalAttempts}/${MAX_TOTAL_ATTEMPTS}:`, {
          model: groqModel,
          rawContentSnippet: rawContent.slice(0, 300),
          error: parseErr,
        })
        continue
      }

      let questionsArray = parsed
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        if (Array.isArray(parsed.questions)) {
          questionsArray = parsed.questions
        } else {
          const foundArrayKey = Object.keys(parsed).find((key) => Array.isArray(parsed[key]))
          if (foundArrayKey) {
            questionsArray = parsed[foundArrayKey]
          }
        }
      }

      if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
        console.error(`[Quiz Generator Invalid Questions Array] Attempt ${totalAttempts}/${MAX_TOTAL_ATTEMPTS}:`, {
          model: groqModel,
          parsedKeys: parsed ? Object.keys(parsed) : null,
        })
        continue
      }

      // Validate questions in current batch
      for (const q of questionsArray) {
        if (validatedQuestions.length >= countToGenerate) break

        const stemKey = String(q?.question || "").trim().toLowerCase()
        if (!stemKey || existingStemsSet.has(stemKey)) continue

        if (chosenFormat === "Short Answer") {
          if (!q.question || !q.correct_answer) continue

          validatedQuestions.push({
            question: String(q.question).trim(),
            options: [],
            correct_answer: String(q.correct_answer).trim(),
            explanation: q.explanation ? String(q.explanation).trim() : "No explanation provided.",
          })
          existingStemsSet.add(stemKey)
        } else if (chosenFormat === "MCQ") {
          if (!q.question || !Array.isArray(q.tf_options) || q.tf_options.length === 0) continue

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
            question: String(q.question).trim(),
            options: [],
            correct_answer: q.correct_answer ? String(q.correct_answer).trim() : summaryAnswer,
            explanation: q.explanation ? String(q.explanation).trim() : "No explanation provided.",
            tf_options: validTfOptions,
          })
          existingStemsSet.add(stemKey)
        } else if (chosenFormat === "OSCE") {
          if (!q.question || !Array.isArray(q.sub_questions) || q.sub_questions.length === 0) continue

          const validSubQs = q.sub_questions
            .filter((sq: any) => sq && sq.question && (sq.expected_answer || sq.answer))
            .map((sq: any) => ({
              question: String(sq.question).trim(),
              expected_answer: String(sq.expected_answer || sq.answer).trim(),
              explanation: sq.explanation ? String(sq.explanation).trim() : "No explanation provided.",
            }))

          if (validSubQs.length === 0) continue

          validatedQuestions.push({
            question: String(q.question).trim(),
            options: [],
            correct_answer: q.correct_answer ? String(q.correct_answer).trim() : "OSCE Station Evaluation Key",
            explanation: q.explanation ? String(q.explanation).trim() : "No overall rubric provided.",
            sub_questions: validSubQs,
          })
          existingStemsSet.add(stemKey)
        } else { // SBA
          let rawOptions: string[] = []
          if (Array.isArray(q.options)) {
            rawOptions = q.options.map((opt: any) => String(opt).trim()).filter(Boolean)
          } else if (q.options && typeof q.options === "object") {
            rawOptions = Object.values(q.options).map((opt: any) => String(opt).trim()).filter(Boolean)
          }

          if (!q.question || rawOptions.length < 2 || q.correct_answer === undefined || q.correct_answer === null) continue

          let options = [...rawOptions]
          if (options.length < 4) {
            while (options.length < 4) {
              options.push(`Alternative Option ${options.length + 1}`)
            }
          } else if (options.length > 4) {
            options = options.slice(0, 4)
          }

          let rawCorrect = String(q.correct_answer).trim()
          let correctAnswer = rawCorrect

          // Map choice letters (A, B, C, D) or indices (0, 1, 2, 3) to exact option string
          const cleanKey = rawCorrect.replace(/^(option|choice)\s*/i, "").replace(/[\):.]/g, "").trim().toUpperCase()
          if (["A", "B", "C", "D"].includes(cleanKey)) {
            const idx = cleanKey.charCodeAt(0) - 65
            if (options[idx]) {
              correctAnswer = options[idx]
            }
          } else if (/^[0-3]$/.test(cleanKey)) {
            const idx = parseInt(cleanKey, 10)
            if (options[idx]) {
              correctAnswer = options[idx]
            }
          }

          if (!options.includes(correctAnswer)) {
            const matchedOpt = options.find((opt) => opt.toLowerCase() === rawCorrect.toLowerCase() || opt.toLowerCase().includes(rawCorrect.toLowerCase()))
            correctAnswer = matchedOpt || options[0]
          }

          validatedQuestions.push({
            question: String(q.question).trim(),
            options,
            correct_answer: correctAnswer,
            explanation: q.explanation ? String(q.explanation).trim() : "No explanation provided.",
          })
          existingStemsSet.add(stemKey)
        }
      }
    }

    if (validatedQuestions.length === 0) {
      console.error("[Quiz Generator Failure]: Zero valid questions could be generated.", {
        course_id,
        topic: trimmedTopic,
        format: chosenFormat,
        requestedCount: countToGenerate,
        totalAttempts,
      })
      return NextResponse.json({ error: "Quiz generation is temporarily unavailable. Please try again." }, { status: 502 })
    }

    // Slice to exact requested count if we generated extra
    const finalQuestions = validatedQuestions.slice(0, countToGenerate)

    // 7. Insert new Quiz record into Supabase
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
      console.error("[Quiz Generator DB Error]: Failed to insert new quiz record:", insertQuizError)
      return NextResponse.json({ error: "Failed to save generated quiz record to the database" }, { status: 500 })
    }

    // 8. Insert Questions linked to Quiz ID
    const questionsToInsert = finalQuestions.map((q) => ({
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
      console.error("[Quiz Generator DB Error]: Failed to insert quiz questions:", insertQuestionsError)
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
    }))

    return NextResponse.json({
      quiz_id: newQuiz.id,
      questions: formattedQuestions,
      cached: false,
    })
  } catch (err: any) {
    console.error("[Quiz Generator Unexpected Error]:", err)
    return NextResponse.json({ error: "An unexpected error occurred during quiz generation" }, { status: 500 })
  }
}
