import { QueryErrorState, SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function StaffDirectoryPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "staff")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Staff Directory" description="Find Political Science staff and academic contacts." />{result.error ? <QueryErrorState /> : <SectionList rows={result.rows} emptyMessage="The Political Science staff directory is being prepared for JositeX." />}</>
}
