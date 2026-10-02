import type { SupabaseClient } from "@supabase/supabase-js"

export type CourseIdentity = {
  id: string
  code: string | null
  title: string | null
  level: string | null
  levelId: string | null
  levelName: string | null
  semester: string | null
  semesterId: string | null
  academicSession: string | null
  academicSessionId: string | null
  departmentId: string | null
  departmentName: string | null
  facultyId: string | null
  universityId: string | null
}

type CourseRow = Record<string, unknown>

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function nestedText(row: CourseRow, key: string, field: string): string | null {
  const value = row[key]
  if (Array.isArray(value)) return text((value[0] as CourseRow | undefined)?.[field])
  if (value && typeof value === "object") return text((value as CourseRow)[field])
  return null
}

export function toCourseIdentity(row: CourseRow | null | undefined): CourseIdentity | null {
  if (!row?.id) return null
  const department = (row.departments ?? {}) as CourseRow
  return {
    id: String(row.id),
    code: text(row.code),
    title: text(row.title) ?? text(row.name),
    level: text(row.level) ?? nestedText(row, "academic_levels", "code"),
    levelId: text(row.level_id),
    levelName: nestedText(row, "academic_levels", "name"),
    semester: nestedText(row, "semesters", "name") ?? nestedText(row, "semesters", "code"),
    semesterId: text(row.semester_id),
    academicSession: nestedText(row, "academic_sessions", "code"),
    academicSessionId: text(row.academic_session_id),
    departmentId: text(row.department_id) ?? text(department.id),
    departmentName: text(department.name),
    facultyId: text(department.faculty_id),
    universityId: text(department.university_id),
  }
}

const COURSE_SELECT = [
  "id", "code", "title", "name", "level", "level_id", "semester_id", "academic_session_id", "department_id",
  "departments!inner(id,name,faculty_id,university_id)",
  "academic_levels:level_id(code,name)",
  "semesters:semester_id(code,name)",
  "academic_sessions:academic_session_id(code)",
].join(",")

/**
 * RLS-backed course lookup. The caller's Supabase session is intentionally
 * required: a service-role lookup must never be used as an authorization check.
 */
export async function getAuthorizedCourse(
  supabase: SupabaseClient,
  courseId: string,
): Promise<{ course: CourseIdentity | null; error: string | null }> {
  if (!courseId.trim()) return { course: null, error: "Course is required" }
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("id", courseId.trim())
    .maybeSingle()
  if (error) return { course: null, error: "Unable to verify course access" }
  const course = toCourseIdentity(data as CourseRow | null)
  return course
    ? { course, error: null }
    : { course: null, error: "Course is not available to this department" }
}

export { COURSE_SELECT }
