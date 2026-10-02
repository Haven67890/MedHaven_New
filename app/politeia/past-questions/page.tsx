import { QueryErrorState, SectionHeader } from "@/components/politeia/section-list"
import { ResourceBrowser } from "@/components/politeia/resource-browser"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function PastQuestionsPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "question_bank")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Past Questions" description="Browse practice questions by course, topic, and difficulty." />{result.error ? <QueryErrorState /> : <ResourceBrowser rows={result.rows} emptyMessage="No past questions are available for your department yet." searchPlaceholder="Search questions by topic or text" titleKeys={["question_text", "title", "name", "term", "topic"]} descriptionKeys={["description"]} metaKeys={["difficulty", "type", "category", "level"]} filterKeys={["difficulty"]} />}</>
}
