# JositeX Phase 2 — Academic Course Spine Production Reconciliation

## Scope and current status

This closure work preserves MedHaven, POLITEIA, `/politeia/*`, legacy course fields, existing resources, and storage. It does not redesign Phase 3 pages, migrate storage, fabricate semester/session data, or modify unrelated legacy code.

Production project: `supabase-fuchsia-river` (`fexsfbdvewlmvzfnwqul`).
Production project ID: `fexsfbdvewlmvzfnwqul`.

**Status at authoring time:** production is independently verified to be missing the Phase 2 schema. The corrected migration is prepared in this PR but is intentionally not represented as deployed until this PR is merged and the normal Supabase deployment runs. Render currently serves the PR #185 commit, not this closure branch.

## Why the migration timestamp was reconciled

PR #185 merged `20261002000007_phase2_academic_course_spine.sql` into `main`. Production migration history already contains later versions, including `20261002003650_phase5_security_hardening`. Supabase therefore did not apply the earlier Phase 2 file in chronological order. Production migration history was independently inspected and contains no Phase 2 version; production tables and columns were also absent.

The old unapplied file was removed from the repository and replaced using the established CLI workflow:

```text
npx supabase migration new phase2_academic_course_spine_production_reconciliation
```

Final migration filename/version:

```text
20261002082414_phase2_academic_course_spine_production_reconciliation.sql
```

The generated version is later than the latest applied production migration. No already-applied migration was edited or marked as applied.

## Final academic hierarchy

```text
University
  └── Faculty
       └── Department
            ├── Academic Level
            │    └── Course
            │         ├── Semester (nullable)
            │         └── Academic Session (nullable)
```

Existing `universities`, `faculties`, `departments`, and `courses` remain canonical. The migration creates `academic_levels`, `semesters`, and `academic_sessions`, and adds nullable `courses.level_id`, `courses.semester_id`, and `courses.academic_session_id`. Legacy `courses.level` and `courses.code` remain intact.

Only authoritative existing course levels are backfilled. The migration deliberately inserts no semester or academic-session rows and does not infer a current session.

## Hierarchy integrity

`courses.level_id` and `courses.semester_id` use composite foreign keys with `department_id`, so a dimension row belonging to another department cannot be attached to a course. `courses.academic_session_id` has a restrictive foreign key and a database trigger checks that the session university matches the course department's university. This is required because the existing `courses` table does not carry a `university_id` column.

The previous global `(code, level)` identity boundary is replaced with non-destructive department/level/session-aware unique indexes. Existing rows are not deleted or rewritten except for the authoritative `level_id` links.

## Production audit before deployment

Read-only Supabase audits completed against project `fexsfbdvewlmvzfnwqul`:

- 77 courses exist.
- 0 courses have a null department, code, or legacy level.
- 0 duplicate `(department_id, code, level)` identities were found.
- 171 timetable rows exist; 83 have `course_id IS NULL` and remain untouched.
- Resource links were intact: 1,092 materials, 897 question-bank rows, 150 quizzes, 22 flashcard decks, 3 presentations, 3 assignment guides, 3 research resources, 117 image-bank rows, and 1 course blueprint were checked; no orphaned course links were found.
- Production has no `academic_levels`, `semesters`, or `academic_sessions` tables and no normalized course columns yet.
- No semester/session values were invented.

Expected post-deployment checks are 77 courses, all authoritative courses linked to an academic level, null semester/session fields where no authoritative data exists, unchanged resource counts, 83 unresolved timetable rows, no orphaned hierarchy links, and no cross-department level/semester references.

## RLS and security

The production baseline confirms `current_user_department_id()`, `is_super_admin()`, and `submit_quiz_attempt()` are `SECURITY INVOKER`. The new dimension tables enable RLS and expose authenticated department-scoped levels/semesters and university-scoped sessions. Course authorization continues through the authenticated/RLS-backed client; service role is never used as the authorization check.

The pre-change security advisor baseline contains only the existing leaked-password-protection warning. The performance baseline contains existing RLS init-plan and unused-index notices. These are recorded as pre-existing and must be compared with the post-migration advisor output after deployment.

## Application query and authorization changes

`hooks/useCourses.ts` and `lib/course-domain.ts` now use explicit PostgREST relationship names tied to the migration's foreign-key constraints:

- `courses_level_department_fkey`
- `courses_semester_department_fkey`
- `courses_academic_session_id_fkey`
- existing `courses_department_id_fkey`

Course queries return ID, code, title/name, legacy and normalized level, semester, academic session, and department/faculty/university context. `getAuthorizedCourse()` still requires the authenticated client, rejects missing/inaccessible IDs, and returns canonical metadata. Quiz, flashcard, and OSCE routes continue to resolve course access before privileged reads or writes.

## Validation record

Completed in this branch:

- `npm ci` completed successfully (npm reported the repository's existing dependency audit findings: 12 vulnerabilities).
- `npm run typecheck` passed.
- `npx tsx tests/course-domain.test.ts` passed, including valid, inaccessible, RLS-error, canonical metadata, and unresolved semester/session cases.
- `npx tsx tests/osce.test.ts` passed.
- `npx tsx tests/sba-style.test.ts` passed.
- `git diff --check` passed.
- `NEXT_TELEMETRY_DISABLED=1 npx next build --webpack` passed. It retained an existing warning that `pdfjs-dist` has no default export in `lib/image-extraction.ts` and the existing Next middleware deprecation warning; neither is in the changed files.
- Changed-file ESLint was run. The only findings were pre-existing legacy `any`/unused-variable/prefer-const findings in the unchanged quiz/flashcard/OSCE route files; the changed `hooks/useCourses.ts` and `lib/course-domain.ts` introduced no lint findings.

`npx supabase db lint --local` could not run because this sandbox has no local Postgres/Docker service (`127.0.0.1:54322` refused). The only available Supabase branch is the production main branch and it reports `MIGRATIONS_FAILED`, so no production or branch database was used as the first place to discover SQL errors. A local or dedicated development database validation remains a deployment prerequisite.

## Render and post-merge verification

Render service: `MedHaven` (`srv-d9oum77qj5pc738d73fg`), branch `main`, auto-deploy enabled. The live deployment currently corresponds to merge commit `75b0dca11e3c87ca24dbc43e492bb95cfb5b3319` from PR #185 and is live as deployment `dep-davmgu8ae00c73dncss0`.

This PR does not claim Render deployment success for the closure branch before merge. After merge, verify the new deployment's commit, build, live status, service startup, health behavior, and runtime logs independently.

## Deferred Phase 3 work

Authoritative departmental input remains required for semester placement, academic sessions, and the 83 course-less timetable rows. Study Library, Past Questions, quiz/flashcard/tutorial/presentation/timetable/progress redesigns, route consolidation, storage migration, and other Phase 3 page work remain intentionally deferred.
