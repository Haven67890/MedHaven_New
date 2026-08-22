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

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 })
    }

    // 2. Fetch current migration_progress record
    const { data, error } = await serviceSupabase
      .from("migration_progress")
      .select("status, migrated, failed, total, failures")
      .eq("id", "b2_migration")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({
        status: "idle",
        migrated: 0,
        failed: 0,
        total: 0,
        failures: [],
      })
    }

    return NextResponse.json({
      status: data.status || "idle",
      migrated: data.migrated || 0,
      failed: data.failed || 0,
      total: data.total || 0,
      failures: data.failures || [],
    })
  } catch (err: any) {
    console.error("Migration status fetch error:", err)
    return NextResponse.json({ error: err.message || "An error occurred fetching migration status" }, { status: 500 })
  }
}
