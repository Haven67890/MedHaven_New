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
        target_type: "user",
        target_id: targetId,
        old_value: typeof oldValue === "object" ? JSON.stringify(oldValue) : String(oldValue ?? ""),
        new_value: typeof newValue === "object" ? JSON.stringify(newValue) : String(newValue ?? ""),
        reason,
      })
    if (error) {
      console.error("Failed to insert admin audit log:", error)
    }
  } catch (err) {
    console.error("Unexpected error writing audit log:", err)
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify caller role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, admin_permissions")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Forbidden: No profile found" }, { status: 403 })
    }

    const callerRole = String(profile.role || "").trim().toLowerCase()
    const isAdmin = callerRole === "admin" || callerRole === "super_admin" || callerRole === "moderator"

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Parse search parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("query") || ""
    const roleFilter = searchParams.get("role") || "all"
    const levelFilter = searchParams.get("level") || "all"
    const deptFilter = searchParams.get("department") || "all"
    const uniFilter = searchParams.get("university_id") || "all"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    const fields = [
      "id",
      "full_name",
      "email",
      "avatar_url",
      "role",
      "current_level",
      "department",
      "university_id",
      "faculty_id",
      "account_status",
      "suspended_reason",
      "suspended_until",
      "admin_permissions",
    ]

    let queryBuilder = supabase
      .from("profiles")
      .select(fields.join(", "), { count: "exact" })

    // Apply filters
    if (search.trim()) {
      const cleanSearch = search.trim()
      queryBuilder = queryBuilder.or(`full_name.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`)
    }

    if (roleFilter !== "all") {
      queryBuilder = queryBuilder.eq("role", roleFilter)
    }
    if (levelFilter !== "all") {
      queryBuilder = queryBuilder.eq("current_level", levelFilter)
    }
    if (deptFilter !== "all") {
      queryBuilder = queryBuilder.eq("department", deptFilter)
    }
    if (uniFilter !== "all") {
      queryBuilder = queryBuilder.eq("university_id", uniFilter)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    queryBuilder = queryBuilder.range(from, to)

    const { data: users, count, error: fetchError } = await queryBuilder

    if (fetchError) {
      console.error("Error fetching users list:", fetchError)
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    return NextResponse.json({
      users: users || [],
      count: count || 0,
    })
  } catch (err: any) {
    console.error("Unexpected error in GET admin users API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify caller role and permissions
    const { data: callerProfile, error: callerError } = await supabase
      .from("profiles")
      .select("role, admin_permissions")
      .eq("id", user.id)
      .maybeSingle()

    if (callerError || !callerProfile) {
      return NextResponse.json({ error: "Forbidden: No profile found" }, { status: 403 })
    }

    const callerRole = String(callerProfile.role || "").trim().toLowerCase()
    const isAdmin = callerRole === "admin" || callerRole === "super_admin" || callerRole === "moderator"

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Check if caller is admin/moderator, they must have "users": true in admin_permissions
    const permissions = callerProfile.admin_permissions as Record<string, boolean> | null
    const hasUsersPermission = callerRole === "super_admin" || (permissions && permissions.users === true)

    if (!hasUsersPermission) {
      return NextResponse.json({ error: "Forbidden: Missing user management permission" }, { status: 403 })
    }

    // Parse body updates
    const body = await request.json().catch(() => ({}))
    const {
      userId,
      full_name,
      department,
      current_level,
      university_id,
      faculty_id,
      role,
      account_status,
      suspended_reason,
      suspended_until,
      admin_permissions,
    } = body

    if (!userId) {
      return NextResponse.json({ error: "Bad Request: Missing userId" }, { status: 400 })
    }

    // Fetch target user's current profile to check permissions and compare for audit logs
    const { data: targetProfile, error: targetError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: "Target user profile not found" }, { status: 404 })
    }

    // 1. Only super_admin can change a user's role
    if (role !== undefined && role !== targetProfile.role) {
      if (callerRole !== "super_admin") {
        return NextResponse.json({ error: "Forbidden: Only super_admin can change a user's role" }, { status: 403 })
      }
    }

    // 2. Only super_admin can set/edit another admin's admin_permissions
    if (admin_permissions !== undefined && JSON.stringify(admin_permissions) !== JSON.stringify(targetProfile.admin_permissions)) {
      if (callerRole !== "super_admin") {
        return NextResponse.json({ error: "Forbidden: Only super_admin can set/edit admin permissions" }, { status: 403 })
      }
    }

    // Prepare update object
    const updates: Record<string, any> = {}

    if (full_name !== undefined) updates.full_name = full_name
    if (department !== undefined) updates.department = department
    if (current_level !== undefined) updates.current_level = current_level
    if (university_id !== undefined) updates.university_id = university_id || null
    if (faculty_id !== undefined) updates.faculty_id = faculty_id || null

    if (callerRole === "super_admin") {
      if (role !== undefined) updates.role = role
      if (admin_permissions !== undefined) updates.admin_permissions = admin_permissions
    }

    const finalStatus = account_status !== undefined ? account_status : targetProfile.account_status

    if (account_status !== undefined && account_status !== targetProfile.account_status) {
      updates.account_status = account_status
    }

    if (finalStatus === "suspended" || finalStatus === "banned") {
      if (suspended_reason !== undefined) {
        if (!suspended_reason) {
          return NextResponse.json({ error: "Bad Request: Reason is required for suspension or ban" }, { status: 400 })
        }
        updates.suspended_reason = suspended_reason
      }
      if (suspended_until !== undefined) {
        updates.suspended_until = suspended_until || null
      }
    } else if (account_status === "active" || (finalStatus === "active" && targetProfile.account_status !== "active")) {
      updates.suspended_reason = null
      updates.suspended_until = null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No updates performed" })
    }

    // Perform updates
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)

    if (updateError) {
      console.error("Error updating user profile:", updateError)
      return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 })
    }

    // Write audit logs for changes
    if (full_name !== undefined && full_name !== targetProfile.full_name) {
      await createAuditLog(supabase, user.id, "update_profile_name", userId, targetProfile.full_name, full_name)
    }
    if (department !== undefined && department !== targetProfile.department) {
      await createAuditLog(supabase, user.id, "update_profile_department", userId, targetProfile.department, department)
    }
    if (current_level !== undefined && current_level !== targetProfile.current_level) {
      await createAuditLog(supabase, user.id, "update_profile_level", userId, targetProfile.current_level, current_level)
    }
    if (university_id !== undefined && university_id !== targetProfile.university_id) {
      await createAuditLog(supabase, user.id, "update_profile_university", userId, targetProfile.university_id, university_id)
    }
    if (faculty_id !== undefined && faculty_id !== targetProfile.faculty_id) {
      await createAuditLog(supabase, user.id, "update_profile_faculty", userId, targetProfile.faculty_id, faculty_id)
    }
    if (role !== undefined && role !== targetProfile.role && callerRole === "super_admin") {
      await createAuditLog(supabase, user.id, "update_role", userId, targetProfile.role, role)
    }
    if (admin_permissions !== undefined && JSON.stringify(admin_permissions) !== JSON.stringify(targetProfile.admin_permissions) && callerRole === "super_admin") {
      await createAuditLog(supabase, user.id, "update_permissions", userId, targetProfile.admin_permissions, admin_permissions)
    }
    if (account_status !== undefined && account_status !== targetProfile.account_status) {
      const actionName = account_status === "suspended" ? "suspend_user" : account_status === "banned" ? "ban_user" : "reactivate_user"
      await createAuditLog(supabase, user.id, actionName, userId, targetProfile.account_status, account_status, suspended_reason || "Reactivated")
    } else if ((finalStatus === "suspended" || finalStatus === "banned") && (suspended_reason !== undefined || suspended_until !== undefined)) {
      // Log edit of existing suspension/ban reason/date
      await createAuditLog(supabase, user.id, "update_lockout_details", userId, {
        reason: targetProfile.suspended_reason,
        until: targetProfile.suspended_until
      }, {
        reason: suspended_reason !== undefined ? suspended_reason : targetProfile.suspended_reason,
        until: suspended_until !== undefined ? suspended_until : targetProfile.suspended_until
      }, suspended_reason || "Details updated")
    }

    return NextResponse.json({ success: true, message: "User updated successfully" })
  } catch (err: any) {
    console.error("Unexpected error in PATCH admin users API:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
