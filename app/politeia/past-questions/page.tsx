import { SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function PastQuestionsPage() {
  const { supabase } = await requirePoliteiaContext()
  const rows = await getPoliteiaRows(supabase, "past_questions")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Past Questions" description="Practice with previous department examinations." /><SectionList rows={rows} /></>
}
