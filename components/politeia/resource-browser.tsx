"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { BookOpen, ExternalLink, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { constructStorageProxyUrl } from "@/lib/storage-url"

export type ResourceRow = Record<string, unknown>

type ResourceBrowserProps = {
  rows: ResourceRow[]
  emptyMessage: string
  searchPlaceholder?: string
  titleKeys?: string[]
  descriptionKeys?: string[]
  metaKeys?: string[]
  filterKeys?: string[]
  linkKey?: string
  bucket?: string
  storageKey?: string
  externalUrlKey?: string
}

function text(row: ResourceRow, keys: string[]) {
  for (const key of keys) {
    const candidate = row[key]
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) return String(candidate)
  }
  return ""
}

export function ResourceBrowser({ rows, emptyMessage, searchPlaceholder = "Search this section", titleKeys = ["title", "name", "term", "topic"], descriptionKeys = ["description", "summary", "content", "definition", "explanation", "instructions"], metaKeys = ["type", "category", "level", "year", "semester"], filterKeys = [], linkKey, bucket, storageKey, externalUrlKey }: ResourceBrowserProps) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const filterValues = useMemo(() => Array.from(new Set(rows.map((row) => text(row, filterKeys)).filter(Boolean))).sort(), [rows, filterKeys])
  const filteredRows = useMemo(() => rows.filter((row) => {
    const haystack = Object.values(row).filter((value) => typeof value === "string" || typeof value === "number").join(" ").toLowerCase()
    return haystack.includes(query.toLowerCase().trim()) && (filter === "all" || text(row, filterKeys) === filter)
  }), [rows, query, filter, filterKeys])
  if (!rows.length) return <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center"><BookOpen className="mx-auto size-8 text-indigo-300" /><p className="mt-4 text-sm text-slate-300">{emptyMessage}</p></div>
  return <div>
    <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_190px]">
      <div className="relative"><Search className="absolute left-3 top-3 size-4 text-slate-500" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="border-white/10 bg-white/[0.05] pl-9 text-white placeholder:text-slate-500" /></div>
      {filterKeys.length > 0 && <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter resources" className="h-10 rounded-md border border-white/10 bg-slate-900 px-3 text-sm text-white"><option value="all">All categories</option>{filterValues.map((item) => <option key={item} value={item}>{item}</option>)}</select>}
    </div>
    {filteredRows.length ? <div className="grid gap-4 sm:grid-cols-2">{filteredRows.map((row, index) => {
      const title = text(row, titleKeys) || "Academic resource"
      const description = text(row, descriptionKeys)
      const meta = text(row, metaKeys)
      const href = linkKey && row[linkKey] ? String(row[linkKey]) : ""
      const storagePath = storageKey && row[storageKey] ? String(row[storageKey]) : ""
      const externalUrl = externalUrlKey && row[externalUrlKey] ? String(row[externalUrlKey]) : ""
      return <Card key={String(row.id ?? index)} className="border-white/10 bg-white/[0.04] text-white"><CardHeader><div className="flex items-start justify-between gap-3"><BookOpen className="size-5 text-indigo-300" />{meta && <Badge variant="outline" className="border-white/15 text-slate-300">{meta}</Badge>}</div><CardTitle className="pt-2 text-lg">{title}</CardTitle></CardHeader><CardContent>{description && <p className="line-clamp-5 text-sm leading-6 text-slate-400">{description}</p>}<div className="mt-4 flex flex-wrap gap-2">{href && <Button asChild size="sm" variant="outline" className="border-white/15 text-slate-200"><Link href={href}>Open <ExternalLink className="size-3.5" /></Link></Button>}{storagePath && <Button asChild size="sm" className="bg-indigo-300 text-slate-950 hover:bg-indigo-200"><a href={constructStorageProxyUrl(storagePath, bucket)} target="_blank" rel="noreferrer">Open resource <ExternalLink className="size-3.5" /></a></Button>}{externalUrl && <Button asChild size="sm" variant="outline" className="border-white/15 text-slate-200"><a href={externalUrl} target="_blank" rel="noreferrer">Open link <ExternalLink className="size-3.5" /></a></Button>}</div></CardContent></Card>
    })}</div> : <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center text-sm text-slate-400">No resources match your search.</div>}
  </div>
}

export function QuizRunner({ quiz }: { quiz: ResourceRow }) {
  const questions = Array.isArray(quiz.questions) ? quiz.questions as ResourceRow[] : []
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ResourceRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  async function submit() {
    setSubmitting(true)
    try {
      const response = await fetch("/api/politeia/quiz-attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quizId: quiz.id, answers }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Unable to submit quiz")
      setResult(payload.attempt)
    } catch (error) { setResult({ error: error instanceof Error ? error.message : "Unable to submit quiz" }) } finally { setSubmitting(false) }
  }
  return <Card className="border-indigo-300/20 bg-indigo-300/[0.06] text-white"><CardHeader><CardTitle>{text(quiz, ["topic", "title"]) || "Quiz"}</CardTitle><p className="text-sm text-slate-400">{questions.length} question{questions.length === 1 ? "" : "s"}. Your score is calculated securely on the server.</p></CardHeader><CardContent className="space-y-5">{questions.map((question, index) => { const options = Array.isArray(question.options) ? question.options.map(String) : []; return <div key={String(question.id ?? index)} className="rounded-xl border border-white/10 bg-slate-950/30 p-4"><p className="font-medium">{index + 1}. {text(question, ["question_text", "question"])}</p><div className="mt-3 grid gap-2">{options.map((option) => <label key={option} className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 p-3 text-sm text-slate-300 hover:bg-white/5"><input type="radio" name={String(question.id)} value={option} checked={answers[String(question.id)] === option} onChange={() => setAnswers((current) => ({ ...current, [String(question.id)]: option }))} />{option}</label>)}</div></div>})}<Button onClick={submit} disabled={submitting || !questions.length} className="bg-indigo-300 text-slate-950 hover:bg-indigo-200">{submitting ? "Submitting…" : "Submit quiz"}</Button>{result && <div role="status" className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">{"error" in result ? String(result.error) : `Result: ${result.score ?? 0} / ${result.total_questions ?? questions.length}`}</div>}</CardContent></Card>
}

export function FlashcardDeck({ cards }: { cards: ResourceRow[] }) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const card = cards[index]
  if (!card) return null
  return <div className="space-y-4"><Card className="min-h-64 cursor-pointer border-indigo-300/20 bg-indigo-300/[0.06] text-white" onClick={() => setRevealed((value) => !value)}><CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><Badge variant="outline" className="mb-4 border-white/15 text-slate-300">Card {index + 1} of {cards.length}</Badge><p className="text-xl font-semibold">{revealed ? text(card, ["back", "answer"]) : text(card, ["front", "question"])}</p><p className="mt-4 text-xs text-slate-500">Tap to {revealed ? "show the prompt" : "reveal the answer"}</p></CardContent></Card><div className="flex justify-between gap-3"><Button variant="outline" disabled={index === 0} onClick={() => { setIndex((value) => value - 1); setRevealed(false) }} className="border-white/15 text-slate-200">Previous</Button><Button onClick={() => { setIndex((value) => (value + 1) % cards.length); setRevealed(false) }} className="bg-indigo-300 text-slate-950 hover:bg-indigo-200">Next card</Button></div></div>
}
