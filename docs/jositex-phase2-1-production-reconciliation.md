# JositeX Phase 2.1 — Production Academic Spine Reconciliation

## Scope

This phase reconciles the live JositeX academic spine without rewriting historical migrations, deleting course data, changing course ownership, or inventing academic assignments.

- Repository: `Haven67890/MedHaven_New`
- Supabase project: `fexsfbdvewlmvzfnwqul`
- Render service: `MedHaven` (`https://medhaven.onrender.com`)
- Branch: `fix/jositex-phase2-production-reconciliation`
- Migration file: `20261002094440_phase2_1_reconcile_production_academic_spine.sql`
- Production migration name recorded by Supabase: `20261002094440_phase2_1_reconcile_production_academic_spine`

## Production findings before the migration

The live database was not in the empty-table state described by the original brief. It already contained the earlier university-wide catalogue schema:

- `academic_levels`: 0 rows; columns `id`, `name`, `code`, `sort_order`, `created_at`
- `semesters`: 0 rows; columns `id`, `name`, `code`, `sort_order`, `created_at`
- `academic_sessions`: 0 rows; columns `id`, `name`, `is_current`, `created_at`
- `courses`: 77 rows
- `courses.level_id`: NULL for 77 rows
- `courses.semester_id`: NULL for 77 rows
- `courses.academic_session_id`: NULL for 77 rows
- `courses.department_id`, `courses.code`, and legacy `courses.level`: non-NULL for all 77 rows
- Department distribution: Medicine & Surgery 72; Political Science 5; all remaining departments 0
- Legacy levels: 100L 42; 200L 5; 300L 5; 400L 8; 500L 8; 600L 9
- Duplicate `(department_id, code, level)` identities: 0
- Timetable rows: 171; rows without `course_id`: 83

The live foreign keys were the simple column relationships `courses_level_id_fkey`, `courses_semester_id_fkey`, and `courses_academic_session_id_fkey`. The earlier repository code referenced composite relationship names that did not exist in production.

Before reconciliation, the three academic dimension tables had public `SELECT USING (true)` policies, and the three course foreign keys had no covering indexes.

## Academic data policy

The existing `courses.level` enum is the authoritative source for the six level labels already in production. The migration therefore creates exactly six global level catalogue rows—100L through 600L—and backfills `courses.level_id` through an exact code-to-code mapping. It preserves every legacy `courses.level` value.

No semester rows or academic-session rows are created. No semester or session relationship is populated. The repository and production schema contain no authoritative semester definitions, academic calendar mapping, or session assignment source. Guessing First/Second Semester, Harmattan/Rain, or a current session would corrupt academic data. Future authoritative departmental input is required.

The live dimension schema has no `department_id` or `university_id` on these tables. The migration therefore does not fabricate a department predicate. It treats the dimensions as global catalogues and restricts reads to authenticated users.

## Changes

1. Inserted only the six level labels already present in `courses.level`.
2. Backfilled all 77 `courses.level_id` values from the normalized level catalogue.
3. Left all 77 `semester_id` and `academic_session_id` values NULL.
4. Added non-duplicate indexes:
   - `idx_courses_academic_session_id` on `courses(academic_session_id)`
   - `idx_courses_level_id` on `courses(level_id)`
   - `idx_courses_semester_id` on `courses(semester_id)`
5. Removed public `SELECT` policies and grants from the three academic dimensions.
6. Added authenticated-only `SELECT` policies for all three global dimensions.
7. Updated `hooks/useCourses.ts` and `lib/course-domain.ts` to use the live FK relationship names.

## Production after the migration

- Courses: 77 remain; no course was deleted.
- Null department IDs: 0.
- Null course codes: 0.
- Null legacy levels: 0.
- Null normalized level IDs: 0.
- Null semester IDs: 77.
- Null academic-session IDs: 77.
- Academic levels: 6.
- Semesters: 0.
- Academic sessions: 0.
- Level distribution remains 42 / 5 / 5 / 8 / 8 / 9.
- Invalid normalized foreign-key links: 0.
- Duplicate course identities: 0.
- Timetable rows remain 171, including 83 without a course ID.

## RLS verification

Catalog verification after deployment shows only these policies on the three dimension tables:

- `Authenticated users can view academic levels` — `authenticated`, `SELECT`, `auth.uid() IS NOT NULL`
- `Authenticated users can view semesters` — `authenticated`, `SELECT`, `auth.uid() IS NOT NULL`
- `Authenticated users can view academic sessions` — `authenticated`, `SELECT`, `auth.uid() IS NOT NULL`

The old public policies were removed and public/anon `SELECT` privileges were revoked. Super admins retain access because they are authenticated and the dimensions are global rather than department-owned. Cross-department row filtering is not applicable to these tables because the live schema has no department relationship; course isolation remains governed by the existing `courses` RLS policy.

A live authenticated-user matrix test for separate department accounts was not available in this sandbox session. The policy/catalogue inspection and existing course RLS policy were verified; no service-role credential was added to client code.

## Advisor checks

The post-migration security advisor contains only the pre-existing `auth_leaked_password_protection` warning. It is unrelated to this PR and was not changed.

The three missing-FK-index findings no longer appear in the post-migration performance advisor output. Existing unrelated RLS init-plan warnings and unused-index notices remain outside this phase’s scope.

## Responsive verification

Public Playwright checks were run against `https://medhaven.onrender.com/` and `/login` at 320px, 360px, and 390px viewport widths. Every route returned HTTP 200 at every width. For all six checks, `scrollWidth === clientWidth`, horizontal overflow was false, and heading/CTA clipping counts were zero. The live homepage was also opened in the browser at the available 1280px viewport; its header, Sign in control, heading, primary CTAs, and environment cards were visible.

Authenticated workspace routes were not verified because no authenticated browser session was available. This report does not claim authenticated mobile verification.

## Tests and commands

All commands below passed unless noted:

- `npm ci` — passed; npm reported 12 existing audit findings (10 high, 2 critical)
- `npm run typecheck` — passed
- `npx tsx tests/course-domain.test.ts` — passed
- `npx tsx tests/sba-style.test.ts` — passed
- `npx tsx tests/osce.test.ts` — passed
- `npx eslint hooks/useCourses.ts lib/course-domain.ts` — passed
- `git diff --check` — passed
- `NEXT_TELEMETRY_DISABLED=1 npm run build` — passed

The build retained the existing middleware deprecation warning; it did not introduce a changed-file failure.

## Migration safety and limitations

Historical migrations were not rewritten. Production data was not destructively modified: no `TRUNCATE`, broad `DELETE`, reset, or schema recreation was used. Legacy course fields and ownership were preserved.

Unresolved items intentionally left for authoritative future input:

1. semester definitions and course-semester relationships;
2. academic-session definitions and course-session relationships;
3. the 83 timetable rows without a course relationship;
4. authenticated multi-department browser verification at 320px, 360px, and 390px.
