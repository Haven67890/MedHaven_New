-- JositeX Phase 2.1: reconcile the production academic spine.
--
-- Production already contains the earlier, university-wide catalogue schema:
-- academic_levels(code/name/sort_order), semesters(code/name/sort_order), and
-- academic_sessions(name/is_current). Do not reshape those tables into a
-- department-owned model here. The existing courses.level enum is the only
-- authoritative level source currently available; semester and session data
-- remain unresolved and are intentionally not invented.
BEGIN;

-- Normalize only level labels already present in the canonical courses enum.
-- This creates one global catalogue row per existing label, not a curriculum
-- assignment. No semester or academic-session rows are created.
INSERT INTO public.academic_levels (name, code, sort_order)
SELECT DISTINCT
  c.level::text,
  c.level::text,
  CASE c.level::text
    WHEN '100L' THEN 100
    WHEN '200L' THEN 200
    WHEN '300L' THEN 300
    WHEN '400L' THEN 400
    WHEN '500L' THEN 500
    WHEN '600L' THEN 600
  END
FROM public.courses AS c
WHERE c.level IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.academic_levels AS l
    WHERE l.code = c.level::text
  );

-- Backfill the normalized level relationship from the same one-to-one
-- authoritative enum mapping. Legacy courses.level is retained unchanged.
UPDATE public.courses AS c
SET level_id = l.id
FROM public.academic_levels AS l
WHERE c.level_id IS NULL
  AND l.code = c.level::text;

-- Semester and session placement requires authoritative departmental input.
-- Leave both nullable relationships untouched rather than inferring values.

-- The live foreign keys are simple column references. Add each covering index
-- only when no equivalent single-column index already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index AS ix
    WHERE ix.indrelid = 'public.courses'::regclass
      AND ix.indisvalid
      AND ix.indkey::int2[] = ARRAY[
        (SELECT a.attnum FROM pg_attribute AS a
         WHERE a.attrelid = 'public.courses'::regclass AND a.attname = 'academic_session_id')
      ]::int2[]
  ) THEN
    CREATE INDEX idx_courses_academic_session_id
      ON public.courses (academic_session_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index AS ix
    WHERE ix.indrelid = 'public.courses'::regclass
      AND ix.indisvalid
      AND ix.indkey::int2[] = ARRAY[
        (SELECT a.attnum FROM pg_attribute AS a
         WHERE a.attrelid = 'public.courses'::regclass AND a.attname = 'level_id')
      ]::int2[]
  ) THEN
    CREATE INDEX idx_courses_level_id
      ON public.courses (level_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index AS ix
    WHERE ix.indrelid = 'public.courses'::regclass
      AND ix.indisvalid
      AND ix.indkey::int2[] = ARRAY[
        (SELECT a.attnum FROM pg_attribute AS a
         WHERE a.attrelid = 'public.courses'::regclass AND a.attname = 'semester_id')
      ]::int2[]
  ) THEN
    CREATE INDEX idx_courses_semester_id
      ON public.courses (semester_id);
  END IF;
END $$;

-- These dimensions are global in the live schema: they have no department_id
-- or university_id foreign key. Authenticated access is therefore the narrowest
-- accurate scope; department predicates would be fabricated authorization.
ALTER TABLE public.academic_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for academic_levels" ON public.academic_levels;
DROP POLICY IF EXISTS "Allow public read for semesters" ON public.semesters;
DROP POLICY IF EXISTS "Allow public read for academic_sessions" ON public.academic_sessions;
DROP POLICY IF EXISTS "Authenticated users can view academic levels" ON public.academic_levels;
DROP POLICY IF EXISTS "Authenticated users can view semesters" ON public.semesters;
DROP POLICY IF EXISTS "Authenticated users can view academic sessions" ON public.academic_sessions;

CREATE POLICY "Authenticated users can view academic levels"
  ON public.academic_levels FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can view semesters"
  ON public.semesters FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can view academic sessions"
  ON public.academic_sessions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

REVOKE SELECT ON public.academic_levels, public.semesters, public.academic_sessions FROM PUBLIC, anon;
GRANT SELECT ON public.academic_levels, public.semesters, public.academic_sessions TO authenticated;

COMMENT ON TABLE public.academic_levels IS
  'Global academic level catalogue normalized only from authoritative courses.level values; currently 100L through 600L.';
COMMENT ON TABLE public.semesters IS
  'Global semester catalogue; intentionally empty until authoritative semester definitions are supplied.';
COMMENT ON TABLE public.academic_sessions IS
  'Global academic-session catalogue; intentionally empty until authoritative session definitions are supplied.';
COMMENT ON COLUMN public.courses.level IS
  'Legacy compatibility field retained as the authoritative source for currently known level labels.';
COMMENT ON COLUMN public.courses.semester_id IS
  'Nullable until authoritative semester placement is supplied; never inferred.';
COMMENT ON COLUMN public.courses.academic_session_id IS
  'Nullable until authoritative academic-session placement is supplied; never inferred from date or course code.';

COMMIT;
