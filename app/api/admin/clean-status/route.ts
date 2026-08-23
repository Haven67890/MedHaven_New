import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()

    // 1. Check admin authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const allowedRoles = ["admin", "super_admin", "SUPER_ADMIN"]
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 })
    }

    // 2. Fetch current cleanup progress record from migration_progress
    const { data, error } = await serviceSupabase
      .from("migration_progress")
      .select("status, migrated, failed, total, failures")
      .eq("id", "cleanup")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({
        status: "idle",
        deleted: 0,
        skipped: 0,
        failed: 0,
        total: 0,
      })
    }

    const failuresObj = typeof data.failures === "object" && data.failures !== null ? (data.failures as any) : {}

    return NextResponse.json({
      status: data.status || "idle",
      deleted: data.migrated || 0,
      skipped: failuresObj.skipped || 0,
      failed: data.failed || 0,
      total: data.total || 0,
    })
  } catch (err: any) {
    console.error("Cleanup status fetch error:", err)
    return NextResponse.json({ error: err.message || "An error occurred fetching cleanup status" }, { status: 500 })
  }
}
