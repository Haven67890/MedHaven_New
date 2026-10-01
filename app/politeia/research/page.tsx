import { QueryErrorState, SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function ResearchPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "research_resources")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Research Hub" description="Discover research resources and pathways." />{result.error ? <QueryErrorState /> : <SectionList rows={result.rows} emptyMessage="Political Science research resources are being prepared for JositeX." />}</>
}
