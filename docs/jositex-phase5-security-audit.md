# JositeX Phase 5 Security Audit

## Scope

Audited the PR #181 baseline without changing the universal department-workspace architecture or revisiting PR #178. Reviewed the four Security Advisor RPC findings, their client/server call sites, RLS dependencies, relevant grants, Politeia loaders, flashcard progress writes, middleware, and the MedHaven dashboard branch.

## Findings and changes

- `public.current_user_department_id()` and `public.is_super_admin()` only read the authenticated caller's own `profiles` row. They now use `SECURITY INVOKER`; the existing own-profile RLS policy remains the authorization boundary.
- `public.complete_profile_onboarding(...)` only writes the authenticated user's own profile and now uses `SECURITY INVOKER`. It continues to pin `search_path` to empty, schema-qualify relations/types, validate `auth.uid()`, validate the university/faculty/active-department relationship, and reject changing a completed profile into another institutional context.
- `public.submit_quiz_attempt(...)` now uses `SECURITY INVOKER`. It continues to validate `auth.uid()`, require an object-shaped answer payload, scope the quiz to the caller's department or active super-admin status, derive scoring from server-side `quiz_questions`, and insert the attempt with `auth.uid()` as owner.
- All four functions retain explicit grants only for `authenticated` (plus existing trusted roles); `PUBLIC` and `anon` execution are revoked.
- The Politeia `question_bank` projection no longer selects `explanation`. A new column-level grant exposes only `id`, `course_id`, `topic`, `question_text`, `options`, `difficulty`, and `status` to `authenticated`; answer keys and scoring metadata remain unavailable to that role.
- Politeia flashcard progress now verifies that the requested card is visible through the authenticated user's department-scoped `flashcards → flashcard_decks → courses` RLS chain before reading or upserting progress. The progress row remains keyed to `auth.uid()` and protected by owner-only RLS.

## Routing and regression audit

- `/dashboard` still resolves the user's profile → department → active ecosystem workspace → enabled features on the server.
- `/dashboard/[feature]` only renders configured feature routes for the resolved workspace; arbitrary slugs do not escape department scope.
- MedHaven still takes the existing `JuthDashboard` branch and retains its legacy routes.
- POLITEIA routes remain guarded by `requirePoliteiaContext` and continue to use department-scoped Supabase reads.
- No production database was changed in this branch.

## Verification limits

- Static code and SQL review were completed against repository `main` at merge commit PR #181.
- Live production metadata confirmed the five stated Security Advisor findings, current function definitions/grants, relevant RLS policies, table grants, and applied migration history.
- Authenticated cross-department E2E testing and Security Advisor re-run after applying this branch's migration were not performed; no real test credentials were available and the migration was intentionally not applied to production.
- Leaked-password protection remains a manual Supabase Auth dashboard setting and is not represented as a database migration.
