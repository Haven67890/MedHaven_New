import { QueryErrorState, SectionHeader, SectionList } from "@/components/politeia/section-list"
import { requirePoliteiaContext } from "@/lib/politeia"
import { getPoliteiaRows } from "@/lib/politeia-data"

export default async function FlashcardsPage() {
  const { supabase } = await requirePoliteiaContext()
  const result = await getPoliteiaRows(supabase, "flashcards")
  return <><SectionHeader eyebrow="POLITEIA academic workspace" title="Flashcards" description="Review concepts with department-scoped flashcards." />{result.error ? <QueryErrorState /> : <SectionList rows={result.rows} emptyMessage="Flashcards are being prepared for JositeX." />}</>
}
