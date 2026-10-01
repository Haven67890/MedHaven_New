import { SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function ResearchPage() {
  const { supabase } = await requirePoliteiaContext()
  const rows = await getPoliteiaRows(supabase, "research_resources")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Research Hub" description="Discover research resources and pathways." /><SectionList rows={rows} /></>
}
