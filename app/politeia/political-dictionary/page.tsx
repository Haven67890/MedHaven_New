import { SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function PoliticalDictionaryPage() {
  const { supabase } = await requirePoliteiaContext()
  const rows = await getPoliteiaRows(supabase, "political_dictionary_entries")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Political Dictionary" description="Explore political concepts and terminology." /><SectionList rows={rows} /></>
}
