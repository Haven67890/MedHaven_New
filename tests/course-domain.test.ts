import { toCourseIdentity, getAuthorizedCourse } from "../lib/course-domain"

const validRow = {
  id: "course-1",
  code: "POS 101",
  title: "Introduction to Political Science",
  level: "100L",
  level_id: "level-1",
  semester_id: null,
  academic_session_id: null,
  department_id: "dept-1",
  departments: { id: "dept-1", name: "Political Science", faculty_id: "fac-1", university_id: "uni-1" },
  academic_levels: { code: "100L", name: "100L" },
  semesters: null,
  academic_sessions: null,
}

function mockSupabase(row: Record<string, unknown> | null, error: { message: string } | null = null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: row, error }) }),
      }),
    }),
  } as never
}

async function runCourseDomainTests() {
  const course = toCourseIdentity(validRow)
  if (!course || course.id !== "course-1" || course.code !== "POS 101" || course.departmentName !== "Political Science") {
    throw new Error("Course metadata resolution failed")
  }
  if (course.semester !== null || course.academicSession !== null) {
    throw new Error("Unknown semester/session values must remain unresolved")
  }

  const valid = await getAuthorizedCourse(mockSupabase(validRow), "course-1")
  if (!valid.course || valid.course.departmentId !== "dept-1") throw new Error("Valid course lookup failed")

  const unauthorized = await getAuthorizedCourse(mockSupabase(null), "course-2")
  if (unauthorized.course || unauthorized.error !== "Course is not available to this department") {
    throw new Error("Unauthorized course access was not rejected")
  }

  const invalid = await getAuthorizedCourse(mockSupabase(null, { message: "RLS denied" }), "course-1")
  if (invalid.course || invalid.error !== "Unable to verify course access") {
    throw new Error("Invalid department/course lookup was not rejected")
  }

  console.log("✓ Canonical course lookup, department scoping, unresolved metadata, and unauthorized access validated.")
}

void runCourseDomainTests()
