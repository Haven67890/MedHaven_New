import { SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function PresentationsPage() {
  const { supabase } = await requirePoliteiaContext()
  const rows = await getPoliteiaRows(supabase, "presentations")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Presentations" description="Academic presentation resources for your department." /><SectionList rows={rows} /></>
}
