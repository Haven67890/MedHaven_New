export function value(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const candidate = row[key]
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) return String(candidate)
  }
  return null
}

export function formatDate(input: string | null) {
  if (!input) return null
  const date = new Date(input)
  return Number.isNaN(date.valueOf()) ? input : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date)
}
