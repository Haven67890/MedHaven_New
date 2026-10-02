# JositeX UNIJOS Undergraduate Academic Structure

## Source policy

The canonical student-facing directory is based on current official University of Jos sources, prioritizing the **2026/2027 Post-UTME/DE screening notice** and then current faculty, department, undergraduate catalogue, and programme records. Institutional departments remain a compatibility layer and are not automatically admission destinations.

Primary admission source: <https://www.unijos.edu.ng/registration-procedures-and-cut-marks-unijos-20262027-post-utmede-screening-exercise>

## Preserved distinctions

- **Architecture:** the admission notice places Architecture under Environmental Sciences, while a separate current Architecture faculty page exists. The directory uses the admission-facing Environmental Sciences destination and preserves the conflict in `source_note`.
- **Clinical Sciences:** Medicine and Surgery is the current destination. Clinical specialties are not exposed as undergraduate destinations.
- **Health Sciences and Technology:** Medical Laboratory Science, Nursing Sciences, Bachelor of Radiography, and Doctor of Physiotherapy are destinations; teaching departments are not substituted for them.
- **Dental Sciences:** Dentistry remains a destination with `admission_status = no_admission` for the current cycle; it is not represented as “coming soon.”
- **Unresolved official fields:** where current official sources do not state duration, award, or numeric first/final level, the corresponding database field is nullable. No values are inferred from a generic four-year assumption.

## Data model

- `academic_colleges` provides the college layer where evidenced, currently College of Health Sciences.
- `undergraduate_programmes` is the canonical destination table with source URL, verification timestamp, award, duration, level range, admission status, and optional institutional department compatibility link.
- `departments.academic_scope` distinguishes student-facing destinations from institutional, specialist, teaching, postgraduate, and legacy units.
- `ecosystem_apps.workspace_type` preserves `medhaven` and `politeia` as specialized workspaces; all other active registrations resolve through the universal destination workspace.
- `profiles.undergraduate_programme_id` is nullable and is populated by the owner-authenticated onboarding RPC. Existing profile rows are not bulk-mutated because the production profile trigger protects owner-managed changes.

## Deployment audit

The non-destructive schema and onboarding RPC were applied through the authenticated Supabase migration tool. Live verification after deployment reported:

- 27 active canonical destination rows across 14 faculties
- 2 specialized app registrations (`medhaven`, `politeia`)
- 99 universal app registrations
- 101 existing institutional departments preserved

The checked-in migration contains the complete source-backed mapping and can be run through the repository migration pipeline to reconcile additional catalogue rows without changing existing app, course, department, or profile identities.

## Validation

- `npm run typecheck` passes.
- `npx tsx tests/academic-explorer.test.ts` passes, covering hierarchy grouping, faculty/programme search, workspace metadata, and specialist exclusion.
- `git diff --check` passes.
