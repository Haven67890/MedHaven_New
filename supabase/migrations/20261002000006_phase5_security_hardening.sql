-- Phase 5: security hardening for universal workspace authorization.
-- Non-destructive and safe to apply after the existing JositeX migrations.
BEGIN;

-- These helpers only read the caller's own profile row. SECURITY INVOKER is
-- sufficient because the authenticated role can read its own profile through
-- the existing RLS policy, and avoids exposing unnecessary SECURITY DEFINER
-- RPCs through the public API schema.
ALTER FUNCTION public.current_user_department_id() SECURITY INVOKER;
ALTER FUNCTION public.is_super_admin() SECURITY INVOKER;

-- Onboarding writes only the authenticated user's own profile. The profile
-- INSERT/UPDATE policies and the protected-field trigger enforce that boundary;
-- the RPC does not need to bypass RLS.
CREATE OR REPLACE FUNCTION public.complete_profile_onboarding(
  p_full_name text,
  p_university_id uuid,
  p_faculty_id uuid,
  p_department_id uuid,
  p_level public.academic_level
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_department_name text;
  v_existing_university_id uuid;
  v_existing_faculty_id uuid;
  v_existing_department_id uuid;
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RAISE EXCEPTION USING message = 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.universities
    WHERE id = p_university_id
  ) THEN
    RAISE EXCEPTION USING message = 'Invalid university selection';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.faculties
    WHERE id = p_faculty_id
      AND university_id = p_university_id
  ) THEN
    RAISE EXCEPTION USING message = 'Invalid faculty selection';
  END IF;

  SELECT d.name
  INTO v_department_name
  FROM public.departments AS d
  WHERE d.id = p_department_id
    AND d.faculty_id = p_faculty_id
    AND d.university_id = p_university_id
    AND d.status = 'active';

  IF v_department_name IS NULL THEN
    RAISE EXCEPTION USING message = 'Invalid department selection';
  END IF;

  -- A completed profile cannot be reassigned through this client-callable RPC.
  -- This prevents crafted arguments from moving an account across departments.
  SELECT p.university_id, p.faculty_id, p.department_id
  INTO v_existing_university_id, v_existing_faculty_id, v_existing_department_id
  FROM public.profiles AS p
  WHERE p.id = (select auth.uid());

  IF v_existing_department_id IS NOT NULL
     AND (
       v_existing_university_id IS DISTINCT FROM p_university_id
       OR v_existing_faculty_id IS DISTINCT FROM p_faculty_id
       OR v_existing_department_id IS DISTINCT FROM p_department_id
     ) THEN
    RAISE EXCEPTION USING message = 'Institutional context cannot be changed after onboarding';
  END IF;

  -- The trigger permits only this narrowly-scoped onboarding path to set the
  -- institutional fields, while still rejecting role/admin-field changes.
  PERFORM set_config('app.allow_profile_onboarding', 'true', true);

  INSERT INTO public.profiles (
    id, full_name, university_id, faculty_id, department_id, department, current_level
  )
  VALUES (
    (select auth.uid()), p_full_name, p_university_id, p_faculty_id,
    p_department_id, v_department_name, p_level
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = coalesce(EXCLUDED.full_name, public.profiles.full_name),
    university_id = EXCLUDED.university_id,
    faculty_id = EXCLUDED.faculty_id,
    department_id = EXCLUDED.department_id,
    department = EXCLUDED.department,
    current_level = EXCLUDED.current_level,
    updated_at = now();
END;
$$;

-- Quiz submission derives the user, department, score, and inserted owner from
-- the authenticated session. It only reads rows visible through department RLS
-- and inserts an attempt owned by auth.uid(), so invoker security is sufficient.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_quiz_id uuid,
  p_answers jsonb
)
RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (select auth.uid());
  v_department_id uuid := public.current_user_department_id();
  v_total integer;
  v_score integer;
  v_attempt public.quiz_attempts;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING message = 'Authentication required';
  END IF;

  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION USING message = 'Answers must be a JSON object';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.quizzes AS q
    JOIN public.courses AS c ON c.id = q.course_id
    WHERE q.id = p_quiz_id
      AND (c.department_id = v_department_id OR public.is_super_admin())
  ) THEN
    RAISE EXCEPTION USING message = 'Quiz is not available to this department';
  END IF;

  SELECT count(*)::integer
  INTO v_total
  FROM public.quiz_questions AS qq
  WHERE qq.quiz_id = p_quiz_id;

  SELECT count(*)::integer
  INTO v_score
  FROM public.quiz_questions AS qq
  JOIN jsonb_each_text(p_answers) AS supplied ON supplied.key = qq.id::text
  WHERE qq.quiz_id = p_quiz_id
    AND supplied.value = qq.correct_answer;

  INSERT INTO public.quiz_attempts (user_id, quiz_id, score, total_questions)
  VALUES (v_user_id, p_quiz_id, coalesce(v_score, 0), coalesce(v_total, 0))
  RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$;

-- Keep the RPCs callable only by authenticated application sessions.
REVOKE EXECUTE ON FUNCTION public.complete_profile_onboarding(text, uuid, uuid, uuid, public.academic_level) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_department_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_profile_onboarding(text, uuid, uuid, uuid, public.academic_level) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_department_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;

-- Past Questions may be read by authenticated users only through a safe
-- projection. Correct answers, explanations, scoring metadata, and other
-- privileged columns remain available to service_role/admin workflows only.
REVOKE SELECT ON public.question_bank FROM authenticated;
GRANT SELECT (
  id, course_id, topic, question_text, options, difficulty, status
) ON public.question_bank TO authenticated;

COMMIT;
