import { QueryErrorState, SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function TimetablePage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "timetable_entries")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Timetable" description="Keep your academic week organized." />{result.error ? <QueryErrorState /> : <SectionList rows={result.rows} emptyMessage="Your POLITEIA timetable is being prepared." />}</>
}
