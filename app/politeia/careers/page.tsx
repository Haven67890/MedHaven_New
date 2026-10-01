import { SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function CareersPage() {
  const { supabase } = await requirePoliteiaContext()
  const rows = await getPoliteiaRows(supabase, "career_pathways")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Career Pathways" description="Explore professional pathways related to Political Science." /><SectionList rows={rows} /></>
}
