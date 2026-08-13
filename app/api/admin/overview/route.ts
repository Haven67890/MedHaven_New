import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      if (authError) {
        console.error("[TEMP ERROR LOG - overview authError]:", authError)
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const serviceSupabase = createServiceClient()

    // Verify caller role using serviceSupabase
    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("role, admin_permissions")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error("[TEMP ERROR LOG - overview caller check]:", profileError)
      return NextResponse.json({ error: "Forbidden: No profile found" }, { status: 403 })
    }

    const role = String(profile.role || "").trim().toLowerCase()
    const isAdmin = role === "admin" || role === "super_admin" || role === "moderator"

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Fetch student count (where role is 'student' or null)
    const { count: studentCount, error: studentError } = await serviceSupabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .or("role.eq.student,role.is.null")

    // Fetch admin/moderator count (role in admin, super_admin, moderator)
    const { count: adminCount, error: adminError } = await serviceSupabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .in("role", ["admin", "super_admin", "moderator"])

    if (studentError || adminError) {
      console.error("[TEMP ERROR LOG - overview fetch stats]:", { studentError, adminError })
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