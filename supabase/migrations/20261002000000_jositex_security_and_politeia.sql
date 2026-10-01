-- Migration: 20261002000000_jositex_security_and_politeia.sql
-- Phase 2 & 3: Institutional Catalogue Reconciliation, Security Hardening & POLITEIA Foundation

BEGIN;

-- ============================================================================
-- 1. INSTITUTIONAL CATALOGUE RECONCILIATION
-- ============================================================================

DO $$
DECLARE
  v_uni_id uuid := 'a1b2c3d4-0000-0000-0000-000000000001';
  v_cms_fac_id uuid;
BEGIN
  SELECT id INTO v_cms_fac_id FROM public.faculties WHERE name = 'Communication and Media Studies' AND university_id = v_uni_id;

  IF v_cms_fac_id IS NOT NULL THEN
    INSERT INTO public.departments (university_id, faculty_id, name, short_name, slug, status)
    VALUES
      (v_uni_id, v_cms_fac_id, 'Mass Communication', 'MAC', 'mass-communication', 'active'),
      (v_uni_id, v_cms_fac_id, 'Journalism and Media Studies', 'JMS', 'journalism-and-media-studies', 'active'),
      (v_uni_id, v_cms_fac_id, 'Film and Multimedia Studies', 'FMS', 'film-and-multimedia-studies', 'active'),
      (v_uni_id, v_cms_fac_id, 'Broadcasting', 'BRC', 'broadcasting', 'active')
    ON CONFLICT (university_id, slug) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- 2. PROFILE SECURITY & ONBOARDING TRIGGER HARDENING
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (current_setting('request.jwt.claim.role', true) = 'service_role') THEN
    RETURN NEW;
  END IF;

  IF (auth.uid() IS NULL OR auth.uid() <> NEW.id) THEN
    RAISE EXCEPTION 'Profile may only be changed by its owner or trusted server';
  END IF;

  -- Allow onboarding RPC to update university_id, faculty_id, department_id
  IF current_setting('app.allow_profile_onboarding', true) = 'true' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.account_status IS DISTINCT FROM OLD.account_status
       OR NEW.admin_permissions IS DISTINCT FROM OLD.admin_permissions THEN
      RAISE EXCEPTION 'Role and admin fields may not be changed during onboarding';
    END IF;
    RETURN NEW;
  END IF;

  -- For direct client UPDATE requests:
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.account_status IS DISTINCT FROM OLD.account_status
     OR NEW.admin_permissions IS DISTINCT FROM OLD.admin_permissions
     OR NEW.university_id IS DISTINCT FROM OLD.university_id
     OR NEW.faculty_id IS DISTINCT FROM OLD.faculty_id
     OR NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    RAISE EXCEPTION 'Protected profile fields (university, faculty, department, role) may not be changed directly';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_profile_onboarding(
  p_full_name text,
  p_university_id uuid,
  p_faculty_id uuid,
  p_department_id uuid,
  p_level academic_level
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_department_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING message = 'Authentication required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.universities WHERE id = p_university_id) THEN
    RAISE EXCEPTION USING message = 'Invalid university selection';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.faculties WHERE id = p_faculty_id AND university_id = p_university_id) THEN
    RAISE EXCEPTION USING message = 'Invalid faculty selection';
  END IF;

  SELECT name INTO v_department_name
  FROM public.departments
  WHERE id = p_department_id
    AND faculty_id = p_faculty_id
    AND university_id = p_university_id
    AND status = 'active';

  IF v_department_name IS NULL THEN
    RAISE EXCEPTION USING message = 'Invalid department selection';
  END IF;

  -- Allow profile onboarding updates past the privilege trigger
  PERFORM set_config('app.allow_profile_onboarding', 'true', true);

  INSERT INTO public.profiles (id, full_name, university_id, faculty_id, department_id, department, current_level)
  VALUES (auth.uid(), p_full_name, p_university_id, p_faculty_id, p_department_id, v_department_name, p_level)
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    university_id = EXCLUDED.university_id,
    faculty_id = EXCLUDED.faculty_id,
    department_id = EXCLUDED.department_id,
    department = EXCLUDED.department,
    current_level = EXCLUDED.current_level,
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- 3. QUIZ & FLASHCARD RLS HARDENING
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can insert quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Authenticated users can insert quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can insert decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Authenticated users can insert cards" ON public.flashcards;

CREATE POLICY "Department members can insert quizzes"
ON public.quizzes FOR INSERT TO authenticated
WITH CHECK (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id AND c.department_id = current_user_department_id()
  )
);

CREATE POLICY "Department members can insert quiz questions"
ON public.quiz_questions FOR INSERT TO authenticated
WITH CHECK (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.courses c ON c.id = q.course_id
    WHERE q.id = quiz_id AND c.department_id = current_user_department_id()
  )
);

CREATE POLICY "Department members can insert flashcard decks"
ON public.flashcard_decks FOR INSERT TO authenticated
WITH CHECK (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id AND c.department_id = current_user_department_id()
  )
);

CREATE POLICY "Department members can insert flashcards"
ON public.flashcards FOR INSERT TO authenticated
WITH CHECK (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM public.flashcard_decks d
    JOIN public.courses c ON c.id = d.course_id
    WHERE d.id = deck_id AND c.department_id = current_user_department_id()
  )
);

-- ============================================================================
-- 4. STORAGE RLS HARDENING
-- ============================================================================

DROP POLICY IF EXISTS "Allow uploads vgmv1w_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads vgmv1w_1" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads vgmv1w_2" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads vgmv1w_3" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read academic materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload academic materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploaded academic materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage their uploaded academic materials" ON storage.objects;

CREATE POLICY "Department isolated academic materials read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = ANY (ARRAY['materials', 'presentations', 'research', 'quiz-bank']) AND (
    is_super_admin() OR
    ((storage.foldername(name))[1] = 'department' AND (storage.foldername(name))[2] = (current_user_department_id())::text) OR
    ((storage.foldername(name))[1] = (current_user_department_id())::text) OR
    EXISTS (
      SELECT 1 FROM public.materials m
      JOIN public.courses c ON c.id = m.course_id
      WHERE m.storage_path = name AND c.department_id = current_user_department_id()
    ) OR
    EXISTS (
      SELECT 1 FROM public.presentations p
      JOIN public.courses c ON c.id = p.course_id
      WHERE p.storage_path = name AND c.department_id = current_user_department_id()
    ) OR
    EXISTS (
      SELECT 1 FROM public.research_resources r
      JOIN public.courses c ON c.id = r.course_id
      WHERE r.storage_path = name AND c.department_id = current_user_department_id()
    ) OR
    EXISTS (
      SELECT 1 FROM public.quiz_image_bank q
      JOIN public.courses c ON c.id = q.course_id
      WHERE q.image_url LIKE '%' || name AND c.department_id = current_user_department_id()
    )
  )
);

CREATE POLICY "Department isolated academic materials insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = ANY (ARRAY['materials', 'presentations', 'research', 'quiz-bank']) AND (
    is_super_admin() OR
    ((storage.foldername(name))[1] = 'department' AND (storage.foldername(name))[2] = (current_user_department_id())::text) OR
    ((storage.foldername(name))[1] = (current_user_department_id())::text)
  )
);

CREATE POLICY "Department isolated academic materials update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = ANY (ARRAY['materials', 'presentations', 'research', 'quiz-bank']) AND (
    is_super_admin() OR
    owner_id = (auth.uid())::text AND (
      ((storage.foldername(name))[1] = 'department' AND (storage.foldername(name))[2] = (current_user_department_id())::text) OR
      ((storage.foldername(name))[1] = (current_user_department_id())::text)
    )
  )
);

CREATE POLICY "Department isolated academic materials delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = ANY (ARRAY['materials', 'presentations', 'research', 'quiz-bank']) AND (
    is_super_admin() OR
    owner_id = (auth.uid())::text AND (
      ((storage.foldername(name))[1] = 'department' AND (storage.foldername(name))[2] = (current_user_department_id())::text) OR
      ((storage.foldername(name))[1] = (current_user_department_id())::text)
    )
  )
);

COMMIT;
