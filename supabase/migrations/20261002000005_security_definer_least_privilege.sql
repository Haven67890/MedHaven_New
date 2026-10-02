-- Security advisor reconciliation for Universal Department Dashboard.
-- These functions are intentionally SECURITY DEFINER because RLS policies and
-- onboarding/quiz scoring need narrowly scoped elevated reads/writes.
BEGIN;

-- No anonymous caller should reach any privileged RPC.
REVOKE EXECUTE ON FUNCTION public.complete_profile_onboarding(text, uuid, uuid, uuid, public.academic_level) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_department_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC, anon;

-- Authenticated access is retained deliberately:
-- complete_profile_onboarding validates the caller and writes only auth.uid();
-- current_user_department_id/is_super_admin are required by department RLS;
-- submit_quiz_attempt validates department access and scores server-side.
GRANT EXECUTE ON FUNCTION public.complete_profile_onboarding(text, uuid, uuid, uuid, public.academic_level) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_department_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;

COMMIT;

-- Manual Supabase Auth action required: enable leaked-password protection in
-- Authentication > Password Security > Leaked password protection. The current
-- supported migration surface does not expose this Auth provider setting.
