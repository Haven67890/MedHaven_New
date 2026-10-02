-- JositeX Phase 2: canonical academic course spine.
-- Non-destructive: preserves legacy level/code fields and leaves unknown
-- semester/session values unresolved until authoritative departmental data exists.
BEGIN;

CREATE TABLE IF NOT EXISTS public.academic_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text,
  sort_order integer,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_levels_department_code_key UNIQUE (department_id, code)
);

CREATE TABLE IF NOT EXISTS public.semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  sort_order integer,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT semesters_department_code_key UNIQUE (department_id, code)
);

CREATE TABLE IF NOT EXISTS public.academic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid REFERENCES public.universities(id) ON DELETE RESTRICT,
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_level_id_fkey') THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_level_id_fkey
      FOREIGN KEY (level_id) REFERENCES public.academic_levels(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_semester_id_fkey') THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_semester_id_fkey
      FOREIGN KEY (semester_id) REFERENCES public.semesters(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_academic_session_id_fkey') THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_academic_session_id_fkey
      FOREIGN KEY (academic_session_id) REFERENCES public.academic_sessions(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- The legacy enum is authoritative for existing rows. Reuse only values
-- already present in courses; do not invent departmental curricula.
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

-- The old global (code, level) constraint is too broad for a multi-department
-- university. Enforce identity at department scope, while allowing the same
-- code to recur in a later known academic session.
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

ALTER TABLE public.academic_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Department members can view academic levels" ON public.academic_levels;
CREATE POLICY "Department members can view academic levels"
  ON public.academic_levels FOR SELECT TO authenticated
  USING (is_super_admin() OR department_id = current_user_department_id());

DROP POLICY IF EXISTS "Department members can view semesters" ON public.semesters;
CREATE POLICY "Department members can view semesters"
  ON public.semesters FOR SELECT TO authenticated
  USING (is_super_admin() OR department_id = current_user_department_id());

DROP POLICY IF EXISTS "Authenticated users can view academic sessions" ON public.academic_sessions;
CREATE POLICY "Authenticated users can view academic sessions"
  ON public.academic_sessions FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR university_id IS NULL
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
