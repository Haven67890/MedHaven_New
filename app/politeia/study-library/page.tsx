import { QueryErrorState, SectionHeader } from "@/components/politeia/section-list"
import { ResourceBrowser } from "@/components/politeia/resource-browser"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function StudyLibraryPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "materials")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Study Library" description="Browse, search, and open permitted private academic materials." />{result.error ? <QueryErrorState /> : <ResourceBrowser rows={result.rows} emptyMessage="No study library are available for your department yet." searchPlaceholder="Search materials by title or description" titleKeys={["title", "title", "name", "term", "topic"]} descriptionKeys={["description", "description", "explanation", "content", "instructions"]} metaKeys={["type", "type", "category", "level"]} filterKeys={["type"]} storageKey="storage_path" bucket="materials" />}</>
}
