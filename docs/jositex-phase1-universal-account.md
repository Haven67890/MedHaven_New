# JositeX Phase 1 — Universal Account and Dashboard Experience

## Scope

This document records the Phase 1 account/workspace implementation on `feat/jositex-phase1-universal-account`. Phase 0 routing hardening remains the baseline; Phase 2 academic hierarchy and data migration work is intentionally untouched.

## Universal account architecture

The authenticated account surfaces remain shared routes:

- `/profile` — owner-scoped account details, profile image, name, nickname, and academic level.
- `/settings` — account details, email, password, notification preferences, appearance, reduced motion, and content visibility.
- `/profile/complete` — the existing onboarding workflow for incomplete profiles.

The same Profile and Settings implementations are used for every department workspace. Medical-only fields and workflows remain in the MedHaven application rather than being copied into the universal account model.

Institutional identity is display-only in the ordinary Profile UI. The client only submits personal fields and preferences; the existing `prevent_profile_privilege_changes()` trigger and owner RLS boundary continue to protect university, faculty, department, role, admin permissions, and account status.

## Navigation model

`UniversalWorkspaceShell` resolves its feature links from the authenticated user's server-resolved `app_features` rows. It does not invent links for unconfigured features. Dashboard, Profile, Settings, and Logout are universal shell capabilities; configured features retain their existing route or honest empty-state behavior.

The shell now displays the resolved department plus faculty/university context, supports nested active-route state, closes the mobile drawer after navigation, exposes accessible mobile menu state, and provides the same account actions on desktop and mobile.

MedHaven continues to use `ApplicationShell`, its mature navigation, and its department-specific routes. POLITEIA continues to use `/politeia/*` and `requirePoliteiaContext()`.

## Authentication and route protection

Middleware and server components continue to resolve:

> `auth.uid()` → owner profile → active department → faculty → university → active workspace

The client cannot select another department by changing a dashboard URL. `/profile` and `/settings` remain behind the existing authenticated route boundary. Logout uses the existing Supabase client session invalidation through `AuthProvider.logout()`, clears the in-memory user state, redirects to `/login`, and refreshes the route so stale account/dashboard UI is not retained.

## Supabase/backend changes

No schema, migration, policy, function, grant, or storage changes were required. Existing `profiles`, `user_preferences`, owner RLS, and Phase 5 profile protection are reused. No service-role credential is used in browser code, and no editable user metadata is used for authorization.

## Validation

Validated on the feature branch:

- `npm ci` — passed; npm reported existing dependency audit findings.
- `npm run typecheck` — passed.
- `npx eslint components/dashboard/universal-workspace-shell.tsx 'app/(app)/layout.tsx' 'app/(app)/profile/page.tsx' 'app/(app)/settings/page.tsx` — passed.
- `git diff --check` — passed.

The repository's full lint/build and existing tests remain part of the PR validation record. Browser E2E is environment-limited if Playwright browsers are unavailable. Render deployment is not claimed until a deployment is actually verified.

## Deferred Phase 2 work

This change does not introduce Level/Semester architecture, course hierarchy redesign, course-code normalization, mass migration, timetable ownership migration, bulk academic content, universal feature data migration, storage migration, or destructive MedHaven/POLITEIA route changes.
