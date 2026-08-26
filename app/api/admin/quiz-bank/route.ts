import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// Helper to sync published specimen images into flashcards & flashcard_decks
async function syncSpecimenFlashcard(
  serviceSupabase: any,
  imageItem: {
    id: string
    course_id: string
    question?: string | null
    correct_findings?: string | null
    differential_diagnosis?: string | null
    status: string
  },
  userId: string
) {
  try {
    if (imageItem.status !== "active") {
      await serviceSupabase.from("flashcards").delete().eq("image_bank_id", imageItem.id)
      return
    }

    const { data: courseData } = await serviceSupabase
      .from("courses")
      .select("code")
      .eq("id", imageItem.course_id)
      .maybeSingle()

    const courseCode = courseData?.code || "Course"
    const deckTopic = `${courseCode} Specimen Bank`

    let { data: deck } = await serviceSupabase
      .from("flashcard_decks")
      .select("id")
      .eq("course_id", imageItem.course_id)
      .eq("source", "specimen_bank")
      .maybeSingle()

    if (!deck) {
      const { data: newDeck, error: deckErr } = await serviceSupabase
        .from("flashcard_decks")
        .insert({
          course_id: imageItem.course_id,
          topic: deckTopic,
          source: "specimen_bank",
          created_by: userId,
        })
        .select("id")
        .single()

      if (deckErr) {
        console.error("Failed to create specimen flashcard deck:", deckErr)
        return
      }
      deck = newDeck
    }

    if (!deck) return

    const questionText = imageItem.question?.trim() || "Identify the main structure or diagnostic feature highlighted in this specimen."
    const correctFindings = imageItem.correct_findings?.trim() || ""
    const ddx = imageItem.differential_diagnosis?.trim()

    const backText = ddx
      ? `${correctFindings}\n\nDifferential Diagnosis: ${ddx}`
      : correctFindings

    const { data: existingCard } = await serviceSupabase
      .from("flashcards")
      .select("id")
      .eq("image_bank_id", imageItem.id)
      .maybeSingle()

    if (existingCard) {
      await serviceSupabase
        .from("flashcards")
        .update({
          deck_id: deck.id,
          front: questionText,
          back: backText,
        })
        .eq("id", existingCard.id)
    } else {
      await serviceSupabase
        .from("flashcards")
        .insert({
          deck_id: deck.id,
          image_bank_id: imageItem.id,
          front: questionText,
          back: backText,
        })
    }
  } catch (err) {
    console.error("Error syncing specimen flashcard:", err)
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

    // Parse search parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("query") || ""
    const courseId = searchParams.get("course_id") || "all"
    const categoryFilter = searchParams.get("category") || "all"
    const statusFilter = searchParams.get("status") || "all"
    const sourceFilter = searchParams.get("source") || "all"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    let queryBuilder = serviceSupabase
      .from("quiz_image_bank")
      .select(`
        id,
        course_id,
        title,
        category,
        question,
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
    if (sourceFilter === "auto_extracted") {
      queryBuilder = queryBuilder.ilike("source", "auto_extracted%")
    } else if (sourceFilter !== "all") {
      queryBuilder = queryBuilder.eq("source", sourceFilter)
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
      question,
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
    if (!question?.trim()) {
      return NextResponse.json({ error: "Bad Request: Question text is required" }, { status: 400 })
    }
    if (!correct_findings?.trim()) {
      return NextResponse.json({ error: "Bad Request: Correct findings are required" }, { status: 400 })
    }

    const payload = {
      title: title.trim(),
      course_id: course_id.trim(),
      category: category.trim(),
      question: question.trim(),
      correct_findings: correct_findings.trim(),
      differential_diagnosis: differential_diagnosis?.trim() || null,
      source: source?.trim() || "own_photo",
      image_url: image_url?.trim() || null,
      status: status || "active",
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

    await syncSpecimenFlashcard(serviceSupabase, imageItem, user.id)

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
      question,
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
    if (question !== undefined) updates.question = question.trim()
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

    const { data: updatedItem } = await serviceSupabase
      .from("quiz_image_bank")
      .select("id, course_id, question, correct_findings, differential_diagnosis, status")
      .eq("id", id)
      .maybeSingle()

    if (updatedItem) {
      await syncSpecimenFlashcard(serviceSupabase, updatedItem, user.id)
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

    // Remove synced flashcard if present
    await serviceSupabase.from("flashcards").delete().eq("image_bank_id", id)

    if (deleteError) {
      console.error("[TEMP ERROR LOG - quiz-bank DELETE operation]:", deleteError)
      return NextResponse.json({ error: "Failed to delete image bank item: " + deleteError.message }, { status: 500 })
    }

    const fileToMaybeDelete = item.storage_path
    if (fileToMaybeDelete) {
      const { data: sharedItems } = await serviceSupabase
        .from("quiz_image_bank")
        .select("id")
        .eq("storage_path", fileToMaybeDelete)
        .limit(1)

      if (!sharedItems || sharedItems.length === 0) {
        const { error: storageDeleteError } = await serviceSupabase.storage
          .from("quiz-bank")
          .remove([fileToMaybeDelete])
        if (storageDeleteError) {
          console.warn("Could not delete file from quiz-bank storage:", storageDeleteError)
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
