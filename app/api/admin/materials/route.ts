import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
        target_type: "material",
        target_id: targetId,
        old_value: typeof oldValue === "object" ? JSON.stringify(oldValue) : String(oldValue ?? ""),
        new_value: typeof newValue === "object" ? JSON.stringify(newValue) : String(newValue ?? ""),
        reason,
      })
    if (error) {
      console.error("Failed to insert admin audit log for material:", error)
    }
  } catch (err) {
    console.error("Unexpected error writing material audit log:", err)
  }
}

// Verify calling admin role
async function checkAdminAccess(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, admin_permissions, is_admin")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return { errorResponse: NextResponse.json({ error: "Forbidden: No profile found" }, { status: 403 }), user: null }
  }

  const callerRole = String(profile.role || "").toLowerCase()
  const isAdmin = callerRole === "admin" || callerRole === "super_admin" || callerRole === "moderator" || Boolean(profile.is_admin)

  if (!isAdmin) {
    return { errorResponse: NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 }), user: null }
  }

  return { errorResponse: null, user }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { errorResponse } = await checkAdminAccess(supabase)
    if (errorResponse) return errorResponse

    // Parse search parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("query") || ""
    const courseId = searchParams.get("course_id") || "all"
    const typeFilter = searchParams.get("type") || "all"
    const tierFilter = searchParams.get("tier") || "all"
    const statusFilter = searchParams.get("status") || "all"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    let queryBuilder = supabase
      .from("materials")
      .select(`
        id,
        course_id,
        title,
        type,
        tier,
        source_url,
        storage_path,
        description,
        status,
        featured,
        uploaded_by,
        created_at,
        courses (
          id,
          code,
          title
        )
      `, { count: "exact" })

    // Apply filters
    if (search.trim()) {
      queryBuilder = queryBuilder.ilike("title", `%${search.trim()}%`)
    }
    if (courseId !== "all") {
      queryBuilder = queryBuilder.eq("course_id", courseId)
    }
    if (typeFilter !== "all") {
      queryBuilder = queryBuilder.eq("type", typeFilter)
    }
    if (tierFilter !== "all") {
      queryBuilder = queryBuilder.eq("tier", tierFilter)
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

    const { data: materials, count, error: fetchError } = await queryBuilder

    if (fetchError) {
      console.error("Error fetching materials list for admin:", fetchError)
      return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 })
    }

    return NextResponse.json({
      materials: materials || [],
      count: count || 0,
    })
  } catch (err: any) {
    console.error("Unexpected error in GET admin materials API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { errorResponse, user } = await checkAdminAccess(supabase)
    if (errorResponse) return errorResponse
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      title,
      description,
      type,
      tier,
      course_id,
      status,
      featured,
      source_url,
      storage_path,
    } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "Bad Request: Title is required" }, { status: 400 })
    }
    if (!type?.trim()) {
      return NextResponse.json({ error: "Bad Request: Type is required" }, { status: 400 })
    }
    if (!tier?.trim()) {
      return NextResponse.json({ error: "Bad Request: Tier is required" }, { status: 400 })
    }
    if (!course_id?.trim()) {
      return NextResponse.json({ error: "Bad Request: Course selection is required" }, { status: 400 })
    }

    const payload = {
      title: title.trim(),
      description: description?.trim() || null,
      type: type.trim(),
      tier: tier.trim(),
      course_id: course_id.trim(),
      status: status || "draft",
      featured: typeof featured === "boolean" ? featured : false,
      source_url: source_url?.trim() || null,
      storage_path: storage_path?.trim() || null,
      uploaded_by: user.id,
    }

    const { data: material, error: insertError } = await supabase
      .from("materials")
      .insert(payload)
      .select()
      .single()

    if (insertError) {
      console.error("Failed to create material:", insertError)
      return NextResponse.json({ error: "Failed to create material: " + insertError.message }, { status: 500 })
    }

    await createAuditLog(
      supabase,
      user.id,
      "create_material",
      material.id,
      null,
      payload
    )

    return NextResponse.json({ success: true, material })
  } catch (err: any) {
    console.error("Unexpected error in POST admin materials API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { errorResponse, user } = await checkAdminAccess(supabase)
    if (errorResponse) return errorResponse
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      id,
      title,
      description,
      type,
      tier,
      course_id,
      status,
      featured,
      source_url,
      storage_path,
    } = body

    if (!id) {
      return NextResponse.json({ error: "Bad Request: Missing material id" }, { status: 400 })
    }

    // Fetch existing material
    const { data: oldMaterial, error: fetchError } = await supabase
      .from("materials")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !oldMaterial) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    if (title !== undefined) updates.title = title.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (type !== undefined) updates.type = type.trim()
    if (tier !== undefined) updates.tier = tier.trim()
    if (course_id !== undefined) updates.course_id = course_id.trim()
    if (status !== undefined) updates.status = status
    if (featured !== undefined) updates.featured = Boolean(featured)
    if (source_url !== undefined) updates.source_url = source_url?.trim() || null
    if (storage_path !== undefined) updates.storage_path = storage_path?.trim() || null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No updates provided" })
    }

    const { error: updateError } = await supabase
      .from("materials")
      .update(updates)
      .eq("id", id)

    if (updateError) {
      console.error("Failed to update material:", updateError)
      return NextResponse.json({ error: "Failed to update material: " + updateError.message }, { status: 500 })
    }

    // Determine what changed for precise audit log actions
    for (const key of Object.keys(updates)) {
      const oldVal = oldMaterial[key]
      const newVal = updates[key]
      if (oldVal !== newVal) {
        await createAuditLog(
          supabase,
          user.id,
          `update_material_${key}`,
          id,
          oldVal,
          newVal
        )
      }
    }

    return NextResponse.json({ success: true, message: "Material updated successfully" })
  } catch (err: any) {
    console.error("Unexpected error in PATCH admin materials API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { errorResponse, user } = await checkAdminAccess(supabase)
    if (errorResponse) return errorResponse
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Bad Request: Missing material id" }, { status: 400 })
    }

    // Fetch material details
    const { data: material, error: fetchError } = await supabase
      .from("materials")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 })
    }

    // Perform database deletion
    const { error: deleteError } = await supabase
      .from("materials")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Failed to delete material:", deleteError)
      return NextResponse.json({ error: "Failed to delete material: " + deleteError.message }, { status: 500 })
    }

    // Check whether other materials share that same file/source_url before deleting the Storage object
    const fileToMaybeDelete = material.storage_path
    if (fileToMaybeDelete) {
      const { data: sharedMaterials, error: sharedError } = await supabase
        .from("materials")
        .select("id")
        .eq("storage_path", fileToMaybeDelete)
        .limit(1)

      if (!sharedError && (!sharedMaterials || sharedMaterials.length === 0)) {
        // Safe to delete from Supabase storage
        const { error: storageDeleteError } = await supabase.storage
          .from("materials")
          .remove([fileToMaybeDelete])
        if (storageDeleteError) {
          console.warn("Could not delete file from Supabase storage:", storageDeleteError)
        }
      }
    }

    // Write audit log
    await createAuditLog(
      supabase,
      user.id,
      "delete_material",
      id,
      material,
      null
    )

    return NextResponse.json({ success: true, message: "Material deleted successfully" })
  } catch (err: any) {
    console.error("Unexpected error in DELETE admin materials API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}