-- Corrective reconciliation for the live JositeX security posture and POLITEIA workflows.
-- Idempotent and non-destructive: preserves existing rows, IDs, and storage objects.
BEGIN;

-- Profiles are not an institutional directory. Keep profile reads private to the owner;
-- service_role/admin server operations continue to bypass RLS as intended.
DROP POLICY IF EXISTS "Allow public read" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

-- A Storage UPDATE must validate both the existing row and the replacement path.
DROP POLICY IF EXISTS "Department isolated academic materials update" ON storage.objects;
CREATE POLICY "Department isolated academic materials update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = ANY (ARRAY['materials', 'presentations', 'research', 'quiz-bank'])
    AND (
      (select is_super_admin())
      OR (
        owner_id = (select auth.uid())::text
        AND (
          ((storage.foldername(name))[1] = 'department' AND (storage.foldername(name))[2] = (select current_user_department_id())::text)
          OR (storage.foldername(name))[1] = (select current_user_department_id())::text
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = ANY (ARRAY['materials', 'presentations', 'research', 'quiz-bank'])
    AND (
      (select is_super_admin())
      OR (
        owner_id = (select auth.uid())::text
        AND (
          ((storage.foldername(name))[1] = 'department' AND (storage.foldername(name))[2] = (select current_user_department_id())::text)
          OR (storage.foldername(name))[1] = (select current_user_department_id())::text
        )
      )
    )
  );

-- Server-side quiz submission: clients provide answers only; score and ownership are derived here.
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_quiz_id uuid,
  p_answers jsonb
)
RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY DEFINER
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
    FROM public.quizzes q
    JOIN public.courses c ON c.id = q.course_id
    WHERE q.id = p_quiz_id
      AND (c.department_id = v_department_id OR public.is_super_admin())
  ) THEN
    RAISE EXCEPTION USING message = 'Quiz is not available to this department';
  END IF;
  SELECT count(*)::integer INTO v_total
  FROM public.quiz_questions qq
  WHERE qq.quiz_id = p_quiz_id;
  SELECT count(*)::integer INTO v_score
  FROM public.quiz_questions qq
  JOIN jsonb_each_text(p_answers) supplied ON supplied.key = qq.id::text
  WHERE qq.quiz_id = p_quiz_id
    AND supplied.value = qq.correct_answer;
  INSERT INTO public.quiz_attempts (user_id, quiz_id, score, total_questions)
  VALUES (v_user_id, p_quiz_id, coalesce(v_score, 0), coalesce(v_total, 0))
  RETURNING * INTO v_attempt;
  RETURN v_attempt;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz
  ON public.quiz_attempts (user_id, quiz_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_user_flashcard
  ON public.flashcard_progress (user_id, flashcard_id);

COMMIT;
