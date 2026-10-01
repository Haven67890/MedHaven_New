import { QueryErrorState, SectionHeader } from "@/components/politeia/section-list"
import { ResourceBrowser } from "@/components/politeia/resource-browser"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function CalendarPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "academic_calendar_events")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Academic Calendar" description="Important department and academic dates, with upcoming events easy to scan." />{result.error ? <QueryErrorState /> : <ResourceBrowser rows={result.rows} emptyMessage="No academic calendar are available for your department yet." searchPlaceholder="Search academic events" titleKeys={["title", "title", "name", "term", "topic"]} descriptionKeys={["description", "description", "explanation", "content", "instructions"]} metaKeys={["event_type", "type", "category", "level"]} filterKeys={["event_type"]} />}</>
}
