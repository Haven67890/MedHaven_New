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
        target_type: "faculty",
        target_id: targetId,
        old_value: typeof oldValue === "object" ? JSON.stringify(oldValue) : String(oldValue ?? ""),
        new_value: typeof newValue === "object" ? JSON.stringify(newValue) : String(newValue ?? ""),
        reason,
      })
    if (error) {
      console.error("Failed to insert admin audit log for faculty:", error)
    }
  } catch (err) {
    console.error("Unexpected error writing faculty audit log:", err)
  }
}

// Verify calling admin role
async function checkAdminAccess(supabase: any, serviceSupabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    if (authError) {
      console.error("[TEMP ERROR LOG - faculties authError]:", authError)
    }
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null }
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select("role, admin_permissions")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    console.error("[TEMP ERROR LOG - faculties caller check]:", profileError)
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
    const uniFilter = searchParams.get("university_id") || "all"
    const pageStr = searchParams.get("page")
    const limitStr = searchParams.get("limit")

    let queryBuilder = serviceSupabase
      .from("faculties")
      .select("*, universities (name, short_name)", { count: "exact" })

    // Apply filters
    if (search.trim()) {
      queryBuilder = queryBuilder.ilike("name", `%${search.trim()}%`)
    }
    if (uniFilter !== "all") {
      queryBuilder = queryBuilder.eq("university_id", uniFilter)
    }

    // Sort by name ascending
    queryBuilder = queryBuilder.order("name", { ascending: true })

    // Optional pagination
    if (pageStr && limitStr) {
      const page = parseInt(pageStr, 10)
      const limit = parseInt(limitStr, 10)
      const from = (page - 1) * limit
      const to = from + limit - 1
      queryBuilder = queryBuilder.range(from, to)
    }

    const { data: faculties, count, error: fetchError } = await queryBuilder

    if (fetchError) {
      console.error("[TEMP ERROR LOG - faculties GET fetch]:", fetchError)
      return NextResponse.json({ error: "Failed to fetch faculties" }, { status: 500 })
    }

    return NextResponse.json({
      faculties: faculties || [],
      count: count || 0,
    })
  } catch (err: any) {
    console.error("Unexpected error in GET admin faculties API:", err)
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
    const { name, university_id } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Bad Request: Name is required" }, { status: 400 })
    }
    if (!university_id) {
      return NextResponse.json({ error: "Bad Request: Parent University is required" }, { status: 400 })
    }

    // Verify parent university exists
    const { data: parentUni, error: uniError } = await serviceSupabase
      .from("universities")
      .select("id")
      .eq("id", university_id)
      .maybeSingle()

    if (uniError || !parentUni) {
      return NextResponse.json({ error: "Bad Request: Selected university does not exist" }, { status: 400 })
    }

    const payload = {
      name: name.trim(),
      university_id,
    }

    const { data: faculty, error: insertError } = await serviceSupabase
      .from("faculties")
      .insert(payload)
      .select()
      .single()

    if (insertError) {
      console.error("[TEMP ERROR LOG - faculties POST insert]:", insertError)
      return NextResponse.json({ error: "Failed to create faculty: " + insertError.message }, { status: 500 })
    }

    await createAuditLog(
      serviceSupabase,
      user.id,
      "create_faculty",
      faculty.id,
      null,
      payload
    )

    return NextResponse.json({ success: true, faculty })
  } catch (err: any) {
    console.error("Unexpected error in POST admin faculties API:", err)
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
    const { id, name, university_id } = body

    if (!id) {
      return NextResponse.json({ error: "Bad Request: Missing faculty id" }, { status: 400 })
    }

    // Fetch existing faculty
    const { data: oldFaculty, error: fetchError } = await serviceSupabase
      .from("faculties")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !oldFaculty) {
      console.error("[TEMP ERROR LOG - faculties PATCH fetch]:", fetchError)
      return NextResponse.json({ error: "Faculty not found" }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    if (name !== undefined) updates.name = name.trim()
    if (university_id !== undefined) {
      // Verify parent university exists
      const { data: parentUni, error: uniError } = await serviceSupabase
        .from("universities")
        .select("id")
        .eq("id", university_id)
        .maybeSingle()

      if (uniError || !parentUni) {
        return NextResponse.json({ error: "Bad Request: Selected university does not exist" }, { status: 400 })
      }
      updates.university_id = university_id
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No updates provided" })
    }

    const { error: updateError } = await serviceSupabase
      .from("faculties")
      .update(updates)
      .eq("id", id)

    if (updateError) {
      console.error("[TEMP ERROR LOG - faculties PATCH update]:", updateError)
      return NextResponse.json({ error: "Failed to update faculty: " + updateError.message }, { status: 500 })
    }

    // Write audit logs
    for (const key of Object.keys(updates)) {
      const oldVal = oldFaculty[key]
      const newVal = updates[key]

      if (oldVal !== newVal) {
        await createAuditLog(
          serviceSupabase,
          user.id,
          `update_faculty_${key}`,
          id,
          oldVal,
          newVal
        )
      }
    }

    return NextResponse.json({ success: true, message: "Faculty updated successfully" })
  } catch (err: any) {
    console.error("Unexpected error in PATCH admin faculties API:", err)
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
      return NextResponse.json({ error: "Bad Request: Missing faculty id" }, { status: 400 })
    }

    // Fetch faculty details
    const { data: faculty, error: fetchError } = await serviceSupabase
      .from("faculties")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !faculty) {
      console.error("[TEMP ERROR LOG - faculties DELETE fetch]:", fetchError)
      return NextResponse.json({ error: "Faculty not found" }, { status: 404 })
    }

    // Cascade dependency check: Check if any courses link to this faculty
    const { data: linkedCourses, error: checkError } = await serviceSupabase
      .from("courses")
      .select("id, code, title")
      .eq("faculty_id", id)
      .limit(1)

    if (checkError) {
      console.error("[TEMP ERROR LOG - faculties DELETE dependency check]:", checkError)
      return NextResponse.json({ error: "Failed dependency check" }, { status: 500 })
    }

    if (linkedCourses && linkedCourses.length > 0) {
      return NextResponse.json({
        error: `Cannot delete faculty: Course "${linkedCourses[0].code}: ${linkedCourses[0].title}" is currently associated with it.`
      }, { status: 400 })
    }

    // Perform database deletion
    const { error: deleteError } = await serviceSupabase
      .from("faculties")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[TEMP ERROR LOG - faculties DELETE operation]:", deleteError)
      return NextResponse.json({ error: "Failed to delete faculty: " + deleteError.message }, { status: 500 })
    }

    // Write audit log
    await createAuditLog(
      serviceSupabase,
      user.id,
      "delete_faculty",
      id,
      faculty,
      null
    )

    return NextResponse.json({ success: true, message: "Faculty deleted successfully" })
  } catch (err: any) {
    console.error("Unexpected error in DELETE admin faculties API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
