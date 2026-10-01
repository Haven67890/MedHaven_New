import { QueryErrorState, SectionHeader } from "@/components/politeia/section-list"
import { ResourceBrowser } from "@/components/politeia/resource-browser"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function PoliticalDictionaryPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "political_dictionary_entries")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Political Dictionary" description="Search neutral definitions and related concepts in Political Science." />{result.error ? <QueryErrorState /> : <ResourceBrowser rows={result.rows} emptyMessage="No political dictionary are available for your department yet." searchPlaceholder="Search terms and definitions" titleKeys={["term", "title", "name", "term", "topic"]} descriptionKeys={["definition", "description", "explanation", "content", "instructions"]} metaKeys={["source", "type", "source", "level"]} filterKeys={["source"]} />}</>
}
