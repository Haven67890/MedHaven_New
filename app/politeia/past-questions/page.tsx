import { QueryErrorState, SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function PastQuestionsPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "question_bank")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Past Questions" description="Practice with previous department examinations." />{result.error ? <QueryErrorState /> : <SectionList rows={result.rows} emptyMessage="Past questions are being prepared for JositeX." />}</>
}
