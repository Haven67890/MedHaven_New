import { BookOpen, Database, SearchX } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, value } from "@/lib/politeia-format"

export function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">{eyebrow}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-slate-400">{description}</p></div>
}

export function EmptyState({ message = "Political Science resources are being prepared for JositeX." }: { message?: string }) {
  return <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center"><Database className="mx-auto size-8 text-indigo-300" /><p className="mt-4 text-sm text-slate-300">{message}</p><p className="mt-2 text-xs text-slate-500">Check back soon as your department adds content.</p></div>
}

export function SectionList({ rows, emptyMessage, dateFields = [] }: { rows: Record<string, unknown>[]; emptyMessage?: string; dateFields?: string[] }) {
  if (!rows.length) return <EmptyState message={emptyMessage} />
  return <div className="grid gap-4 sm:grid-cols-2">{rows.map((row, index) => { const title = value(row, "title", "name", "term", "topic", "question", "question_text", "label") || "Untitled resource"; const description = value(row, "description", "summary", "content", "answer", "details", "explanation"); const dates = dateFields.map((field) => formatDate(value(row, field))).filter(Boolean); return <Card key={String(row.id ?? index)} className="border-white/10 bg-white/[0.04] text-white"><CardHeader><div className="flex items-start justify-between gap-3"><BookOpen className="size-5 text-indigo-300" /><Badge variant="outline" className="border-white/15 text-slate-300">{dates.length ? dates.join(" – ") : "Academic resource"}</Badge></div><CardTitle className="pt-2 text-lg">{title}</CardTitle></CardHeader>{description && <CardContent><p className="line-clamp-4 text-sm leading-6 text-slate-400">{description}</p></CardContent>}</Card> })}</div>
}

export function QueryErrorState() { return <div role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-300/5 p-10 text-center"><SearchX className="mx-auto size-8 text-rose-200" /><p className="mt-4 text-sm text-rose-100">We couldn’t load this POLITEIA section right now.</p><p className="mt-2 text-xs text-rose-200/70">Please try again later.</p></div> }
