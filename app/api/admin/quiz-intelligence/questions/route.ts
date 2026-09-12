import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

async function checkAdminAccess(supabase: any, serviceSupabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null }
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
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

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("course_id") || "all"
    const topic = searchParams.get("topic") || "all"
    const format = searchParams.get("format") || "all"
    const status = searchParams.get("status") || "all"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    let queryBuilder = serviceSupabase
      .from("question_bank")
      .select(`
        id,
        course_id,
        topic,
        subtopic,
        format,
        difficulty,
        question_text,
        options,
        correct_answer,
        explanation,
        tf_options,
        sub_questions,
        status,
        created_at,
        updated_at,
        courses (
          id,
          code,
          title
        )
      `, { count: "exact" })

    if (courseId !== "all") {
      queryBuilder = queryBuilder.eq("course_id", courseId)
    }
    if (topic !== "all" && topic.trim() !== "") {
      queryBuilder = queryBuilder.ilike("topic", topic.trim())
    }
    if (format !== "all") {
      queryBuilder = queryBuilder.eq("format", format)
    }
    if (status !== "all") {
      queryBuilder = queryBuilder.eq("status", status)
    }

    queryBuilder = queryBuilder.order("created_at", { ascending: false })

    const from = (page - 1) * limit
    const to = from + limit - 1
    queryBuilder = queryBuilder.range(from, to)

    const { data: questions, count, error } = await queryBuilder

    if (error) {
      console.error("Error fetching question_bank questions:", error)
      return NextResponse.json({ error: "Failed to fetch questions from bank" }, { status: 500 })
    }

    return NextResponse.json({
      questions: questions || [],
      count: count || 0,
    })
  } catch (err: any) {
    console.error("Unexpected error in GET question_bank:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { errorResponse } = await checkAdminAccess(supabase, serviceSupabase)
    if (errorResponse) return errorResponse

    const body = await request.json().catch(() => ({}))
    const { id, status, question_text, options, correct_answer, explanation } = body

    if (!id) {
      return NextResponse.json({ error: "Missing question id" }, { status: 400 })
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (status !== undefined) {
      const validStatuses = ["draft", "validated", "active", "rejected"]
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status state" }, { status: 400 })
      }
      updates.status = status
    }

    if (question_text !== undefined) updates.question_text = String(question_text).trim()
    if (Array.isArray(options)) updates.options = options.map(o => String(o).trim())
    if (correct_answer !== undefined) updates.correct_answer = String(correct_answer).trim()
    if (explanation !== undefined) updates.explanation = String(explanation).trim()

    const { data: updated, error } = await serviceSupabase
      .from("question_bank")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating question in question_bank:", error)
      return NextResponse.json({ error: "Failed to update question: " + error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      question: updated
    })
  } catch (err: any) {
    console.error("Unexpected error in PATCH question_bank:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceClient()
    const { errorResponse } = await checkAdminAccess(supabase, serviceSupabase)
    if (errorResponse) return errorResponse

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing question id" }, { status: 400 })
    }

    const { error } = await serviceSupabase
      .from("question_bank")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting question from question_bank:", error)
      return NextResponse.json({ error: "Failed to delete question: " + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Unexpected error in DELETE question_bank:", err)
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 })
  }
}
