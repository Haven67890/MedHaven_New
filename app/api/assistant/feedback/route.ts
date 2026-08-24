import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { conversation_id, message_index, rating } = body

    if (!rating || ![1, -1].includes(Number(rating))) {
      return NextResponse.json({ error: "Invalid rating value. Must be 1 or -1." }, { status: 400 })
    }

    const supabaseAdmin = createServiceClient()

    const { error: insertError } = await supabaseAdmin
      .from("ai_feedback")
      .insert({
        user_id: user.id,
        conversation_id: conversation_id || null,
        message_index: typeof message_index === "number" ? message_index : null,
        rating: Number(rating)
      })

    if (insertError) {
      console.error("Failed to insert AI feedback:", insertError)
      return NextResponse.json({ error: "Failed to record feedback" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Error in AI feedback route:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
