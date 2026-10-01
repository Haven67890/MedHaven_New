import { QueryErrorState, SectionHeader } from "@/components/politeia/section-list"
import { ResourceBrowser } from "@/components/politeia/resource-browser"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function StaffDirectoryPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "staff")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Staff Directory" description="Find department staff and the contact details legitimately available to students." />{result.error ? <QueryErrorState /> : <ResourceBrowser rows={result.rows} emptyMessage="No staff directory entries are available for your department yet." searchPlaceholder="Search staff and specializations" titleKeys={["full_name", "title"]} descriptionKeys={["specialty", "department"]} metaKeys={["title", "department"]} filterKeys={["department"]} />}</>
}
