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
        target_type: "course",
        target_id: targetId,
        old_value: typeof oldValue === "object" ? JSON.stringify(oldValue) : String(oldValue ?? ""),
        new_value: typeof newValue === "object" ? JSON.stringify(newValue) : String(newValue ?? ""),
        reason,
      })
    if (error) {
      console.error("Failed to insert admin audit log for course:", error)
    }
  } catch (err) {
    console.error("Unexpected error writing course audit log:", err)
  }
}

// Verify calling admin role
async function checkAdminAccess(supabase: any, serviceSupabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    if (authError) {
      console.error("[TEMP ERROR LOG - courses authError]:", authError)
    }
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null }
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select("role, admin_permissions")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    console.error("[TEMP ERROR LOG - courses caller check]:", profileError)
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
    const levelFilter = searchParams.get("level") || "all"
    const facultyFilter = searchParams.get("faculty_id") || "all"
    const codeFilter = searchParams.get("code") || ""
    const pageStr = searchParams.get("page")
    const limitStr = searchParams.get("limit")

    let queryBuilder = serviceSupabase
      .from("courses")
      .select("*, faculties (id, name, universities (id, name, short_name)), parent:courses!parent_id (id, code, title)", { count: "exact" })

    // Apply filters
    if (search.trim()) {
      const cleanSearch = search.trim()
      queryBuilder = queryBuilder.or(`title.ilike.%${cleanSearch}%,code.ilike.%${cleanSearch}%`)
    }
    if (levelFilter !== "all") {
      queryBuilder = queryBuilder.eq("level", levelFilter)
    }
    if (facultyFilter !== "all") {
      queryBuilder = queryBuilder.eq("faculty_id", facultyFilter)
    }
    if (codeFilter.trim()) {
      queryBuilder = queryBuilder.ilike("code", `%${codeFilter.trim()}%`)
    }

    // Sort by code ascending
    queryBuilder = queryBuilder.order("code", { ascending: true })

    // Optional pagination
    if (pageStr && limitStr) {
      const page = parseInt(pageStr, 10)
      const limit = parseInt(limitStr, 10)
      const from = (page - 1) * limit
      const to = from + limit - 1
      queryBuilder = queryBuilder.range(from, to)
    }

    const { data: courses, count, error: fetchError } = await queryBuilder

    if (fetchError) {
      console.error("[TEMP ERROR LOG - courses GET fetch]:", fetchError)
      return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
    }

    return NextResponse.json({
      courses: courses || [],
      count: count || 0,
    })
  } catch (err: any) {
    console.error("Unexpected error in GET admin courses API:", err)
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
      faculty_id,
      level,
      code,
      title,
      description,
      parent_id,
    } = body

    if (!faculty_id) {
      return NextResponse.json({ error: "Bad Request: Faculty selection is required" }, { status: 400 })
    }
    if (!level) {
      return NextResponse.json({ error: "Bad Request: Academic Level is required" }, { status: 400 })
    }
    if (!code?.trim()) {
      return NextResponse.json({ error: "Bad Request: Course Code is required" }, { status: 400 })
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: "Bad Request: Course Title is required" }, { status: 400 })
    }

    // Verify faculty exists
    const { data: faculty, error: facError } = await serviceSupabase
      .from("faculties")
      .select("id")
      .eq("id", faculty_id)
      .maybeSingle()

    if (facError || !faculty) {
      return NextResponse.json({ error: "Bad Request: Selected faculty does not exist" }, { status: 400 })
    }

    // Verify parent course if specified
    if (parent_id) {
      const { data: parentCourse, error: parentError } = await serviceSupabase
        .from("courses")
        .select("id")
        .eq("id", parent_id)
        .maybeSingle()

      if (parentError || !parentCourse) {
        return NextResponse.json({ error: "Bad Request: Selected parent course does not exist" }, { status: 400 })
      }
    }

    const payload = {
      faculty_id,
      level,
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description?.trim() || null,
      parent_id: parent_id || null,
    }

    const { data: course, error: insertError } = await serviceSupabase
      .from("courses")
      .insert(payload)
      .select()
      .single()

    if (insertError) {
      console.error("[TEMP ERROR LOG - courses POST insert]:", insertError)
      return NextResponse.json({ error: "Failed to create course: " + insertError.message }, { status: 500 })
    }

    await createAuditLog(
      serviceSupabase,
      user.id,
      "create_course",
      course.id,
      null,
      payload
    )

    return NextResponse.json({ success: true, course })
  } catch (err: any) {
    console.error("Unexpected error in POST admin courses API:", err)
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
      faculty_id,
      level,
      code,
      title,
      description,
      parent_id,
    } = body

    if (!id) {
      return NextResponse.json({ error: "Bad Request: Missing course id" }, { status: 400 })
    }

    // Prevent self-reference
    if (parent_id && parent_id === id) {
      return NextResponse.json({ error: "Bad Request: A course cannot be its own parent course (self-reference)." }, { status: 400 })
    }

    // Fetch existing course
    const { data: oldCourse, error: fetchError } = await serviceSupabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !oldCourse) {
      console.error("[TEMP ERROR LOG - courses PATCH fetch]:", fetchError)
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    if (faculty_id !== undefined) {
      const { data: faculty, error: facError } = await serviceSupabase
        .from("faculties")
        .select("id")
        .eq("id", faculty_id)
        .maybeSingle()

      if (facError || !faculty) {
        return NextResponse.json({ error: "Bad Request: Selected faculty does not exist" }, { status: 400 })
      }
      updates.faculty_id = faculty_id
    }
    if (level !== undefined) updates.level = level
    if (code !== undefined) updates.code = code.trim().toUpperCase()
    if (title !== undefined) updates.title = title.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (parent_id !== undefined) {
      if (parent_id) {
        const { data: parentCourse, error: parentError } = await serviceSupabase
          .from("courses")
          .select("id")
          .eq("id", parent_id)
          .maybeSingle()

        if (parentError || !parentCourse) {
          return NextResponse.json({ error: "Bad Request: Selected parent course does not exist" }, { status: 400 })
        }
      }
      updates.parent_id = parent_id || null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No updates provided" })
    }

    const { error: updateError } = await serviceSupabase
      .from("courses")
      .update(updates)
      .eq("id", id)

    if (updateError) {
      console.error("[TEMP ERROR LOG - courses PATCH update]:", updateError)
      return NextResponse.json({ error: "Failed to update course: " + updateError.message }, { status: 500 })
    }

    // Write audit logs
    for (const key of Object.keys(updates)) {
      const oldVal = oldCourse[key]
      const newVal = updates[key]

      if (oldVal !== newVal) {
        await createAuditLog(
          serviceSupabase,
          user.id,
          `update_course_${key}`,
          id,
          oldVal,
          newVal
        )
      }
    }

    return NextResponse.json({ success: true, message: "Course updated successfully" })
  } catch (err: any) {
    console.error("Unexpected error in PATCH admin courses API:", err)
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
      return NextResponse.json({ error: "Bad Request: Missing course id" }, { status: 400 })
    }

    // Fetch course details
    const { data: course, error: fetchError } = await serviceSupabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !course) {
      console.error("[TEMP ERROR LOG - courses DELETE fetch]:", fetchError)
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Dependency check A: Check if any materials are linked via course_id
    const { data: materialsLink, error: matCheckError } = await serviceSupabase
      .from("materials")
      .select("id, title")
      .eq("course_id", id)
      .limit(1)

    if (matCheckError) {
      console.error("[TEMP ERROR LOG - courses DELETE materials check]:", matCheckError)
      return NextResponse.json({ error: "Failed dependency check (materials)" }, { status: 500 })
    }
    if (materialsLink && materialsLink.length > 0) {
      return NextResponse.json({
        error: `Cannot delete course: Material "${materialsLink[0].title}" is currently linked to it.`
      }, { status: 400 })
    }

    // Dependency check B: Check if any tutorials are linked via course_id
    const { data: tutorialsLink, error: tutCheckError } = await serviceSupabase
      .from("tutorials")
      .select("id, title")
      .eq("course_id", id)
      .limit(1)

    if (tutCheckError) {
      console.error("[TEMP ERROR LOG - courses DELETE tutorials check]:", tutCheckError)
      return NextResponse.json({ error: "Failed dependency check (tutorials)" }, { status: 500 })
    }
    if (tutorialsLink && tutorialsLink.length > 0) {
      return NextResponse.json({
        error: `Cannot delete course: Tutorial "${tutorialsLink[0].title}" is currently linked to it.`
      }, { status: 400 })
    }

    // Dependency check C: Check if any clinical_guides are linked via course_id
    let isLinkedToGuide = false
    let linkedGuideTitle = ""
    try {
      const { data: guideLink, error: guideCheckError } = await serviceSupabase
        .from("clinical_guides")
        .select("id, title")
        .eq("course_id", id)
        .limit(1)

      if (!guideCheckError && guideLink && guideLink.length > 0) {
        isLinkedToGuide = true
        linkedGuideTitle = guideLink[0].title
      }
    } catch (e) {
      // Column course_id doesn't exist on clinical_guides in current schema; ignore safe check
    }

    if (isLinkedToGuide) {
      return NextResponse.json({
        error: `Cannot delete course: Clinical guide "${linkedGuideTitle}" is currently linked to it.`
      }, { status: 400 })
    }

    // Dependency check D: Check if any other courses refer to this course as parent_id
    const { data: childCourses, error: childCheckError } = await serviceSupabase
      .from("courses")
      .select("id, code, title")
      .eq("parent_id", id)
      .limit(1)

    if (childCheckError) {
      console.error("[TEMP ERROR LOG - courses DELETE child check]:", childCheckError)
      return NextResponse.json({ error: "Failed dependency check (child courses)" }, { status: 500 })
    }
    if (childCourses && childCourses.length > 0) {
      return NextResponse.json({
        error: `Cannot delete course: Sub-topic/course "${childCourses[0].code}: ${childCourses[0].title}" is currently a child of it.`
      }, { status: 400 })
    }

    // Perform database deletion
    const { error: deleteError } = await serviceSupabase
      .from("courses")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[TEMP ERROR LOG - courses DELETE operation]:", deleteError)
      return NextResponse.json({ error: "Failed to delete course: " + deleteError.message }, { status: 500 })
    }

    // Write audit log
    await createAuditLog(
      serviceSupabase,
      user.id,
      "delete_course",
      id,
      course,
      null
    )

    return NextResponse.json({ success: true, message: "Course deleted successfully" })
  } catch (err: any) {
    console.error("Unexpected error in DELETE admin courses API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
