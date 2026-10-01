import { QueryErrorState, SectionHeader } from "@/components/politeia/section-list"
import { ResourceBrowser } from "@/components/politeia/resource-browser"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function ResearchPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "research_resources")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Research Hub" description="Discover research resources, guides, and methodology materials." />{result.error ? <QueryErrorState /> : <ResourceBrowser rows={result.rows} emptyMessage="No research hub are available for your department yet." searchPlaceholder="Search research resources" titleKeys={["title", "title", "name", "term", "topic"]} descriptionKeys={["description", "description", "explanation", "content", "instructions"]} metaKeys={["resource_type", "type", "resource_type", "level"]} filterKeys={["resource_type"]} externalUrlKey="external_url" storageKey="storage_path" bucket="research" />}</>
}
