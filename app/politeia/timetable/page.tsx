import { SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function TimetablePage() {
  const { supabase } = await requirePoliteiaContext()
  const rows = await getPoliteiaRows(supabase, "timetable")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Timetable" description="Keep your academic week organized." /><SectionList rows={rows} dateField="date" /></>
}
