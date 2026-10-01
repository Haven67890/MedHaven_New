import { SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function AssignmentGuidePage() {
  const { supabase } = await requirePoliteiaContext()
  const rows = await getPoliteiaRows(supabase, "assignment_guides")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Assignment Guide" description="Practical guidance for planning and structuring assignments." /><SectionList rows={rows} /></>
}
