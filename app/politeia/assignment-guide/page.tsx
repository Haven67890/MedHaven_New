import { QueryErrorState, SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function AssignmentGuidePage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "assignment_guides")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Assignment Guide" description="Practical guidance for planning and structuring assignments." />{result.error ? <QueryErrorState /> : <SectionList rows={result.rows} emptyMessage="Political Science assignment guidance is being prepared for JositeX." />}</>
}
