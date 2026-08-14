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
        target_type: "clinical_guide",
        target_id: targetId,
        old_value: typeof oldValue === "object" ? JSON.stringify(oldValue) : String(oldValue ?? ""),
        new_value: typeof newValue === "object" ? JSON.stringify(newValue) : String(newValue ?? ""),
        reason,
      })
    if (error) {
      console.error("Failed to insert admin audit log for clinical guide:", error)
    }
  } catch (err) {
    console.error("Unexpected error writing clinical guide audit log:", err)
  }
}

// Verify calling admin role
async function checkAdminAccess(supabase: any, serviceSupabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    if (authError) {
      console.error("[TEMP ERROR LOG - guides authError]:", authError)
    }
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null }
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select("role, admin_permissions")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    console.error("[TEMP ERROR LOG - guides caller check]:", profileError)
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
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    let queryBuilder = serviceSupabase
      .from("clinical_guides")
      .select("*", { count: "exact" })

    // Apply filters
    if (search.trim()) {
      const cleanSearch = search.trim()
      queryBuilder = queryBuilder.or(`title.ilike.%${cleanSearch}%,specialty.ilike.%${cleanSearch}%`)
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

    const { data: guides, count, error: fetchError } = await queryBuilder

    if (fetchError) {
      console.error("[TEMP ERROR LOG - guides GET fetch]:", fetchError)
      return NextResponse.json({ error: "Failed to fetch clinical guides" }, { status: 500 })
    }

    return NextResponse.json({
      guides: guides || [],
      count: count || 0,
    })
  } catch (err: any) {
    console.error("Unexpected error in GET admin guides API:", err)
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
      specialty,
      level,
      sections,
      status,
    } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "Bad Request: Title is required" }, { status: 400 })
    }
    if (!specialty?.trim()) {
      return NextResponse.json({ error: "Bad Request: Specialty is required" }, { status: 400 })
    }

    const payload = {
      title: title.trim(),
      specialty: specialty.trim(),
      level: level?.trim() || null,
      sections: Array.isArray(sections) ? sections : [],
      status: status || "draft",
    }

    const { data: guide, error: insertError } = await serviceSupabase
      .from("clinical_guides")
      .insert(payload)
      .select()
      .single()

    if (insertError) {
      console.error("[TEMP ERROR LOG - guides POST insert]:", insertError)
      return NextResponse.json({ error: "Failed to create clinical guide: " + insertError.message }, { status: 500 })
    }

    await createAuditLog(
      serviceSupabase,
      user.id,
      "create_clinical_guide",
      guide.id,
      null,
      payload
    )

    return NextResponse.json({ success: true, guide })
  } catch (err: any) {
    console.error("Unexpected error in POST admin guides API:", err)
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
      specialty,
      level,
      sections,
      status,
    } = body

    if (!id) {
      return NextResponse.json({ error: "Bad Request: Missing guide id" }, { status: 400 })
    }

    // Fetch existing guide
    const { data: oldGuide, error: fetchError } = await serviceSupabase
      .from("clinical_guides")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !oldGuide) {
      console.error("[TEMP ERROR LOG - guides PATCH fetch]:", fetchError)
      return NextResponse.json({ error: "Clinical guide not found" }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    if (title !== undefined) updates.title = title.trim()
    if (specialty !== undefined) updates.specialty = specialty.trim()
    if (level !== undefined) updates.level = level?.trim() || null
    if (sections !== undefined) updates.sections = Array.isArray(sections) ? sections : []
    if (status !== undefined) updates.status = status

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No updates provided" })
    }

    const { error: updateError } = await serviceSupabase
      .from("clinical_guides")
      .update(updates)
      .eq("id", id)

    if (updateError) {
      console.error("[TEMP ERROR LOG - guides PATCH update]:", updateError)
      return NextResponse.json({ error: "Failed to update clinical guide: " + updateError.message }, { status: 500 })
    }

    // Determine what changed for precise audit log actions
    for (const key of Object.keys(updates)) {
      const oldVal = oldGuide[key]
      const newVal = updates[key]

      if (key === "sections") {
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          await createAuditLog(
            serviceSupabase,
            user.id,
            `update_clinical_guide_sections`,
            id,
            oldVal,
            newVal
          )
        }
      } else if (oldVal !== newVal) {
        await createAuditLog(
          serviceSupabase,
          user.id,
          `update_clinical_guide_${key}`,
          id,
          oldVal,
          newVal
        )
      }
    }

    return NextResponse.json({ success: true, message: "Clinical guide updated successfully" })
  } catch (err: any) {
    console.error("Unexpected error in PATCH admin guides API:", err)
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
      return NextResponse.json({ error: "Bad Request: Missing guide id" }, { status: 400 })
    }

    // Fetch guide details
    const { data: guide, error: fetchError } = await serviceSupabase
      .from("clinical_guides")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !guide) {
      console.error("[TEMP ERROR LOG - guides DELETE fetch]:", fetchError)
      return NextResponse.json({ error: "Clinical guide not found" }, { status: 404 })
    }

    // Perform database deletion
    const { error: deleteError } = await serviceSupabase
      .from("clinical_guides")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[TEMP ERROR LOG - guides DELETE operation]:", deleteError)
      return NextResponse.json({ error: "Failed to delete clinical guide: " + deleteError.message }, { status: 500 })
    }

    // Write audit log
    await createAuditLog(
      serviceSupabase,
      user.id,
      "delete_clinical_guide",
      id,
      guide,
      null
    )

    return NextResponse.json({ success: true, message: "Clinical guide deleted successfully" })
  } catch (err: any) {
    console.error("Unexpected error in DELETE admin guides API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}