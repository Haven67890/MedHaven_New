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
        target_type: "university",
        target_id: targetId,
        old_value: typeof oldValue === "object" ? JSON.stringify(oldValue) : String(oldValue ?? ""),
        new_value: typeof newValue === "object" ? JSON.stringify(newValue) : String(newValue ?? ""),
        reason,
      })
    if (error) {
      console.error("Failed to insert admin audit log for university:", error)
    }
  } catch (err) {
    console.error("Unexpected error writing university audit log:", err)
  }
}

// Verify calling admin role
async function checkAdminAccess(supabase: any, serviceSupabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    if (authError) {
      console.error("[TEMP ERROR LOG - universities authError]:", authError)
    }
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null }
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select("role, admin_permissions")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    console.error("[TEMP ERROR LOG - universities caller check]:", profileError)
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
    const pageStr = searchParams.get("page")
    const limitStr = searchParams.get("limit")

    let queryBuilder = serviceSupabase
      .from("universities")
      .select("*", { count: "exact" })

    // Apply filters if query provided
    if (search.trim()) {
      const cleanSearch = search.trim()
      queryBuilder = queryBuilder.or(`name.ilike.%${cleanSearch}%,short_name.ilike.%${cleanSearch}%`)
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

    const { data: universities, count, error: fetchError } = await queryBuilder

    if (fetchError) {
      console.error("[TEMP ERROR LOG - universities GET fetch]:", fetchError)
      return NextResponse.json({ error: "Failed to fetch universities" }, { status: 500 })
    }

    return NextResponse.json({
      universities: universities || [],
      count: count || 0,
    })
  } catch (err: any) {
    console.error("Unexpected error in GET admin universities API:", err)
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
    const { name, short_name } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Bad Request: Name is required" }, { status: 400 })
    }
    if (!short_name?.trim()) {
      return NextResponse.json({ error: "Bad Request: Short Name is required" }, { status: 400 })
    }

    const payload = {
      name: name.trim(),
      short_name: short_name.trim().toUpperCase(),
    }

    const { data: university, error: insertError } = await serviceSupabase
      .from("universities")
      .insert(payload)
      .select()
      .single()

    if (insertError) {
      console.error("[TEMP ERROR LOG - universities POST insert]:", insertError)
      return NextResponse.json({ error: "Failed to create university: " + insertError.message }, { status: 500 })
    }

    await createAuditLog(
      serviceSupabase,
      user.id,
      "create_university",
      university.id,
      null,
      payload
    )

    return NextResponse.json({ success: true, university })
  } catch (err: any) {
    console.error("Unexpected error in POST admin universities API:", err)
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
    const { id, name, short_name } = body

    if (!id) {
      return NextResponse.json({ error: "Bad Request: Missing university id" }, { status: 400 })
    }

    // Fetch existing university
    const { data: oldUni, error: fetchError } = await serviceSupabase
      .from("universities")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !oldUni) {
      console.error("[TEMP ERROR LOG - universities PATCH fetch]:", fetchError)
      return NextResponse.json({ error: "University not found" }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    if (name !== undefined) updates.name = name.trim()
    if (short_name !== undefined) updates.short_name = short_name.trim().toUpperCase()

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No updates provided" })
    }

    const { error: updateError } = await serviceSupabase
      .from("universities")
      .update(updates)
      .eq("id", id)

    if (updateError) {
      console.error("[TEMP ERROR LOG - universities PATCH update]:", updateError)
      return NextResponse.json({ error: "Failed to update university: " + updateError.message }, { status: 500 })
    }

    // Write audit logs
    for (const key of Object.keys(updates)) {
      const oldVal = oldUni[key]
      const newVal = updates[key]

      if (oldVal !== newVal) {
        await createAuditLog(
          serviceSupabase,
          user.id,
          `update_university_${key}`,
          id,
          oldVal,
          newVal
        )
      }
    }

    return NextResponse.json({ success: true, message: "University updated successfully" })
  } catch (err: any) {
    console.error("Unexpected error in PATCH admin universities API:", err)
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
      return NextResponse.json({ error: "Bad Request: Missing university id" }, { status: 400 })
    }

    // Fetch university details
    const { data: university, error: fetchError } = await serviceSupabase
      .from("universities")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !university) {
      console.error("[TEMP ERROR LOG - universities DELETE fetch]:", fetchError)
      return NextResponse.json({ error: "University not found" }, { status: 404 })
    }

    // Cascade dependency check: Check if any faculties link to this university
    const { data: linkedFaculties, error: checkError } = await serviceSupabase
      .from("faculties")
      .select("id, name")
      .eq("university_id", id)
      .limit(1)

    if (checkError) {
      console.error("[TEMP ERROR LOG - universities DELETE dependency check]:", checkError)
      return NextResponse.json({ error: "Failed dependency check" }, { status: 500 })
    }

    if (linkedFaculties && linkedFaculties.length > 0) {
      return NextResponse.json({
        error: `Cannot delete university: Faculty "${linkedFaculties[0].name}" is currently associated with it.`
      }, { status: 400 })
    }

    // Perform database deletion
    const { error: deleteError } = await serviceSupabase
      .from("universities")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[TEMP ERROR LOG - universities DELETE operation]:", deleteError)
      return NextResponse.json({ error: "Failed to delete university: " + deleteError.message }, { status: 500 })
    }

    // Write audit log
    await createAuditLog(
      serviceSupabase,
      user.id,
      "delete_university",
      id,
      university,
      null
    )

    return NextResponse.json({ success: true, message: "University deleted successfully" })
  } catch (err: any) {
    console.error("Unexpected error in DELETE admin universities API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
