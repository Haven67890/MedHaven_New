import type { SupabaseClient } from "@supabase/supabase-js"

export type EcosystemApp = {
  id: string
  slug: string
  name: string
  universityId: string | null
  departmentId: string | number | null
  departmentName: string | null
  description: string | null
  isActive: boolean
  logoUrl: string | null
  accentColor: string | null
  workspaceType: "specialized" | "universal"
  workspaceStatus: "available" | "planned" | "disabled"
}

export type AcademicWorkspace = {
  href: string
  slug: string
  type: "specialized" | "universal"
  status: "available" | "planned" | "disabled"
  appName: string
}

export type AcademicDirectoryProgramme = {
  id: string
  name: string
  slug: string
  award: string | null
  durationYears: number | null
  firstLevel: string | null
  finalLevel: string | null
  admissionStatus: string
  departmentName: string | null
  workspace: AcademicWorkspace
}

export type AcademicDirectoryFaculty = {
  id: string
  name: string
  college: { id: string; name: string } | null
  programmes: AcademicDirectoryProgramme[]
}

export type AcademicDirectory = {
  universityId: string
  universityName: string
  faculties: AcademicDirectoryFaculty[]
}

export type EcosystemFeature = {
  id: string
  name: string
  slug: string
  description: string | null
  href: string | null
  icon: string | null
  sortOrder: number
  category: "CORE" | "DEPARTMENT_SPECIFIC"
}

export type UserEcosystemContext = {
  departmentId: string | number | null
  departmentName: string | null
  programmeId: string | null
  programmeName: string | null
  programmeSlug: string | null
  facultyId: string | null
  facultyName: string | null
  collegeName: string | null
  universityId: string | null
  universityName: string | null
  app: EcosystemApp
  workspace: AcademicWorkspace
}

type Row = Record<string, unknown>
function text(row: Row, ...keys: string[]): string | null { for (const key of keys) { const value = row[key]; if (typeof value === "string" && value.trim()) return value.trim() } return null }
function bool(row: Row, ...keys: string[]): boolean { for (const key of keys) if (typeof row[key] === "boolean") return row[key] as boolean; return true }
function workspaceFor(programme: Pick<AcademicDirectoryProgramme, "slug">, app?: Row | null): AcademicWorkspace {
  const appSlug = text(app ?? {}, "slug")
  const type = appSlug && ["medhaven", "politeia"].includes(appSlug) ? "specialized" : "universal"
  return { href: type === "specialized" ? (appSlug === "medhaven" ? "/medhaven" : "/politeia") : `/workspace/${programme.slug}`, slug: appSlug ?? programme.slug, type, status: (text(app ?? {}, "workspace_status") as AcademicWorkspace["status"]) || "available", appName: text(app ?? {}, "name") ?? "JositeX academic workspace" }
}
function appFromRow(row: Row): EcosystemApp {
  const status = text(row, "status")
  return { id: String(row.id ?? row.slug ?? ""), slug: text(row, "slug", "app_slug") ?? "", name: text(row, "name", "display_name", "title") ?? "Academic environment", universityId: text(row, "university_id"), departmentId: (row.department_id ?? row.departmentId ?? null) as string | number | null, departmentName: text(row, "department_name", "department"), description: text(row, "description", "tagline"), isActive: status ? status === "active" : bool(row, "is_active", "active", "enabled"), logoUrl: text(row, "logo_url", "logo"), accentColor: text(row, "accent_color", "color"), workspaceType: text(row, "workspace_type") === "specialized" ? "specialized" : "universal", workspaceStatus: (text(row, "workspace_status") as EcosystemApp["workspaceStatus"]) || "available" }
}
const APP_FIELDS = "id, university_id, department_id, name, slug, description, logo_url, route_prefix, status, workspace_type, workspace_status, undergraduate_programme_id"

export async function getAcademicDirectory(supabase: SupabaseClient): Promise<AcademicDirectory | null> {
  const { data: university, error: universityError } = await supabase.from("universities").select("id, name").order("name").limit(1).maybeSingle()
  if (universityError || !university) return null
  const [{ data: faculties, error: facultyError }, { data: colleges, error: collegeError }, { data: programmes, error: programmeError }, { data: apps, error: appError }] = await Promise.all([
    supabase.from("faculties").select("id, name, university_id").eq("university_id", university.id).order("name"),
    supabase.from("academic_colleges").select("id, name, university_id").eq("university_id", university.id).order("name"),
    supabase.from("undergraduate_programmes").select("id, name, slug, award, duration_years, first_level, final_level, admission_status, faculty_id, institutional_department_id").eq("university_id", university.id).eq("is_active", true).order("name"),
    supabase.from("ecosystem_apps").select(`${APP_FIELDS}, department:departments(name)`).eq("university_id", university.id).eq("status", "active"),
  ])
  if (facultyError || collegeError || programmeError || appError) return null
  const appByProgramme = new Map<string, Row>()
  for (const row of (apps ?? []) as Row[]) { const id = text(row, "undergraduate_programme_id"); if (id) appByProgramme.set(id, row) }
  const appByDepartment = new Map<string, Row>()
  for (const row of (apps ?? []) as Row[]) { const id = text(row, "department_id"); if (id && !appByDepartment.has(id)) appByDepartment.set(id, row) }
  const collegeRows = (colleges ?? []) as Row[]
  const facultyRows = (faculties ?? []) as Row[]
  const programmesByFaculty = new Map<string, AcademicDirectoryProgramme[]>()
  for (const row of (programmes ?? []) as Row[]) {
    const id = text(row, "id"); const facultyId = text(row, "faculty_id"); const programmeSlug = text(row, "slug"); const name = text(row, "name")
    if (!id || !facultyId || !programmeSlug || !name) continue
    const departmentId = text(row, "institutional_department_id")
    const app = appByProgramme.get(id) ?? (departmentId ? appByDepartment.get(departmentId) : null)
    const department = (apps ?? []).find((item) => text(item as Row, "department_id") === departmentId) as Row | undefined
    const programme: AcademicDirectoryProgramme = { id, name, slug: programmeSlug, award: text(row, "award"), durationYears: typeof row.duration_years === "number" ? row.duration_years : null, firstLevel: text(row, "first_level"), finalLevel: text(row, "final_level"), admissionStatus: text(row, "admission_status") ?? "catalogue_only", departmentName: text(department ?? {}, "department_name") ?? text((department?.department as Row | undefined) ?? {}, "name"), workspace: workspaceFor({ slug: programmeSlug }, app) }
    programmesByFaculty.set(facultyId, [...(programmesByFaculty.get(facultyId) ?? []), programme])
  }
  return { universityId: String(university.id), universityName: String(university.name ?? "University of Jos"), faculties: facultyRows.flatMap((faculty) => { const id = text(faculty, "id"); const name = text(faculty, "name"); if (!id || !name) return []; const college = collegeRows.find((item) => false) // College membership is encoded on programmes; faculty-level display is derived below.
      const programmesForFaculty = programmesByFaculty.get(id) ?? []
      const collegeProgramme = (programmes ?? []).find((item) => text(item as Row, "faculty_id") === id && text(item as Row, "college_id")) as Row | undefined
      const collegeId = text(collegeProgramme ?? {}, "college_id")
      const collegeRow = collegeRows.find((item) => text(item, "id") === collegeId)
      return [{ id, name, college: collegeRow ? { id: String(collegeRow.id), name: String(collegeRow.name) } : null, programmes: programmesForFaculty }]
    }) }
}

export async function getAvailableEcosystemApps(supabase: SupabaseClient): Promise<EcosystemApp[]> { const { data, error } = await supabase.from("ecosystem_apps").select(APP_FIELDS).eq("status", "active").order("name"); if (error) return []; return ((data ?? []) as Row[]).map(appFromRow).filter((app) => app.isActive && app.slug) }

export async function getUserEcosystemContext(supabase: SupabaseClient, userId: string): Promise<UserEcosystemContext | null> {
  const { data: profile, error } = await supabase.from("profiles").select("department_id, undergraduate_programme_id, faculty_id, university_id").eq("id", userId).maybeSingle()
  if (error || !profile) return null
  let programmeQuery = supabase.from("undergraduate_programmes").select("id, name, slug, faculty_id, college_id, institutional_department_id").eq("id", profile.undergraduate_programme_id ?? "00000000-0000-0000-0000-000000000000").limit(1)
  if (!profile.undergraduate_programme_id && profile.department_id) programmeQuery = supabase.from("undergraduate_programmes").select("id, name, slug, faculty_id, college_id, institutional_department_id").eq("institutional_department_id", profile.department_id).limit(1)
  const [{ data: programmes, error: programmeError }, { data: apps, error: appError }] = await Promise.all([programmeQuery, supabase.from("ecosystem_apps").select(`${APP_FIELDS}, department:departments(name)`).eq("status", "active").or(`department_id.eq.${profile.department_id ?? "00000000-0000-0000-0000-000000000000"},undergraduate_programme_id.eq.${profile.undergraduate_programme_id ?? "00000000-0000-0000-0000-000000000000"}`).limit(5)])
  const programme = (programmes?.[0] ?? null) as Row | null; const appRow = ((apps ?? []) as Row[]).find((row) => text(row, "undergraduate_programme_id") === text(programme ?? {}, "id")) ?? ((apps ?? [])[0] as Row | undefined) ?? null
  if (programmeError || appError || !programme || !appRow) return null
  const universityId = text(profile as Row, "university_id"); const facultyId = text(programme, "faculty_id"); const collegeId = text(programme, "college_id")
  const [{ data: faculty }, { data: university }, { data: college }] = await Promise.all([supabase.from("faculties").select("name").eq("id", facultyId).limit(1).maybeSingle(), supabase.from("universities").select("name").eq("id", universityId).limit(1).maybeSingle(), collegeId ? supabase.from("academic_colleges").select("name").eq("id", collegeId).limit(1).maybeSingle() : Promise.resolve({ data: null })])
  const app = appFromRow(appRow); const programmeSlug = text(programme, "slug") ?? ""; const workspace = workspaceFor({ slug: programmeSlug }, appRow)
  return { departmentId: (profile.department_id ?? null) as string | number | null, departmentName: text((appRow.department as Row | undefined) ?? {}, "name") ?? text(appRow, "department_name"), programmeId: text(programme, "id"), programmeName: text(programme, "name"), programmeSlug, facultyId, facultyName: text((faculty ?? {}) as Row, "name"), collegeName: text((college ?? {}) as Row, "name"), universityId, universityName: text((university ?? {}) as Row, "name"), app, workspace }
}

export async function getEcosystemFeatures(supabase: SupabaseClient, appId: string): Promise<EcosystemFeature[]> { const { data, error } = await supabase.from("app_features").select("id, key, name, route, enabled, sort_order, description, icon, category").eq("app_id", appId).order("sort_order"); if (error) return []; return ((data ?? []) as Row[]).filter((row) => bool(row, "enabled")).map((row) => ({ id: String(row.id ?? row.key ?? row.name ?? "feature"), name: text(row, "name") ?? "Feature", slug: text(row, "key") ?? String(row.id ?? "feature"), description: text(row, "description"), href: text(row, "route"), icon: text(row, "icon"), sortOrder: Number(row.sort_order ?? 0), category: row.category === "CORE" ? "CORE" : "DEPARTMENT_SPECIFIC" })) }

export function workspacePath(workspace: Pick<AcademicWorkspace, "href"> | null | undefined): string { return workspace?.href ?? "/profile/complete" }
export function appHomePath(slug: string | null | undefined): string { if (slug === "politeia") return "/politeia"; if (slug === "medhaven") return "/medhaven"; return slug ? `/workspace/${slug.replace(/^department-/, "")}` : "/dashboard" }
