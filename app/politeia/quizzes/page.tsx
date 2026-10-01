import { QueryErrorState, SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function QuizzesPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "quizzes")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Quizzes" description="Test your understanding with department-scoped quiz resources." />{result.error ? <QueryErrorState /> : <SectionList rows={result.rows} emptyMessage="Quiz resources are being prepared for JositeX." />}</>
}
