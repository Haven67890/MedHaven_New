import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

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
        storage_path,
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
      storage_path,
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
      storage_path: storage_path?.trim() || null,
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
      storage_path,
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
    if (storage_path !== undefined) updates.storage_path = storage_path?.trim() || null
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
