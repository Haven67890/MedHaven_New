# Universal Department Dashboard & Workspace Architecture — Audit Note

## Current main audit

- **MedHaven dashboard:** `/dashboard` directly renders `JuthDashboard` (`medhaven_juth_hub.tsx`) inside the authenticated `(app)` layout. The existing `ApplicationShell` owns the MedHaven sidebar, account controls, and mobile navigation; legacy routes such as `/library`, `/materials`, `/quizzes`, `/flashcards`, `/timetable`, `/progress`, `/clinical-guides`, and `/osce` remain MedHaven-specific.
- **`/dashboard` behavior before this phase:** middleware treated `/dashboard` as a legacy MedHaven route, and the page unconditionally rendered `JuthDashboard`. This made the universal entry point implicitly MedHaven.
- **POLITEIA:** `/politeia/*` has its own server guard (`requirePoliteiaContext`), shell, pages, and department-scoped Supabase reads. Its navigation was generated from `app_features` when configured, but its shell and fallback list were POLITEIA-specific.
- **Ecosystem routing:** `profiles.department_id` resolved one active `ecosystem_apps` row. Middleware allowed POLITEIA only for its mapped department and all legacy app prefixes only for MedHaven. `app_features` supplied enabled POLITEIA navigation; MedHaven had no feature rows in the live database.
- **Live configuration audit:** 77 active departments were present, but only Medicine & Surgery → MedHaven and Political Science → POLITEIA had workspace rows. This phase migration provisions all other active departments without changing existing IDs or rows.

## Architecture decision

Use **`/dashboard` as the universal authenticated dashboard entry point**, with the department workspace selected server-side from `profiles.department_id` → `ecosystem_apps` → enabled `app_features`.

- MedHaven remains the reference implementation and continues to render its existing `JuthDashboard` and legacy `ApplicationShell` unchanged.
- Other workspaces use a reusable `UniversalWorkspaceShell` and shared `/dashboard/[feature]` route with honest empty states until department content exists.
- POLITEIA remains a first-class workspace with its existing `/politeia/*` routes and shell; its `/dashboard` entry is now universal rather than a special-case redirect.
- Feature navigation is read from Supabase. Core features are categorized separately from department-specific features, allowing another department to be configured without another dashboard implementation.

## Reuse vs. generalization

- **Reused:** institutional hierarchy, `profiles.department_id`, `ecosystem_apps`, `app_features`, Supabase RLS, existing MedHaven dashboard, existing POLITEIA content pages and guards, and existing deep-link routes.
- **Generalized:** dashboard entry resolution, app layout shell selection, feature metadata typing/category, workspace provisioning, feature navigation, and empty-state behavior.
- **MedHaven-specific by design:** JUTH Hub UI, clinical guides, OSCE/practical tools, medical AI prompts, legacy MedHaven routes, and medical branding.

## Security and known issue reconciliation

- Past-question student projection no longer selects `correct_answer`; server-side quiz submission retains answer access for scoring.
- POLITEIA flashcard review now persists to `flashcard_progress` through an authenticated route.
- The four SECURITY DEFINER functions retain pinned `search_path` and authenticated execution where required by onboarding, RLS, or server-side scoring. Anonymous/PUBLIC execution is revoked and the rationale is recorded in the migration.
- Leaked-password protection requires the supported Supabase dashboard setting; it is documented rather than claimed as migrated.
