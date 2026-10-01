import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const payload = await request.json().catch(() => null)
  const quizId = typeof payload?.quizId === "string" ? payload.quizId : ""
  const answers = payload?.answers && typeof payload.answers === "object" ? payload.answers : null
  if (!quizId || !answers) return NextResponse.json({ error: "quizId and answers are required" }, { status: 400 })
  const { data, error } = await supabase.rpc("submit_quiz_attempt", { p_quiz_id: quizId, p_answers: answers })
  if (error) return NextResponse.json({ error: error.message }, { status: 403 })
  return NextResponse.json({ attempt: data })
}
