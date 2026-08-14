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
        target_type: "tutorial",
        target_id: targetId,
        old_value: typeof oldValue === "object" ? JSON.stringify(oldValue) : String(oldValue ?? ""),
        new_value: typeof newValue === "object" ? JSON.stringify(newValue) : String(newValue ?? ""),
        reason,
      })
    if (error) {
      console.error("Failed to insert admin audit log for tutorial:", error)
    }
  } catch (err) {
    console.error("Unexpected error writing tutorial audit log:", err)
  }
}

// Verify calling admin role
async function checkAdminAccess(supabase: any, serviceSupabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    if (authError) {
      console.error("[TEMP ERROR LOG - tutorials authError]:", authError)
    }
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null }
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select("role, admin_permissions")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    console.error("[TEMP ERROR LOG - tutorials caller check]:", profileError)
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

    // Parse parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("query") || ""
    const statusFilter = searchParams.get("status") || "all"
    const courseFilter = searchParams.get("course_id") || "all"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    let queryBuilder = serviceSupabase
      .from("tutorials")
      .select("*, courses (code, title)", { count: "exact" })

    // Apply filters
    if (search.trim()) {
      const cleanSearch = search.trim()
      queryBuilder = queryBuilder.ilike("title", `%${cleanSearch}%`)
    }
    if (statusFilter !== "all") {
      queryBuilder = queryBuilder.eq("status", statusFilter)
    }
    if (courseFilter !== "all") {
      queryBuilder = queryBuilder.eq("course_id", courseFilter)
    }

    // Sort by created_at desc
    queryBuilder = queryBuilder.order("created_at", { ascending: false })

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    queryBuilder = queryBuilder.range(from, to)

    const { data: tutorials, count, error: fetchError } = await queryBuilder

    if (fetchError) {
      console.error("[TEMP ERROR LOG - tutorials GET fetch]:", fetchError)
      return NextResponse.json({ error: "Failed to fetch tutorials" }, { status: 500 })
    }

    return NextResponse.json({
      tutorials: tutorials || [],
      count: count || 0,
    })
  } catch (err: any) {
    console.error("Unexpected error in GET admin tutorials API:", err)
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
      overview,
      sections,
      linked_quiz_id,
      status,
    } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "Bad Request: Title is required" }, { status: 400 })
    }
    if (!course_id) {
      return NextResponse.json({ error: "Bad Request: Course selection is required" }, { status: 400 })
    }

    const payload = {
      title: title.trim(),
      course_id,
      overview: overview?.trim() || "",
      sections: Array.isArray(sections) ? sections : [],
      linked_quiz_id: linked_quiz_id || null,
      status: status || "draft",
    }

    const { data: tutorial, error: insertError } = await serviceSupabase
      .from("tutorials")
      .insert(payload)
      .select()
      .single()

    if (insertError) {
      console.error("[TEMP ERROR LOG - tutorials POST insert]:", insertError)
      return NextResponse.json({ error: "Failed to create tutorial: " + insertError.message }, { status: 500 })
    }

    await createAuditLog(
      serviceSupabase,
      user.id,
      "create_tutorial",
      tutorial.id,
      null,
      payload
    )

    return NextResponse.json({ success: true, tutorial })
  } catch (err: any) {
    console.error("Unexpected error in POST admin tutorials API:", err)
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
      overview,
      sections,
      linked_quiz_id,
      status,
    } = body

    if (!id) {
      return NextResponse.json({ error: "Bad Request: Missing tutorial id" }, { status: 400 })
    }

    // Fetch existing tutorial
    const { data: oldTutorial, error: fetchError } = await serviceSupabase
      .from("tutorials")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !oldTutorial) {
      console.error("[TEMP ERROR LOG - tutorials PATCH fetch]:", fetchError)
      return NextResponse.json({ error: "Tutorial not found" }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    if (title !== undefined) updates.title = title.trim()
    if (course_id !== undefined) updates.course_id = course_id
    if (overview !== undefined) updates.overview = overview?.trim() || ""
    if (sections !== undefined) updates.sections = Array.isArray(sections) ? sections : []
    if (linked_quiz_id !== undefined) updates.linked_quiz_id = linked_quiz_id || null
    if (status !== undefined) updates.status = status

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No updates provided" })
    }

    const { error: updateError } = await serviceSupabase
      .from("tutorials")
      .update(updates)
      .eq("id", id)

    if (updateError) {
      console.error("[TEMP ERROR LOG - tutorials PATCH update]:", updateError)
      return NextResponse.json({ error: "Failed to update tutorial: " + updateError.message }, { status: 500 })
    }

    // Write precise audit logs
    for (const key of Object.keys(updates)) {
      const oldVal = oldTutorial[key]
      const newVal = updates[key]

      if (key === "sections") {
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          await createAuditLog(
            serviceSupabase,
            user.id,
            "update_tutorial_sections",
            id,
            oldVal,
            newVal
          )
        }
      } else if (oldVal !== newVal) {
        await createAuditLog(
          serviceSupabase,
          user.id,
          `update_tutorial_${key}`,
          id,
          oldVal,
          newVal
        )
      }
    }

    return NextResponse.json({ success: true, message: "Tutorial updated successfully" })
  } catch (err: any) {
    console.error("Unexpected error in PATCH admin tutorials API:", err)
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
      return NextResponse.json({ error: "Bad Request: Missing tutorial id" }, { status: 400 })
    }

    // Fetch tutorial details
    const { data: tutorial, error: fetchError } = await serviceSupabase
      .from("tutorials")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !tutorial) {
      console.error("[TEMP ERROR LOG - tutorials DELETE fetch]:", fetchError)
      return NextResponse.json({ error: "Tutorial not found" }, { status: 404 })
    }

    // Perform database deletion
    const { error: deleteError } = await serviceSupabase
      .from("tutorials")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[TEMP ERROR LOG - tutorials DELETE operation]:", deleteError)
      return NextResponse.json({ error: "Failed to delete tutorial: " + deleteError.message }, { status: 500 })
    }

    // Write audit log
    await createAuditLog(
      serviceSupabase,
      user.id,
      "delete_tutorial",
      id,
      tutorial,
      null
    )

    return NextResponse.json({ success: true, message: "Tutorial deleted successfully" })
  } catch (err: any) {
    console.error("Unexpected error in DELETE admin tutorials API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
