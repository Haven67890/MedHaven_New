# JositeX Identity, Authentication, Onboarding & Global Branding

## Scope

This phase centralizes JositeX authentication decisions, preserves existing profile relationships, hardens onboarding routing, and replaces global authentication MedHaven branding with a reusable JositeX identity. Academic feature work was not changed.

## Authentication architecture

All post-authentication flows now resolve through `resolveAuthenticatedDestination()`:

`auth.uid()` → owner profile → complete institutional identity → active department workspace

- Missing or incomplete profile: `/profile/complete`.
- Complete profile with an active configured workspace: the workspace route from `ecosystem_apps` (`/medhaven`, `/politeia`, or another configured application).
- Complete profile without an active application mapping: `/dashboard`.
- Department/faculty/university relationships remain database-authoritative through the existing secure onboarding RPC.

The callback, password login, email verification continuation, profile completion, and middleware auth-route guards use the same resolver. Google login is no longer treated as a special first-time-only path.

## Existing-user preservation

- Removed the client-side profile upsert from `AuthProvider`.
- Existing profiles are read by authenticated user ID and are never duplicated or reset by login, Google OAuth, or password recovery.
- Existing department assignments remain authoritative.
- Production read-only checks found zero duplicate profile IDs, two incomplete profiles, and zero broken profile-to-department/faculty/university relationships.

## New-user onboarding

Registration now creates only the Supabase Auth identity and stores the display name as non-authoritative metadata. It does not write profile or institutional authorization fields from the browser.

After verification or Google authentication, a user without a complete profile is routed to `/profile/complete`. The page:

- Prefills valid existing institutional values where present.
- Loads universities, faculties, departments, and academic levels from the database.
- Filters departments by selected university and faculty.
- Submits through `complete_profile_onboarding()`.
- Routes to the resolved department workspace after successful completion.

## Redirect fix

The callback previously used `NEXT_PUBLIC_SITE_URL` whenever present and otherwise used the request origin, while the client flows independently constructed callback URLs from `window.location.origin`. A stale production `NEXT_PUBLIC_SITE_URL` or Supabase Auth URL configuration can therefore surface a localhost origin; there is no production localhost hostname hardcoded in the authentication routes.

The callback now uses one environment-aware origin strategy:

- An explicitly configured non-local `NEXT_PUBLIC_SITE_URL` is accepted.
- A localhost configured value cannot override a production request origin.
- Local development may continue to use the local request origin.
- All OAuth, email verification, and recovery callbacks use `/api/auth/callback`.

The Supabase Auth dashboard Site URL and redirect allow-list could not be read through the available MCP/database surface, so the external setting must still be confirmed in Supabase Dashboard. Render metadata confirms the authoritative deployed origin is `https://medhaven.onrender.com`.

## Password recovery and email verification

- Recovery links continue through `/api/auth/callback?next=/reset-password` and preserve the recovery session.
- Recovery routes do not create profiles or accounts.
- Email verification and OTP continuation now use the canonical profile/workspace resolver instead of returning users to `/`.
- Error messages remain generic for invalid, expired, used, and missing authentication links.

## Branding

- Added `JositeXLogo`, an accessible reusable vector-style component with light/dark-background support.
- Global auth layout now uses JositeX branding.
- Root metadata now identifies JositeX.
- Reset-password copy now refers to JositeX.
- MedHaven and POLITEIA department-specific workspace branding remains untouched.

## Verification

### Commands

- `npm ci` — passed; npm reported 12 existing dependency audit findings (10 high, 2 critical).
- `npm run typecheck` — passed.
- `NEXT_TELEMETRY_DISABLED=1 npm run build` — passed.
- Changed-file ESLint — passed with no errors; four existing hook-dependency warnings remain in `AuthProvider`/profile onboarding.
- `git diff --check` — passed.
- `npx tsx tests/course-domain.test.ts` — passed.
- `npx tsx tests/sba-style.test.ts` — passed.
- `npx tsx tests/osce.test.ts` — passed.

### Browser and mobile

No authenticated browser session or test credentials were available. Google OAuth, real email delivery, password recovery inbox delivery, and end-to-end authenticated workspace routing were **not claimed as exercised**. The production build generated all auth routes successfully. Narrow-width authenticated UI verification at 320px, 360px, and 390px remains an explicit limitation for this environment.

## Database/security verification

Read-only production checks against Supabase project `fexsfbdvewlmvzfnwqul`:

- Profile ID duplicates: 0.
- Incomplete profiles: 2; preserved and left for legitimate onboarding.
- Broken profile department/faculty/university links: 0.
- No production data was modified.
- Existing `complete_profile_onboarding()` and RLS architecture were reused.
- No service-role key was added to browser code.
- No raw user metadata is used for authorization.

## External configuration limitation

Supabase Auth Site URL, redirect allow-list, Google provider credentials, and email provider settings are dashboard-level configuration and were not exposed by the available MCP/database tools. The PR therefore documents the required production origin rather than claiming that dashboard settings were changed.
