import { QueryErrorState, SectionHeader } from "@/components/politeia/section-list"
import { ResourceBrowser } from "@/components/politeia/resource-browser"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function CareersPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "career_pathways")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Career Pathways" description="Explore informational professional pathways related to Political Science." />{result.error ? <QueryErrorState /> : <ResourceBrowser rows={result.rows} emptyMessage="No career pathways are available for your department yet." searchPlaceholder="Search career pathways" titleKeys={["title", "title", "name", "term", "topic"]} descriptionKeys={["description", "description", "explanation", "content", "instructions"]} metaKeys={["sectors", "type", "category", "level"]} filterKeys={["sectors"]} />}</>
}
