import { QueryErrorState, SectionHeader } from "@/components/politeia/section-list"
import { FlashcardDeck } from "@/components/politeia/resource-browser"
import { requirePoliteiaContext } from "@/lib/politeia"

export default async function FlashcardsPage() {
  const { supabase } = await requirePoliteiaContext()
  const { data, error } = await supabase.from("flashcard_decks").select("id,topic,source,created_at,cards:flashcards(id,front,back)").order("created_at", { ascending: false }).limit(30)
  return <><SectionHeader eyebrow="POLITEIA revision" title="Flashcards" description="Flip through department-scoped decks and keep revision focused." />{error ? <QueryErrorState /> : data?.length ? <div className="space-y-6">{data.map((deck) => <section key={deck.id}><h2 className="mb-3 text-lg font-semibold text-white">{deck.topic || "Flashcard deck"}</h2><FlashcardDeck cards={(deck.cards ?? []) as Record<string, unknown>[]} /></section>)}</div> : <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center text-sm text-slate-400">No flashcard decks are available for your department yet.</div>}</>
}
