import { SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function StaffDirectoryPage() {
  const { supabase } = await requirePoliteiaContext()
  const rows = await getPoliteiaRows(supabase, "staff")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Staff Directory" description="Find Political Science staff and academic contacts." /><SectionList rows={rows} /></>
}
