import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import * as pdfjs from "pdfjs-dist"

// Helper to auto-populate untracked images from quiz-bank storage bucket
export async function syncUntrackedQuizBankImages(serviceSupabase: any) {
  try {
    // 1. List files in quiz-bank storage bucket
    const { data: storageFiles, error: listError } = await serviceSupabase.storage
      .from("quiz-bank")
      .list()

    if (listError || !storageFiles || storageFiles.length === 0) {
      return { syncedCount: 0 }
    }

    // Filter out directories or hidden files
    const imageFiles = storageFiles.filter(
      (f: any) =>
        f.name &&
        !f.name.startsWith(".") &&
        !f.name.endsWith("/") &&
        /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name)
    )

    if (imageFiles.length === 0) {
      return { syncedCount: 0 }
    }

    // 2. Query existing quiz_image_bank records to find tracked images
    const { data: existingRows } = await serviceSupabase
      .from("quiz_image_bank")
      .select("id, image_url")

    const trackedUrls = new Set(
      (existingRows || []).map((r: any) => r.image_url).filter(Boolean)
    )

    // Find untracked storage files
    const untrackedFiles = imageFiles.filter((file: any) => {
      const publicUrl = serviceSupabase.storage
        .from("quiz-bank")
        .getPublicUrl(file.name).data.publicUrl
      return !Array.from(trackedUrls).some(
        (url: any) => String(url).includes(file.name) || url === publicUrl
      )
    })

    if (untrackedFiles.length === 0) {
      return { syncedCount: 0 }
    }

    // 3. Fetch courses list for matching
    const { data: courses } = await serviceSupabase
      .from("courses")
      .select("id, code, title, level, description")

    if (!courses || courses.length === 0) {
      console.warn("No courses found in database to map untracked quiz bank images.")
      return { syncedCount: 0 }
    }

    // 4. Fetch published materials for PDF context extraction (Smart Library PDFs)
    const { data: pdfMaterials } = await serviceSupabase
      .from("materials")
      .select("id, title, course_id, source_url, type")
      .eq("status", "published")

    const pdfTextMap: Record<string, string> = {}
    if (pdfMaterials && pdfMaterials.length > 0) {
      for (const mat of pdfMaterials) {
        if (
          mat.course_id &&
          !pdfTextMap[mat.course_id] &&
          mat.source_url?.includes("supabase.co/storage") &&
          (mat.type?.toLowerCase() === "pdf" || mat.source_url?.toLowerCase().endsWith(".pdf"))
        ) {
          try {
            const pdfResponse = await fetch(mat.source_url)
            if (pdfResponse.ok) {
              const arrayBuffer = await pdfResponse.arrayBuffer()
              const pdfData = new Uint8Array(arrayBuffer)
              const loadingTask = pdfjs.getDocument({ data: pdfData })
              const pdfDoc = await loadingTask.promise
              let extractedText = ""
              const maxPages = Math.min(pdfDoc.numPages, 3)
              for (let p = 1; p <= maxPages; p++) {
                const page = await pdfDoc.getPage(p)
                const textContent = await page.getTextContent()
                extractedText += textContent.items.map((i: any) => i.str).join(" ") + " "
                if (extractedText.length > 2000) break
              }
              pdfTextMap[mat.course_id] = extractedText.trim().slice(0, 1500)
            }
          } catch (e) {
            console.warn(`Could not extract PDF snippet for course ${mat.course_id}:`, e)
          }
        }
      }
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      console.error("GROQ_API_KEY missing for image bank auto-population")
      return { syncedCount: 0 }
    }

    let syncedCount = 0

    // 5. Process each untracked image
    for (const file of untrackedFiles) {
      const publicUrl = serviceSupabase.storage
        .from("quiz-bank")
        .getPublicUrl(file.name).data.publicUrl

      const courseListString = courses
        .map((c: any) => `- ID: ${c.id} | Code: ${c.code || ""} | Title: ${c.title || ""} | Level: ${c.level || ""}`)
        .join("\n")

      const pdfGroundingString = Object.entries(pdfTextMap)
        .map(([cid, txt]) => {
          const cObj = courses.find((c: any) => c.id === cid)
          return `Course ${cObj?.code || cid} Guide Snippet:\n\"\"\"\n${txt}\n\"\"\"`
        })
        .join("\n\n")

      const systemPrompt = `You are an expert medical educator and pathology/clinical diagnostics specialist.
Analyze the medical specimen image provided and match it to the most relevant medical course from the provided list.
You must return strictly valid JSON with no markdown block markers, containing exactly the following keys:
- "title": string (A concise, professional medical title for the specimen, e.g. "Renal Cell Carcinoma — Gross Specimen" or "Normal Blood Film")
- "course_id": string (MUST be an exact course ID chosen from the provided course list)
- "category": string (MUST be exactly one of: "gross_specimen", "histology_slide", "blood_film", "clinical_photo", "equipment", "radiology", "other")
- "correct_findings": string (Clear, detailed description of visible diagnostic findings, hallmarks, or features)
- "differential_diagnosis": string or null (Plausible differential diagnoses, or null if normal/not applicable)

List of Available Courses:
${courseListString}

${pdfGroundingString ? `Reference Revision Guides from Smart Library:\n${pdfGroundingString}\n` : ""}
If the vision model is unavailable, use the image filename ("${file.name}") and reference revision guides to infer the best course, category, title, correct_findings, and differential_diagnosis.`

      let inferredData: any = null

      try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.2-11b-vision-preview",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: `Analyze this untracked medical specimen image (filename: ${file.name}):` },
                  { type: "image_url", image_url: { url: publicUrl } },
                ],
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.4,
          }),
        })

        if (groqResponse.ok) {
          const groqData = await groqResponse.json()
          const rawContent = groqData.choices?.[0]?.message?.content
          if (rawContent) {
            inferredData = JSON.parse(rawContent)
          }
        } else {
          console.warn("Groq Vision API returned non-OK status, attempting fallback text inference with llama-3.1-8b-instant...")
        }
      } catch (err) {
        console.warn("Groq Vision call failed, using fallback inference:", err)
      }

      if (!inferredData) {
        try {
          const fallbackResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Infer specimen metadata for image filename: ${file.name}` },
              ],
              response_format: { type: "json_object" },
              temperature: 0.5,
            }),
          })
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json()
            const raw = fallbackData.choices?.[0]?.message?.content
            if (raw) inferredData = JSON.parse(raw)
          }
        } catch (fbErr) {
          console.error("Fallback inference failed:", fbErr)
        }
      }

      // Validate inferred data
      const matchedCourseId = courses.some((c: any) => c.id === inferredData?.course_id)
        ? inferredData.course_id
        : courses[0].id

      const validCategories = ["gross_specimen", "histology_slide", "blood_film", "clinical_photo", "equipment", "radiology", "other"]
      const category = validCategories.includes(inferredData?.category)
        ? inferredData.category
        : "gross_specimen"

      const rawFileName = file.name.split(".")[0].replace(/[-_]/g, " ")
      const cleanFileName = rawFileName.charAt(0).toUpperCase() + rawFileName.slice(1)
      const title = inferredData?.title?.trim() || cleanFileName || "Medical Specimen"
      const correct_findings = inferredData?.correct_findings?.trim() || `Diagnostic specimen features for ${title}.`
      const differential_diagnosis = inferredData?.differential_diagnosis?.trim() || null

      const insertPayload = {
        title,
        course_id: matchedCourseId,
        category,
        correct_findings,
        differential_diagnosis,
        image_url: publicUrl,
        source: "ai_generated",
        status: "published",
      }

      const { error: insertError } = await serviceSupabase
        .from("quiz_image_bank")
        .insert(insertPayload)

      if (insertError) {
        console.error(`Failed to insert auto-populated row for ${file.name}:`, insertError)
      } else {
        syncedCount++
      }
    }

    return { syncedCount }
  } catch (err) {
    console.error("Error in syncUntrackedQuizBankImages:", err)
    return { syncedCount: 0 }
  }
}

// Helper to audit actions
async function createAuditLog(
  supabase: any,
  adminId: string,
  action: string,
  targetId: string,
  oldValue: any,
  newValue: any,
  reason: string | null = null
) {
  try {
    const { error } = await supabase
      .from("admin_audit_log")
      .insert({
        admin_id: adminId,
        action,
        target_type: "quiz_image_bank",
        target_id: targetId,
        old_value: typeof oldValue === "object" ? JSON.stringify(oldValue) : String(oldValue ?? ""),
        new_value: typeof newValue === "object" ? JSON.stringify(newValue) : String(newValue ?? ""),
        reason,
      })
    if (error) {
      console.error("Failed to insert admin audit log for quiz_image_bank:", error)
    }
  } catch (err) {
    console.error("Unexpected error writing quiz_image_bank audit log:", err)
  }
}

// Verify calling admin role
async function checkAdminAccess(supabase: any, serviceSupabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    if (authError) {
      console.error("[TEMP ERROR LOG - quiz-bank authError]:", authError)
    }
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null }
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select("role, admin_permissions")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    console.error("[TEMP ERROR LOG - quiz-bank caller check]:", profileError)
    return { errorResponse: NextResponse.json({ error: "Forbidden: No profile found" }, { status: 403 }), user: null }
  }

  const callerRole = String(profile.role || "").toLowerCase()
  const isAdmin = callerRole === "admin" || callerRole === "super_admin" || callerRole === "moderator"

  if (!isAdmin) {
    return { errorResponse: NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 }), user: null }
  }

  return { errorResponse: null, user }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { errorResponse } = await checkAdminAccess(supabase, serviceSupabase)
    if (errorResponse) return errorResponse

    // Auto-sync untracked images from quiz-bank storage bucket
    await syncUntrackedQuizBankImages(serviceSupabase)

    // Parse search parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("query") || ""
    const courseId = searchParams.get("course_id") || "all"
    const categoryFilter = searchParams.get("category") || "all"
    const statusFilter = searchParams.get("status") || "all"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    let queryBuilder = serviceSupabase
      .from("quiz_image_bank")
      .select(`
        id,
        course_id,
        title,
        category,
        correct_findings,
        differential_diagnosis,
        source,
        image_url,
        status,
        created_at,
        courses (
          id,
          code,
          title
        )
      `, { count: "exact" })

    // Apply filters
    if (search.trim()) {
      queryBuilder = queryBuilder.or(`title.ilike.%${search.trim()}%,correct_findings.ilike.%${search.trim()}%`)
    }
    if (courseId !== "all") {
      queryBuilder = queryBuilder.eq("course_id", courseId)
    }
    if (categoryFilter !== "all") {
      queryBuilder = queryBuilder.eq("category", categoryFilter)
    }
    if (statusFilter !== "all") {
      queryBuilder = queryBuilder.eq("status", statusFilter)
    }

    // Sort by created_at desc
    queryBuilder = queryBuilder.order("created_at", { ascending: false })

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    queryBuilder = queryBuilder.range(from, to)

    const { data: images, count, error: fetchError } = await queryBuilder

    if (fetchError) {
      console.error("[TEMP ERROR LOG - quiz-bank GET fetch]:", fetchError)
      return NextResponse.json({ error: "Failed to fetch quiz image bank" }, { status: 500 })
    }

    return NextResponse.json({
      images: images || [],
      count: count || 0,
    })
  } catch (err: any) {
    console.error("Unexpected error in GET admin quiz-bank API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { errorResponse, user } = await checkAdminAccess(supabase, serviceSupabase)
    if (errorResponse) return errorResponse
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      title,
      course_id,
      category,
      correct_findings,
      differential_diagnosis,
      source,
      image_url,
      status,
    } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "Bad Request: Title is required" }, { status: 400 })
    }
    if (!course_id?.trim()) {
      return NextResponse.json({ error: "Bad Request: Course selection is required" }, { status: 400 })
    }
    if (!category?.trim()) {
      return NextResponse.json({ error: "Bad Request: Category is required" }, { status: 400 })
    }
    if (!correct_findings?.trim()) {
      return NextResponse.json({ error: "Bad Request: Correct findings are required" }, { status: 400 })
    }

    const payload = {
      title: title.trim(),
      course_id: course_id.trim(),
      category: category.trim(),
      correct_findings: correct_findings.trim(),
      differential_diagnosis: differential_diagnosis?.trim() || null,
      source: source?.trim() || "own_photo",
      image_url: image_url?.trim() || null,
      status: status || "published",
    }

    const { data: imageItem, error: insertError } = await serviceSupabase
      .from("quiz_image_bank")
      .insert(payload)
      .select()
      .single()

    if (insertError) {
      console.error("[TEMP ERROR LOG - quiz-bank POST insert]:", insertError)
      return NextResponse.json({ error: "Failed to create image bank entry: " + insertError.message }, { status: 500 })
    }

    await createAuditLog(
      serviceSupabase,
      user.id,
      "create_quiz_image_bank",
      imageItem.id,
      null,
      payload
    )

    return NextResponse.json({ success: true, image: imageItem })
  } catch (err: any) {
    console.error("Unexpected error in POST admin quiz-bank API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { errorResponse, user } = await checkAdminAccess(supabase, serviceSupabase)
    if (errorResponse) return errorResponse
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      id,
      title,
      course_id,
      category,
      correct_findings,
      differential_diagnosis,
      source,
      image_url,
      status,
    } = body

    if (!id) {
      return NextResponse.json({ error: "Bad Request: Missing image bank item id" }, { status: 400 })
    }

    const { data: oldItem, error: fetchError } = await serviceSupabase
      .from("quiz_image_bank")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !oldItem) {
      console.error("[TEMP ERROR LOG - quiz-bank PATCH fetch]:", fetchError)
      return NextResponse.json({ error: "Image bank item not found" }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    if (title !== undefined) updates.title = title.trim()
    if (course_id !== undefined) updates.course_id = course_id.trim()
    if (category !== undefined) updates.category = category.trim()
    if (correct_findings !== undefined) updates.correct_findings = correct_findings.trim()
    if (differential_diagnosis !== undefined) updates.differential_diagnosis = differential_diagnosis?.trim() || null
    if (source !== undefined) updates.source = source?.trim() || "own_photo"
    if (image_url !== undefined) updates.image_url = image_url?.trim() || null
    if (status !== undefined) updates.status = status

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No updates provided" })
    }

    const { error: updateError } = await serviceSupabase
      .from("quiz_image_bank")
      .update(updates)
      .eq("id", id)

    if (updateError) {
      console.error("[TEMP ERROR LOG - quiz-bank PATCH update]:", updateError)
      return NextResponse.json({ error: "Failed to update image bank item: " + updateError.message }, { status: 500 })
    }

    for (const key of Object.keys(updates)) {
      const oldVal = oldItem[key]
      const newVal = updates[key]
      if (oldVal !== newVal) {
        await createAuditLog(
          serviceSupabase,
          user.id,
          `update_quiz_image_bank_${key}`,
          id,
          oldVal,
          newVal
        )
      }
    }

    return NextResponse.json({ success: true, message: "Image bank item updated successfully" })
  } catch (err: any) {
    console.error("Unexpected error in PATCH admin quiz-bank API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { errorResponse, user } = await checkAdminAccess(supabase, serviceSupabase)
    if (errorResponse) return errorResponse
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Bad Request: Missing image bank item id" }, { status: 400 })
    }

    const { data: item, error: fetchError } = await serviceSupabase
      .from("quiz_image_bank")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !item) {
      console.error("[TEMP ERROR LOG - quiz-bank DELETE fetch]:", fetchError)
      return NextResponse.json({ error: "Image bank item not found" }, { status: 404 })
    }

    const { error: deleteError } = await serviceSupabase
      .from("quiz_image_bank")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[TEMP ERROR LOG - quiz-bank DELETE operation]:", deleteError)
      return NextResponse.json({ error: "Failed to delete image bank item: " + deleteError.message }, { status: 500 })
    }

    const fileToMaybeDeleteUrl = item.image_url
    if (fileToMaybeDeleteUrl) {
      const filePath = fileToMaybeDeleteUrl.includes("/quiz-bank/")
        ? fileToMaybeDeleteUrl.split("/quiz-bank/").pop()
        : fileToMaybeDeleteUrl

      if (filePath) {
        const { data: sharedItems } = await serviceSupabase
          .from("quiz_image_bank")
          .select("id")
          .eq("image_url", fileToMaybeDeleteUrl)
          .neq("id", id)
          .limit(1)

        if (!sharedItems || sharedItems.length === 0) {
          const { error: storageDeleteError } = await serviceSupabase.storage
            .from("quiz-bank")
            .remove([filePath])
          if (storageDeleteError) {
            console.warn("Could not delete file from quiz-bank storage:", storageDeleteError)
          }
        }
      }
    }

    await createAuditLog(
      serviceSupabase,
      user.id,
      "delete_quiz_image_bank",
      id,
      item,
      null
    )

    return NextResponse.json({ success: true, message: "Image bank item deleted successfully" })
  } catch (err: any) {
    console.error("Unexpected error in DELETE admin quiz-bank API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
