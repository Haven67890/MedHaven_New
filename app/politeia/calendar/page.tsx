import { QueryErrorState, SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function CalendarPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "academic_calendar_events")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Academic Calendar" description="Important department and academic dates." />{result.error ? <QueryErrorState /> : <SectionList rows={result.rows} emptyMessage="Political Science academic dates are being prepared for JositeX." dateFields={["starts_at", "ends_at"]} />}</>
}
