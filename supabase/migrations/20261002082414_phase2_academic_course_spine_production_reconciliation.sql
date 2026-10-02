-- JositeX Phase 2 production reconciliation.
-- The original Phase 2 migration was chronologically earlier than production's
-- already-applied Phase 5 migration, so this file is the only deployable copy.
-- Non-destructive: preserves legacy fields and does not invent semester/session data.
BEGIN;

CREATE TABLE IF NOT EXISTS public.academic_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text,
  sort_order integer,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_levels_department_code_key UNIQUE (department_id, code),
  CONSTRAINT academic_levels_id_department_key UNIQUE (id, department_id)
);

CREATE TABLE IF NOT EXISTS public.semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  sort_order integer,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT semesters_department_code_key UNIQUE (department_id, code),
  CONSTRAINT semesters_id_department_key UNIQUE (id, department_id)
);

CREATE TABLE IF NOT EXISTS public.academic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
  code text NOT NULL,
  starts_on date,
  ends_on date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_sessions_university_code_key UNIQUE (university_id, code)
);

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS level_id uuid,
  ADD COLUMN IF NOT EXISTS semester_id uuid,
  ADD COLUMN IF NOT EXISTS academic_session_id uuid;

-- Composite references make a level or semester from Department B
-- impossible to attach to a course owned by Department A.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_level_department_fkey') THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_level_department_fkey
      FOREIGN KEY (level_id, department_id)
      REFERENCES public.academic_levels(id, department_id)
      ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_semester_department_fkey') THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_semester_department_fkey
      FOREIGN KEY (semester_id, department_id)
      REFERENCES public.semesters(id, department_id)
      ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_academic_session_id_fkey') THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_academic_session_id_fkey
      FOREIGN KEY (academic_session_id)
      REFERENCES public.academic_sessions(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Existing legacy course levels are authoritative. No semester or session rows
-- are created, and no course is assigned to a session by inference.
INSERT INTO public.academic_levels (department_id, code, name, sort_order)
SELECT DISTINCT
  c.department_id,
  c.level::text,
  c.level::text,
  CASE c.level::text
    WHEN '100L' THEN 100
    WHEN '200L' THEN 200
    WHEN '300L' THEN 300
    WHEN '400L' THEN 400
    WHEN '500L' THEN 500
    WHEN '600L' THEN 600
    ELSE NULL
  END
FROM public.courses AS c
WHERE c.department_id IS NOT NULL
  AND c.level IS NOT NULL
ON CONFLICT (department_id, code) DO NOTHING;

UPDATE public.courses AS c
SET level_id = l.id
FROM public.academic_levels AS l
WHERE l.department_id = c.department_id
  AND l.code = c.level::text
  AND c.level_id IS NULL;

-- Replace the old global identity boundary without deleting course rows.
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_code_level_key;
DROP INDEX IF EXISTS public.courses_code_level_key;
CREATE UNIQUE INDEX IF NOT EXISTS courses_department_code_level_unresolved_session_key
  ON public.courses (department_id, code, level_id)
  WHERE academic_session_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS courses_department_code_level_session_key
  ON public.courses (department_id, code, level_id, academic_session_id)
  WHERE academic_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_academic_levels_department_status
  ON public.academic_levels (department_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_semesters_department_status
  ON public.semesters (department_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_academic_sessions_university_status
  ON public.academic_sessions (university_id, status, starts_on);
CREATE INDEX IF NOT EXISTS idx_courses_department_level_semester
  ON public.courses (department_id, level_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_courses_academic_session
  ON public.courses (academic_session_id);

-- Courses do not currently store university_id. Enforce session scope by
-- checking the course department's university at the database boundary.
CREATE OR REPLACE FUNCTION public.validate_course_academic_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  course_university_id uuid;
  session_university_id uuid;
BEGIN
  IF NEW.academic_session_id IS NULL OR NEW.department_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT d.university_id INTO course_university_id
  FROM public.departments AS d
  WHERE d.id = NEW.department_id;

  SELECT s.university_id INTO session_university_id
  FROM public.academic_sessions AS s
  WHERE s.id = NEW.academic_session_id;

  IF course_university_id IS DISTINCT FROM session_university_id THEN
    RAISE EXCEPTION 'Course department and academic session university must match';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courses_validate_academic_hierarchy ON public.courses;
CREATE TRIGGER courses_validate_academic_hierarchy
  BEFORE INSERT OR UPDATE OF department_id, semester_id, academic_session_id, level_id
  ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.validate_course_academic_hierarchy();

REVOKE EXECUTE ON FUNCTION public.validate_course_academic_hierarchy() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.academic_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Department members can view academic levels" ON public.academic_levels;
CREATE POLICY "Department members can view academic levels"
  ON public.academic_levels FOR SELECT TO authenticated
  USING ((SELECT public.is_super_admin()) OR department_id = (SELECT public.current_user_department_id()));

DROP POLICY IF EXISTS "Department members can view semesters" ON public.semesters;
CREATE POLICY "Department members can view semesters"
  ON public.semesters FOR SELECT TO authenticated
  USING ((SELECT public.is_super_admin()) OR department_id = (SELECT public.current_user_department_id()));

DROP POLICY IF EXISTS "Authenticated users can view academic sessions" ON public.academic_sessions;
CREATE POLICY "Authenticated users can view academic sessions"
  ON public.academic_sessions FOR SELECT TO authenticated
  USING (
    (SELECT public.is_super_admin())
    OR university_id = (SELECT p.university_id FROM public.profiles AS p WHERE p.id = (SELECT auth.uid()))
  );

GRANT SELECT ON public.academic_levels, public.semesters, public.academic_sessions TO authenticated;

COMMENT ON TABLE public.academic_levels IS 'Canonical department-scoped level dimension; populated only from authoritative catalogue data.';
COMMENT ON TABLE public.semesters IS 'Canonical department-scoped semester dimension; intentionally empty until authoritative semester data exists.';
COMMENT ON TABLE public.academic_sessions IS 'Canonical university/session dimension; intentionally empty until authoritative session data exists.';
COMMENT ON COLUMN public.courses.level IS 'Legacy compatibility field. New code should prefer level_id and academic_levels.';
COMMENT ON COLUMN public.courses.code IS 'Canonical course code within department, level, and known academic session scope.';
COMMENT ON COLUMN public.courses.semester_id IS 'Nullable until authoritative semester placement is supplied.';
COMMENT ON COLUMN public.courses.academic_session_id IS 'Nullable until the course session is known; never inferred from current date.';

COMMIT;
