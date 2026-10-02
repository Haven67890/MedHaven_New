-- Universal Department Dashboard & Workspace Architecture
-- Idempotent and non-destructive: preserves existing departments, app IDs, routes, and feature rows.
BEGIN;

ALTER TABLE public.app_features
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'DEPARTMENT_SPECIFIC';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'app_features_category_check'
      AND conrelid = 'public.app_features'::regclass
  ) THEN
    ALTER TABLE public.app_features
      ADD CONSTRAINT app_features_category_check
      CHECK (category IN ('CORE', 'DEPARTMENT_SPECIFIC'));
  END IF;
END $$;

-- Existing feature rows retain their identity; known universal features become CORE.
UPDATE public.app_features
SET category = 'CORE'
WHERE key IN (
  'courses', 'study-library', 'past-questions', 'quizzes', 'flashcards',
  'tutorials', 'assignments', 'assignment-guide', 'timetable',
  'academic-calendar', 'calendar', 'progress', 'notifications',
  'research', 'research-hub', 'staff', 'staff-directory',
  'careers', 'career-pathways'
);

-- Every active department receives exactly one workspace. Existing MedHaven and
-- POLITEIA rows are matched by department_id and are never replaced.
INSERT INTO public.ecosystem_apps (
  university_id, department_id, name, slug, description, route_prefix, status
)
SELECT
  d.university_id,
  d.id,
  d.name || ' Workspace',
  'department-' || d.slug,
  'The department-aware JositeX academic workspace for ' || d.name || '.',
  '/dashboard',
  'active'
FROM public.departments d
WHERE d.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.ecosystem_apps a
    WHERE a.department_id = d.id
  );

-- Add the common academic core to every active workspace without duplicating
-- current POLITEIA or future department-specific configuration.
WITH core(key, name, description, icon, route, sort_order) AS (
  VALUES
    ('courses', 'My Courses', 'Courses assigned to your department and level.', 'book-open', '/dashboard/courses', 10),
    ('study-library', 'Study Library', 'Department-scoped materials and study resources.', 'library', '/dashboard/study-library', 20),
    ('past-questions', 'Past Questions', 'Practice questions for your department.', 'file-question', '/dashboard/past-questions', 30),
    ('quizzes', 'Quizzes / CBT', 'Practice quizzes and computer-based tests.', 'clipboard-list', '/dashboard/quizzes', 40),
    ('flashcards', 'Flashcards', 'Active recall and spaced repetition.', 'brain', '/dashboard/flashcards', 50),
    ('tutorials', 'Tutorials', 'Tutorials and guided learning sessions.', 'graduation-cap', '/dashboard/tutorials', 60),
    ('assignments', 'Assignments', 'Assignment guidance and department work.', 'notebook-pen', '/dashboard/assignments', 70),
    ('timetable', 'Timetable', 'Your department timetable.', 'calendar-days', '/dashboard/timetable', 80),
    ('academic-calendar', 'Academic Calendar', 'Important academic dates and events.', 'calendar', '/dashboard/academic-calendar', 90),
    ('progress', 'Progress', 'Your learning activity and progress.', 'trending-up', '/dashboard/progress', 100),
    ('notifications', 'Notifications', 'Academic announcements and updates.', 'bell', '/dashboard/notifications', 110),
    ('research', 'Research Resources', 'Research and library resources.', 'waypoints', '/dashboard/research', 120),
    ('staff', 'Staff Directory', 'Department staff and academic contacts.', 'users', '/dashboard/staff', 130),
    ('careers', 'Career Resources', 'Career and professional resources.', 'briefcase', '/dashboard/careers', 140)
)
INSERT INTO public.app_features (app_id, key, name, description, icon, route, enabled, sort_order, category)
SELECT a.id, c.key, c.name, c.description, c.icon, c.route, true, c.sort_order, 'CORE'
FROM public.ecosystem_apps a
CROSS JOIN core c
JOIN public.departments d ON d.id = a.department_id AND d.status = 'active'
WHERE a.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.app_features existing
    WHERE existing.app_id = a.id AND existing.key = c.key
  );

CREATE INDEX IF NOT EXISTS idx_app_features_app_enabled_order
  ON public.app_features (app_id, enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_ecosystem_apps_active_department
  ON public.ecosystem_apps (department_id, status);

COMMIT;
