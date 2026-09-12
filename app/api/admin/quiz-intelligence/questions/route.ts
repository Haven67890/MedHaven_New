import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "draft"

    const { data: questions, error } = await supabase
      .from("question_bank")
      .select(`
        id,
        course_id,
        topic,
        subtopic,
        format,
        question_text,
        options,
        correct_answer,
        explanation,
        status,
        created_at,
        courses (
          code,
          title
        )
      `)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ questions })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { id, action } = body

    if (!id || !action) {
      return NextResponse.json({ error: "Missing required fields: id, action" }, { status: 400 })
    }

    let newStatus = "active"
    if (action === "approve" || action === "activate") {
      newStatus = "active"
    } else if (action === "reject" || action === "archive") {
      newStatus = "archived"
    } else {
      return NextResponse.json({ error: "Invalid action. Allowed: approve, activate, reject, archive" }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from("question_bank")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, status")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, updated })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}
