import { QueryErrorState, SectionHeader } from "@/components/politeia/section-list"
import { ResourceBrowser } from "@/components/politeia/resource-browser"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function PresentationsPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "presentations")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Presentations" description="Browse secure presentation resources associated with your courses." />{result.error ? <QueryErrorState /> : <ResourceBrowser rows={result.rows} emptyMessage="No presentations are available for your department yet." searchPlaceholder="Search presentations" titleKeys={["title", "title", "name", "term", "topic"]} descriptionKeys={["description", "description", "explanation", "content", "instructions"]} metaKeys={["presenter", "type", "category", "level"]} filterKeys={["presenter"]} externalUrlKey="external_url" storageKey="storage_path" bucket="presentations" />}</>
}
