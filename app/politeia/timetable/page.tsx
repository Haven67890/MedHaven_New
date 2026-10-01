import { QueryErrorState, SectionHeader } from "@/components/politeia/section-list"
import { ResourceBrowser } from "@/components/politeia/resource-browser"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function TimetablePage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "timetable_entries")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Timetable" description="Keep your academic week organized by day, course, and lecturer." />{result.error ? <QueryErrorState /> : <ResourceBrowser rows={result.rows} emptyMessage="No timetable are available for your department yet." searchPlaceholder="Search timetable entries" titleKeys={["title", "title", "name", "term", "topic"]} descriptionKeys={["notes", "description", "explanation", "content", "instructions"]} metaKeys={["day_of_week", "type", "category", "level"]} filterKeys={["day_of_week"]} />}</>
}
