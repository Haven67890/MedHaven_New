import { QueryErrorState, SectionHeader } from "@/components/politeia/section-list"
import { QuizRunner } from "@/components/politeia/resource-browser"
import { requirePoliteiaContext } from "@/lib/politeia"

export default async function QuizzesPage() {
  const { supabase } = await requirePoliteiaContext()
  const { data, error } = await supabase.from("quizzes").select("id,course_id,topic,format,created_at,questions:quiz_questions(id,question_text,options)").order("created_at", { ascending: false }).limit(40)
  return <><SectionHeader eyebrow="POLITEIA assessment" title="Quizzes" description="Answer department-scoped quizzes and receive a server-calculated result." />{error ? <QueryErrorState /> : data?.length ? <div className="space-y-5">{data.map((quiz) => <QuizRunner key={quiz.id} quiz={quiz as Record<string, unknown>} />)}</div> : <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center text-sm text-slate-400">No quizzes are available for your department yet.</div>}</>
}
