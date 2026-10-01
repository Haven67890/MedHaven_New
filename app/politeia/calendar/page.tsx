import { SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function CalendarPage() {
  const { supabase } = await requirePoliteiaContext()
  const rows = await getPoliteiaRows(supabase, "academic_calendar_events")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Academic Calendar" description="Important department and academic dates." /><SectionList rows={rows} dateField="date" /></>
}
