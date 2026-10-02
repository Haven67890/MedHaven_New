# JositeX Phase 2 — Academic Course Spine

## Scope

This phase establishes **Course as the canonical academic identity** without redesigning the Phase 3 feature pages, moving `/politeia/*`, changing storage providers, or deleting legacy records.

The production project audited for this work is `supabase-fuchsia-river` (`fexsfbdvewlmvzfnwqul`). The repository branch is `feat/jositex-phase2-academic-course-spine`.

## Final academic hierarchy

```text
University
  └── Faculty
       └── Department
            ├── Academic Level
            │    └── Course
            │         ├── Semester (nullable until authoritative data exists)
            │         └── Academic Session (nullable until authoritative data exists)
            └── Department-owned resources
```

Existing `universities`, `faculties`, and `departments` are reused. No duplicate institutional tables are introduced.

## Canonical course identity

The existing `courses` table remains canonical. Its stable identity is:

- `courses.id` — immutable primary key
- `department_id` — owning department
- `faculty_id` — compatibility and hierarchy context
- `code` — academic course code
- `title`/generated `name` — course title
- `level_id` — normalized department-scoped level
- `semester_id` — nullable normalized semester
- `academic_session_id` — nullable normalized academic session
- legacy `level` — retained for compatibility while consumers adopt `level_id`

The application resolver in `lib/course-domain.ts` returns a stable object containing `id`, `code`, `title`, `level`, `semester`, `department`, and `academic_session` information. It uses the caller's RLS-backed Supabase client; arbitrary client-supplied course IDs are not treated as authorization.

## Level representation

`academic_levels` is a normalized, department-scoped dimension with `(department_id, code)` uniqueness. Existing course enum values are authoritative for existing rows, so the migration backfills only the values already present in `courses` (`100L` through `600L`) and links each existing course through `level_id`.

The table is extensible for departmental and postgraduate structures. No new academic level is invented.

## Semester representation

`semesters` is a normalized, department-scoped dimension with `(department_id, code)` uniqueness. No semester rows are inserted because production courses do not contain authoritative semester placement. Existing `courses.semester_id` values remain null.

## Academic-session representation

`academic_sessions` is a university-scoped dimension. No session rows are inserted because no authoritative production session values were found. Existing `courses.academic_session_id` values remain null; historical content is not assigned to the current session.

## Course-code uniqueness decision

Production currently has a global unique `(code, level)` index. That boundary is too broad for a multi-department university. The migration replaces it with:

- `(department_id, code, level_id)` when the academic session is unresolved; and
- `(department_id, code, level_id, academic_session_id)` when the session is known.

The pre-migration audit found **0 duplicate department/code identities**, **0 null course codes**, and **0 null legacy levels**, so the safe indexes can be added without rewriting data. Different departments may therefore legitimately reuse a code.

## Course relationships

Production already has referential course relationships for:

- `materials.course_id`
- `question_bank.course_id`
- `quizzes.course_id`
- `flashcard_decks.course_id` → `flashcards.deck_id`
- `tutorials.course_id` and `tutorials.linked_quiz_id`
- `presentations.course_id`
- `timetable_entries.course_id`
- `assignment_guides.course_id`
- `research_resources.course_id`
- `quiz_image_bank.course_id`
- `course_blueprints.course_id`

The audit found **0 missing course links** for materials, question bank, quizzes, flashcard decks, tutorials, presentations, assignment guides, research resources, quiz image bank, and course blueprints. `timetable_entries` has **83 rows with null `course_id`**; those rows are preserved and documented as unresolved because their course cannot be safely inferred from current data.

`quiz_questions` and `flashcards` correctly resolve indirectly through their parent quiz/deck. User progress remains user-owned and resolves to courses through its parent resource.

## Migration strategy

`20261002000007_phase2_academic_course_spine.sql` is staged and non-destructive:

1. Create `academic_levels`, `semesters`, and `academic_sessions`.
2. Add nullable `courses.level_id`, `courses.semester_id`, and `courses.academic_session_id`.
3. Add restrictive foreign keys (`ON DELETE RESTRICT`).
4. Backfill only `academic_levels` and `courses.level_id` from existing course enum values.
5. Leave semester/session fields unresolved.
6. Replace the over-broad global course-code index with department-scoped indexes.
7. Add only hierarchy/course lookup indexes justified by the new query paths.
8. Enable RLS and expose read access only to authenticated, department-scoped callers.

No old migration is edited. No storage object is moved. No academic record is deleted.

## RLS and security model

The existing chain remains:

```text
auth.uid() → profiles → department → course → academic resource
```

The new dimension policies scope levels and semesters to the caller's department. Sessions are scoped to the caller's university unless the caller is a super admin. Existing course/resource policies remain in place, and all new course lookups use the RLS-backed client.

`getAuthorizedCourse()` rejects missing, inaccessible, or cross-department course IDs. Quiz generation, flashcard generation, and OSCE generation now validate the course before reading course context or performing service-role writes. Service-role access is not used as an authorization check.

The live audit confirmed `current_user_department_id()`, `is_super_admin()`, and `submit_quiz_attempt()` are `SECURITY INVOKER`. The only current Supabase security advisor warning is the known plan-level leaked-password-protection setting; it is not introduced by this phase.

## API and frontend contract

The shared resolver returns:

```text
course.id
course.code
course.title
course.level
course.semester
course.department
course.academicSession
```

`hooks/useCourses.ts` now requests normalized level, semester, and session relationships while retaining legacy fields for compatibility. Existing MedHaven routes and POLITEIA routes remain in place. `/politeia/*` is not migrated to `/dashboard/*`.

## Production inventory and unresolved data

At audit time:

- 1 university
- 19 faculties
- 101 departments (from the Phase 0 production audit)
- 77 courses
- 1,092 materials
- 897 question-bank rows
- 150 quizzes
- 1,324 quiz questions
- 22 flashcard decks
- 154 flashcards
- 171 timetable entries
- 3 assignment guides
- 3 presentations
- 0 tutorials

All 77 courses have department, faculty, level, and code. No authoritative semester or academic-session values were found. The 83 course-less timetable rows remain intact and require departmental mapping before any backfill. No course codes, levels, semesters, sessions, credit units, lecturers, or curricula were fabricated.

## Indexes

Existing course/resource indexes were inspected and retained. New indexes are limited to:

- department/status/sort order on levels and semesters;
- university/status/start date on sessions;
- department/level/semester on courses;
- academic session on courses; and
- department-scoped course identity uniqueness.

The known set of unused indexes was not removed.

## Backward compatibility and Phase 3 dependencies

MedHaven courses, medical content, JUTH workflows, OSCE/SBA/practical flows, materials, quizzes, flashcards, past questions, timetable, and progress are preserved. POLITEIA courses and `/politeia/*` routes remain intact. The Phase 3 work remains deferred: universal Study Library, Past Questions, quiz/flashcard/tutorial/presentation/timetable/progress redesigns, and route consolidation.

Authoritative departmental input is still required for semester placement, academic sessions, and the 83 unresolved timetable rows. Those inputs must be supplied before adding not-null constraints or backfilling those relationships.

## Validation record

The live read-only audit was executed before migration authoring. Repository validation and the focused course-domain test are run in the PR workflow; results are recorded in the PR description and must not be represented as passed unless the commands actually complete successfully.
