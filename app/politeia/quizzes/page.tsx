import { SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function QuizzesPage() {
  const { supabase } = await requirePoliteiaContext()
  const rows = await getPoliteiaRows(supabase, "quiz_bank")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Quizzes" description="Test your understanding with department-scoped quiz resources." /><SectionList rows={rows} /></>
}
