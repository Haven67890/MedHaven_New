import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, admin_permissions, is_admin")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Forbidden: No profile found" }, { status: 403 })
    }

    const role = String(profile.role || "").toLowerCase()
    const isAdmin = role === "admin" || role === "super_admin" || role === "moderator" || Boolean(profile.is_admin)

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Fetch student count (where role is 'student' or null)
    const { count: studentCount, error: studentError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .or("role.eq.student,role.is.null")

    // Fetch admin/moderator count (role in admin, super_admin, moderator)
    const { count: adminCount, error: adminError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .in("role", ["admin", "super_admin", "moderator"])

    if (studentError || adminError) {
      console.error("Database error fetching overview stats:", { studentError, adminError })
      return NextResponse.json({ error: "Database error fetching stats" }, { status: 500 })
    }

    return NextResponse.json({
      totalStudents: studentCount ?? 0,
      totalAdmins: adminCount ?? 0,
    })
  } catch (err: any) {
    console.error("Unexpected error in admin overview API route:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
