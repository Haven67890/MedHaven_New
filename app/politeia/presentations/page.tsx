import { QueryErrorState, SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function PresentationsPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "presentations")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Presentations" description="Academic presentation resources for your department." />{result.error ? <QueryErrorState /> : <SectionList rows={result.rows} emptyMessage="Political Science presentations are being prepared for JositeX." />}</>
}
