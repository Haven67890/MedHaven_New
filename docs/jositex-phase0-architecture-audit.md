# JositeX Phase 0 Architecture Audit

**Repository:** `Haven67890/MedHaven_New`
**Audit branch:** `audit/jositex-phase0-baseline`
**Baseline:** `febe098` (`origin/main`, Phase 5 hardening)
**Audit date:** 2026-10-02

## Executive result

Phase 0 reconciles the repository and production baseline without beginning Phase 1 account/navigation work or Phase 2 level/semester/course redesign. The only implementation changes are:

- the universal resolver now validates `auth.uid()` → profile → active department → faculty → university → department workspace, and selects explicit workspace columns rather than `select("*")`;
- CI now uses Node 22, matching the repository package/runtime baseline; Render’s service is configured as a Node runtime but does not expose an explicit Node version in the inspected service metadata.

No academic rows, storage objects, historical migrations, RLS policies, grants, or Render infrastructure were changed.

## 1. Current architecture and boundaries

The intended layers are:

> **JositeX → University → Faculty → Department → Department Workspace → Universal Academic Engine → Department-specific extensions → Account layer**

The current implementation expresses this as:

- **JositeX:** the shared Next.js application and authentication boundary.
- **Institutional hierarchy:** `universities`, `faculties`, and `departments` with foreign-key relationships.
- **Department workspace:** `ecosystem_apps` keyed to a department; live production has 101 active department workspace rows.
- **Universal engine:** `app/(app)/dashboard`, `app/(app)/dashboard/[feature]`, `UniversalWorkspaceShell`, `lib/jositex.ts`, and `app_features`.
- **Department extensions:** application-specific route families and features, including `/medhaven/*` and `/politeia/*`.
- **Account layer:** Supabase Auth plus the owner-scoped `profiles` row, Profile, Settings, notifications, onboarding, and middleware checks.

MedHaven remains a mature department-specific application. `/dashboard` deliberately branches to the existing `JuthDashboard` and `(app)` uses the existing `ApplicationShell` for the MedHaven context. POLITEIA remains a department-specific application with reusable academic capabilities and its own shell and pages.

## 2. Universal versus department-specific features

`app_features.category` is constrained to `CORE` or `DEPARTMENT_SPECIFIC`.

- **CORE** means a reusable JositeX capability: courses, study library, past questions, quizzes, flashcards, tutorials, assignments, timetable, academic calendar, progress, notifications, research resources, staff directory, and career resources.
- **DEPARTMENT_SPECIFIC** means a capability owned by a particular application or discipline and not a promise that every department should receive it.
- POLITEIA’s live workspace has 20 enabled features: 18 `CORE` and 2 `DEPARTMENT_SPECIFIC`. The department-specific distinction is preserved for Political Dictionary and Political Science-specific extensions such as its research/career workflows where configured; these are not silently reclassified as universal.
- MedHaven-specific clinical guides, OSCE/practicals, medical AI, medical imagery, JUTH workflows, marketplace behavior, and legacy medical navigation remain outside the universal engine.

## 3. Routing architecture

### Universal implementation

- `/dashboard` — universal authenticated entry point; resolves the caller’s workspace server-side.
- `/dashboard/[feature]` — configured universal feature shell with a department-scoped empty state while shared content implementations are being built.
- Shared account surfaces include `/profile`, `/profile/complete`, and `/settings`.

### MedHaven implementation

MedHaven retains its working legacy routes without destructive migration: `/library`, `/materials`, `/lectures`, `/past-questions`, `/quizzes`, `/flashcards`, `/timetable`, `/progress`, `/clinical-guides`, `/tutorials`, `/directory`, `/osce`, `/practical/*`, `/marketplace`, `/notifications`, `/admin`, and `/donate`. These route to the mature MedHaven implementation only when the resolved workspace is MedHaven.

### POLITEIA implementation

POLITEIA retains `/politeia/*`, including courses, study library, past questions, quizzes, flashcards, timetable, calendar, assignment guide, presentations, research, careers, political dictionary, and staff directory. `requirePoliteiaContext()` rejects users whose resolved workspace is not POLITEIA.

### Canonical capability decisions

| Capability | Current canonical implementation | Legacy/extension status |
|---|---|---|
| Workspace entry and feature metadata | `/dashboard`, `lib/jositex.ts`, `app_features` | Replaces no mature department UI |
| MedHaven study/content surfaces | Existing MedHaven routes | Remain department-specific |
| POLITEIA academic content | `/politeia/*` | Remains department-specific, with reusable data patterns |
| Shared account surfaces | `/profile`, `/settings`, onboarding | Shared account layer |
| Future universal feature implementations | `/dashboard/[feature]` | Deferred; current route is intentionally an infrastructure empty state |

URL manipulation cannot select another workspace: the route slug is only accepted after the current user’s profile department resolves to an active workspace, and middleware redirects department-incompatible MedHaven/POLITEIA routes. The resolver hardening in this branch additionally rejects broken department/faculty/university chains and workspace rows whose university does not match the department.

## 4. Production database and relationship inventory

Production project: `supabase-fuchsia-river` (`fexsfbdvewlmvzfnwqul`), healthy, PostgreSQL 17.6.1. The live schema was inspected as authoritative for drift.

| Content/table family | Current ownership relationship | Phase 2 note |
|---|---|---|
| `departments` | University and faculty foreign keys | Hierarchy exists; no Level → Semester model yet |
| `courses` | Faculty and nullable department foreign keys; level enum and legacy parent/level-group fields | Course ownership exists; final semester architecture deferred |
| `materials`, `quizzes`, `question_bank`, `quiz_image_bank` | Course-owned; department derived through course | Strong current department path |
| `quiz_questions` | Quiz-owned, with optional question-bank and image-bank links | Answer-key protection remains a security boundary |
| `flashcard_decks` | Course-owned and creator-linked; `flashcards` belong to decks | Department derived through course |
| `timetable_entries` | Optional course ownership; 88/171 live rows resolve to a department through course | Remaining 83 rows need explicit treatment in Phase 2; no backfill performed |
| `tutorials` | Optional course and linked-quiz ownership; currently empty | Phase 2 should decide ownership for course-less tutorials |
| `assignment_guides`, `presentations`, `research_resources` | Explicit department ownership plus optional course ownership | Dual ownership is retained; normalization deferred |
| `academic_calendar_events`, `career_pathways`, `political_dictionary_entries` | Explicit department ownership, no course ownership | Correct for department-level extensions; course linkage deferred where needed |
| `staff`, `clinical_guides` | Explicit/nullable department ownership | MedHaven directory and clinical content remain protected |
| Progress tables | `quiz_attempts` and `flashcard_progress` are user-owned; `material_activity` links user and material; `user_question_history` links user, quiz, and question bank | Writes remain owner-authorized |

Live counts at audit time included 101 departments, 101 active workspaces, 77 courses, 1,092 materials, 150 quizzes, 897 question-bank rows, 1,324 quiz questions, 22 flashcard decks, 154 flashcards, 171 timetable entries, 3 assignment guides, 3 presentations, 3 research resources, 3 calendar events, 3 career pathways, and 2 political dictionary entries. No fabricated content was added by this PR.

## 5. Security boundary verification

Verified against the live database and repository migrations:

- `current_user_department_id()`, `is_super_admin()`, `complete_profile_onboarding(...)`, and `submit_quiz_attempt(...)` are **SECURITY INVOKER** in production.
- Those functions are executable by `authenticated` and `service_role`; `PUBLIC` and `anon` execution are not granted.
- Profiles are owner-readable and owner-writable through RLS, with `prevent_profile_privilege_changes()` protecting role, account status, admin permissions, and institutional fields.
- Department content policies resolve through `current_user_department_id()` or course → department relationships.
- Quiz submission derives the user, department eligibility, score, and attempt owner server-side.
- `question_bank` authenticated access is column-limited to omit answer keys, explanations, and scoring metadata. `quiz_questions` remains a separate quiz workflow where the existing UI needs answer data for local review; this is recorded as a future security/design consideration rather than changed in Phase 0.
- Flashcard progress, quiz attempts, material activity, and question history are owner-scoped by `auth.uid()`.
- Production hierarchy check returned zero departments missing faculty/university parents, zero faculties missing universities, and zero active workspace university mismatches.
- Supabase advisors still report the known plan-level leaked-password-protection warning. It must be enabled in Supabase Auth settings and is not an application defect or migration regression.
- Performance advisors report nine RLS init-plan warnings and unused indexes. These are not security regressions and were not changed in this baseline reconciliation.

## 6. Storage architecture

No storage migration or academic-file upload was performed.

- Current application paths still reference Supabase Storage buckets (`materials`, `presentations`, `research`, and `quiz-bank`) with authenticated, department-aware policies and signed URL/proxy routes.
- Backblaze B2 integration exists in `lib/b2.ts`, with admin migration tooling in `scripts/migrate-to-b2.ts` and related admin routes.
- Existing material and quiz-bank records may carry `storage_path` or external URLs.
- The Supabase Storage versus Backblaze B2 decision is explicitly deferred to the dedicated Storage phase; this PR does not copy, delete, or re-home files.

## 7. Render and build architecture

Live Render service verification:

- Service: `MedHaven` (`srv-d9oum77qj5pc738d73fg`)
- Repository: `https://github.com/Haven67890/MedHaven_New`
- Branch: `main`
- Auto-deploy: enabled on commit
- Build: `npm install; npm run build`
- Start: `npm run start`
- Runtime: Node; free plan; Virginia region
- Health check path: not configured; Render service status was `not_suspended` and latest deploy was `live`
- Latest live commit at audit: `febe0982db2850e5cc16bb9766ec4f537db4e46a`, matching repository `origin/main`

CI was using Node 18 while the package/runtime baseline is Node 22; this PR aligns CI to Node 22. Render’s service metadata does not expose a pinned Node version, so no Render setting is claimed or changed. No Render infrastructure change was made.

## 8. Migration state and confirmed drift

Repository migrations are timestamped SQL files through `20261002000006_phase5_security_hardening.sql`. Production migration history contains the corresponding security/workspace migrations plus repository-independent versions generated/applied by Supabase.

Confirmed production migration history includes an applied `20261002000001_fix_storage_policy_ambiguity` version that has no source file in the checked-out repository or Git history. It is not reconstructed here. The live policy state was inspected directly and remains represented by the later corrective migration and current policies. Historical migrations were not edited, and no new database migration is required for this Phase 0 baseline.

The old `db/README.md` and `supabase/README.md` wording claiming that the repository has no committed migrations was stale; this PR updates those notes to describe the actual migration directory and production-authoritative drift process.

## 9. Confirmed technical debt

- Several universal feature links intentionally terminate at the generic `/dashboard/[feature]` empty-state route until feature implementations are generalized.
- MedHaven legacy routes and POLITEIA routes have overlapping capability names and must be consolidated only through a later compatibility plan.
- `timetable_entries` contains legacy rows without a course-derived department.
- Some tables support dual department/course ownership while others derive department through course; Phase 2 must make the ownership contract explicit.
- Production has one migration version without a checked-in source file.
- Render has no explicit health-check path configured.
- The repository’s broad ESLint baseline contains pre-existing findings; typecheck/build remain the stronger baseline signals until lint debt is separately reduced.
- Playwright browser binaries are not installed in this sandbox, so browser E2E execution is environment-limited.

## 10. Deliberately deferred

- Phase 1 account/navigation feature implementation.
- Phase 2 Level → Semester → Course architecture and data migration.
- Destructive route migration or removal of working MedHaven/POLITEIA routes.
- Fabricated or bulk academic content.
- Storage migration or provider selection.
- Rework of mature MedHaven UI and workflows.
- Revisit of Phase 5 security objects absent a demonstrated regression.
- Supabase Auth leaked-password-protection setting, which requires the dashboard plan/configuration surface.

## Validation record

The PR validation record is maintained in the PR description and includes typecheck, lint, production build, existing tests, SQL/migration checks, security checks, and `git diff --check`. Any environment-limited result is reported as such; production deployment or migration application is not claimed for this branch.
