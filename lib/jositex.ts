import type { SupabaseClient } from "@supabase/supabase-js"

export type EcosystemApp = {
  id: string
  slug: string
  name: string
  departmentId: string | number | null
  departmentName: string | null
  description: string | null
  isActive: boolean
  logoUrl: string | null
  accentColor: string | null
}

export type EcosystemFeature = {
  id: string
  name: string
  slug: string
  description: string | null
  href: string | null
  icon: string | null
  sortOrder: number
}

export type UserEcosystemContext = {
  departmentId: string | number
  departmentName: string | null
  app: EcosystemApp
}

type Row = Record<string, unknown>

function text(row: Row, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function bool(row: Row, ...keys: string[]): boolean {
  for (const key of keys) {
    if (typeof row[key] === "boolean") return row[key] as boolean
  }
  return true
}

function appFromRow(row: Row): EcosystemApp {
  const status = text(row, "status")
  return {
    id: String(row.id ?? row.slug ?? ""),
    slug: text(row, "slug", "app_slug") ?? "",
    name: text(row, "name", "display_name", "title") ?? "Academic environment",
    departmentId: (row.department_id ?? row.departmentId ?? null) as string | number | null,
    departmentName: text(row, "department_name", "department"),
    description: text(row, "description", "tagline"),
    isActive: status ? status === "active" : bool(row, "is_active", "active", "enabled"),
    logoUrl: text(row, "logo_url", "logo"),
    accentColor: text(row, "accent_color", "color"),
  }
}

export async function getAvailableEcosystemApps(supabase: SupabaseClient): Promise<EcosystemApp[]> {
  const { data, error } = await supabase
    .from("ecosystem_apps")
    .select("*")
    .eq("status", "active")
    .order("name", { ascending: true })

  if (error) {
    console.warn("Unable to load ecosystem applications:", error.message)
    return []
  }

  return ((data ?? []) as Row[]).map(appFromRow).filter((app) => app.isActive && app.slug)
}

export async function getUserEcosystemContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserEcosystemContext | null> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("department_id")
    .eq("id", userId)
    .maybeSingle()

  if (profileError || !profile?.department_id) return null

  const departmentId = profile.department_id as string | number
  const [{ data: department }, { data: appRows, error: appError }] = await Promise.all([
    supabase.from("departments").select("id, name").eq("id", departmentId).maybeSingle(),
    supabase.from("ecosystem_apps").select("*").eq("department_id", departmentId).eq("status", "active").limit(1),
  ])

  if (appError || !appRows?.[0]) return null

  const app = appFromRow(appRows[0] as Row)
  if (!app.isActive || !app.slug) return null

  return {
    departmentId,
    departmentName: text((department ?? {}) as Row, "name"),
    app,
  }
}

export async function getEcosystemFeatures(
  supabase: SupabaseClient,
  appId: string,
): Promise<EcosystemFeature[]> {
  const { data, error } = await supabase
    .from("app_features")
    .select("id, key, name, route, enabled, sort_order, description, icon")
    .eq("app_id", appId)
    .order("sort_order", { ascending: true })

  if (error) {
    console.warn("Unable to load application features:", error.message)
    return []
  }

  return ((data ?? []) as Row[]).filter((row) => bool(row, "enabled")).map((row) => ({
    id: String(row.id ?? row.key ?? row.name ?? "feature"),
    name: text(row, "name") ?? "Feature",
    slug: text(row, "key") ?? String(row.id ?? "feature"),
    description: text(row, "description"),
    href: text(row, "route"),
    icon: text(row, "icon"),
    sortOrder: Number(row.sort_order ?? 0),
  }))
}

export function appHomePath(slug: string | null | undefined): string {
  if (slug === "politeia") return "/politeia"
  if (slug === "medhaven") return "/medhaven"
  return "/"
}
