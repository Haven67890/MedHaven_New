import { QueryErrorState, SectionHeader } from "@/components/politeia/section-list"
import { ResourceBrowser } from "@/components/politeia/resource-browser"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function AssignmentGuidePage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "assignment_guides")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Assignment Guide" description="Practical guidance for planning and structuring assignments." />{result.error ? <QueryErrorState /> : <ResourceBrowser rows={result.rows} emptyMessage="No assignment guide are available for your department yet." searchPlaceholder="Search assignments by topic or course" titleKeys={["title", "title", "name", "term", "topic"]} descriptionKeys={["description", "description", "explanation", "content", "content"]} metaKeys={["course_id", "type", "category", "level"]} filterKeys={["course_id"]} />}</>
}
