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
        target_type: "staff",
        target_id: targetId,
        old_value: typeof oldValue === "object" ? JSON.stringify(oldValue) : String(oldValue ?? ""),
        new_value: typeof newValue === "object" ? JSON.stringify(newValue) : String(newValue ?? ""),
        reason,
      })
    if (error) {
      console.error("Failed to insert admin audit log for staff:", error)
    }
  } catch (err) {
    console.error("Unexpected error writing staff audit log:", err)
  }
}

// Verify calling admin role
async function checkAdminAccess(supabase: any, serviceSupabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    if (authError) {
      console.error("[TEMP ERROR LOG - staff authError]:", authError)
    }
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null }
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select("role, admin_permissions")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    console.error("[TEMP ERROR LOG - staff caller check]:", profileError)
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
    const departmentFilter = searchParams.get("department") || "all"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    let queryBuilder = serviceSupabase
      .from("staff")
      .select("*", { count: "exact" })

    // Apply filters
    if (search.trim()) {
      const cleanSearch = search.trim()
      // Filter by name or specialty or title (department can also be searched)
      // Since it's a simple dashboard list, we can search name or specialty
      queryBuilder = queryBuilder.or(`full_name.ilike.%${cleanSearch}%,specialty.ilike.%${cleanSearch}%,title.ilike.%${cleanSearch}%`)
    }
    if (departmentFilter !== "all") {
      queryBuilder = queryBuilder.eq("department", departmentFilter)
    }

    // Sort by created_at desc
    queryBuilder = queryBuilder.order("created_at", { ascending: false })

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    queryBuilder = queryBuilder.range(from, to)

    const { data: staff, count, error: fetchError } = await queryBuilder

    if (fetchError) {
      console.error("[TEMP ERROR LOG - staff GET fetch]:", fetchError)
      return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 })
    }

    return NextResponse.json({
      staff: staff || [],
      count: count || 0,
    })
  } catch (err: any) {
    console.error("Unexpected error in GET admin staff API:", err)
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
      full_name,
      photo_url,
      title,
      department,
      specialty,
      courses,
      status,
    } = body

    if (!full_name?.trim()) {
      return NextResponse.json({ error: "Bad Request: Full name is required" }, { status: 400 })
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: "Bad Request: Title is required" }, { status: 400 })
    }
    if (!department?.trim()) {
      return NextResponse.json({ error: "Bad Request: Department is required" }, { status: 400 })
    }

    const payload = {
      full_name: full_name.trim(),
      photo_url: photo_url?.trim() || null,
      title: title.trim(),
      department: department.trim(),
      specialty: specialty?.trim() || null,
      courses: Array.isArray(courses) ? courses : [],
      status: status || "active",
    }

    const { data: staffMember, error: insertError } = await serviceSupabase
      .from("staff")
      .insert(payload)
      .select()
      .single()

    if (insertError) {
      console.error("[TEMP ERROR LOG - staff POST insert]:", insertError)
      return NextResponse.json({ error: "Failed to create staff: " + insertError.message }, { status: 500 })
    }

    await createAuditLog(
      serviceSupabase,
      user.id,
      "create_staff",
      staffMember.id,
      null,
      payload
    )

    return NextResponse.json({ success: true, staff: staffMember })
  } catch (err: any) {
    console.error("Unexpected error in POST admin staff API:", err)
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
      full_name,
      photo_url,
      title,
      department,
      specialty,
      courses,
      status,
    } = body

    if (!id) {
      return NextResponse.json({ error: "Bad Request: Missing staff id" }, { status: 400 })
    }

    // Fetch existing staff
    const { data: oldStaff, error: fetchError } = await serviceSupabase
      .from("staff")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !oldStaff) {
      console.error("[TEMP ERROR LOG - staff PATCH fetch]:", fetchError)
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    if (full_name !== undefined) updates.full_name = full_name.trim()
    if (photo_url !== undefined) updates.photo_url = photo_url?.trim() || null
    if (title !== undefined) updates.title = title.trim()
    if (department !== undefined) updates.department = department.trim()
    if (specialty !== undefined) updates.specialty = specialty?.trim() || null
    if (courses !== undefined) updates.courses = Array.isArray(courses) ? courses : []
    if (status !== undefined) updates.status = status

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No updates provided" })
    }

    const { error: updateError } = await serviceSupabase
      .from("staff")
      .update(updates)
      .eq("id", id)

    if (updateError) {
      console.error("[TEMP ERROR LOG - staff PATCH update]:", updateError)
      return NextResponse.json({ error: "Failed to update staff: " + updateError.message }, { status: 500 })
    }

    // Determine what changed for precise audit log actions
    for (const key of Object.keys(updates)) {
      const oldVal = oldStaff[key]
      const newVal = updates[key]

      // Handle array comparison for courses
      if (key === "courses") {
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          await createAuditLog(
            serviceSupabase,
            user.id,
            `update_staff_courses`,
            id,
            oldVal,
            newVal
          )
        }
      } else if (oldVal !== newVal) {
        await createAuditLog(
          serviceSupabase,
          user.id,
          `update_staff_${key}`,
          id,
          oldVal,
          newVal
        )
      }
    }

    return NextResponse.json({ success: true, message: "Staff member updated successfully" })
  } catch (err: any) {
    console.error("Unexpected error in PATCH admin staff API:", err)
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
      return NextResponse.json({ error: "Bad Request: Missing staff id" }, { status: 400 })
    }

    // Fetch staff details
    const { data: staffMember, error: fetchError } = await serviceSupabase
      .from("staff")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !staffMember) {
      console.error("[TEMP ERROR LOG - staff DELETE fetch]:", fetchError)
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
    }

    // Perform database deletion
    const { error: deleteError } = await serviceSupabase
      .from("staff")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[TEMP ERROR LOG - staff DELETE operation]:", deleteError)
      return NextResponse.json({ error: "Failed to delete staff member: " + deleteError.message }, { status: 500 })
    }

    // Write audit log
    await createAuditLog(
      serviceSupabase,
      user.id,
      "delete_staff",
      id,
      staffMember,
      null
    )

    return NextResponse.json({ success: true, message: "Staff member deleted successfully" })
  } catch (err: any) {
    console.error("Unexpected error in DELETE admin staff API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
