import { QueryErrorState, SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function StudyLibraryPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "materials")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Study Library" description="Readings and academic materials for Political Science." />{result.error ? <QueryErrorState /> : <SectionList rows={result.rows} emptyMessage="Political Science resources are being prepared for JositeX." />}</>
}
