import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null) as { flashcardId?: string } | null
  if (!body?.flashcardId) return NextResponse.json({ error: "flashcardId is required" }, { status: 400 })

  const { data: current, error: readError } = await supabase
    .from("flashcard_progress")
    .select("repetitions, ease_factor, interval_days")
    .eq("user_id", user.id)
    .eq("flashcard_id", body.flashcardId)
    .maybeSingle()
  if (readError) return NextResponse.json({ error: "Unable to load flashcard progress" }, { status: 500 })

  const repetitions = Number(current?.repetitions ?? 0) + 1
  const intervalDays = Math.max(1, Math.round(Number(current?.interval_days ?? 0) * Number(current?.ease_factor ?? 2.5) || 1))
  const nextReview = new Date(Date.now() + intervalDays * 86400000).toISOString().slice(0, 10)
  const { error } = await supabase.from("flashcard_progress").upsert({
    user_id: user.id,
    flashcard_id: body.flashcardId,
    repetitions,
    ease_factor: Number(current?.ease_factor ?? 2.5),
    interval_days: intervalDays,
    next_review_date: nextReview,
    last_reviewed_at: new Date().toISOString(),
  }, { onConflict: "user_id,flashcard_id" })
  if (error) return NextResponse.json({ error: "Unable to save flashcard progress" }, { status: 500 })
  return NextResponse.json({ repetitions, nextReview })
}
