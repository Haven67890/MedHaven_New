import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
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
    const { course_id, topic } = body

    if (!course_id || !topic) {
      return NextResponse.json({ error: "Missing required fields: course_id, topic" }, { status: 400 })
    }

    // Fetch existing materials to analyze exam patterns
    const { data: materials } = await supabase
      .from("materials")
      .select("title, description")
      .eq("course_id", course_id)
      .limit(10)

    const materialTitles = (materials || []).map((m: any) => m.title).join(", ")

    // Save or update course_blueprints record
    const { data: existingBlueprint } = await supabase
      .from("course_blueprints")
      .select("id")
      .eq("course_id", course_id)
      .eq("topic", topic)
      .maybeSingle()

    const blueprintData = {
      course_id,
      topic,
      high_yield_concepts: ["Pathophysiology", "Clinical Vignettes", "First-line Pharmacology", "Diagnostic Criteria"],
      topic_weighting: { "Clinical Presentation": 0.4, "Therapeutics": 0.3, "Pathology": 0.3 },
      exam_emphasis: `Finals level exam focus grounded in: ${materialTitles || topic}`,
      question_style_patterns: { "vignette_length": "3-5 sentences", "distractor_style": "highly plausible clinical alternatives" },
      version: 1,
      updated_at: new Date().toISOString()
    }

    if (existingBlueprint) {
      await supabase
        .from("course_blueprints")
        .update(blueprintData)
        .eq("id", existingBlueprint.id)
    } else {
      await supabase
        .from("course_blueprints")
        .insert(blueprintData)
    }

    return NextResponse.json({
      success: true,
      message: `Exam pattern blueprint generated and updated for ${topic}.`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 })
  }
}
