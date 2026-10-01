# JositeX Authentication Audit and Closure

## Audit findings

- Supabase Auth is the application’s only authentication system. Browser and server clients use `@supabase/ssr`.
- The repository had registration and login forms, but no dedicated verification route. OTP logic was duplicated inside login and registration.
- The previous login flow treated an Auth error message as the only unverified-account signal and sent successful sessions directly to `/dashboard` without an authoritative `email_confirmed_at` check.
- Middleware bypassed all `/api/*` requests before checking the authenticated user, so API routes relied on inconsistent route-local checks.
- The callback accepted arbitrary `next` paths and constructed its origin from forwarded host headers.
- No Brevo, Resend, SMTP, Edge Function, or custom transactional-email integration exists in the repository. Verification and password-reset delivery are delegated to Supabase Auth.
- No verification table or custom `profiles.is_verified` source of truth exists, and none was added.

## Implemented

- Added `/verify-email` with exactly eight accessible code inputs, automatic focus movement, keyboard navigation, backspace behavior, paste distribution, numeric filtering, and complete-code submission protection.
- Added distinct handling for invalid, expired, already-used, and rate-limited verification attempts, plus email/link success and send failures.
- Added a persistent client presentation cooldown keyed by email. Successful resends reset it to exactly 60 seconds; refreshes cannot bypass the UI timer, and Supabase remains the backend abuse/rate-limit authority.
- Updated registration and login to route unverified users to `/verify-email` and preserve a validated intended destination.
- Added callback support for PKCE `code`, `token_hash`, and implicit-flow hash tokens, with safe error messages and no token logging.
- Added `safeNextPath` to prevent open redirects.
- Middleware now uses Supabase Auth user state and `email_confirmed_at`/`confirmed_at` to gate pages and non-public APIs. Unauthenticated API requests receive 401; authenticated but unverified requests receive 403.
- Added defense-in-depth verified-user enforcement to the POLITEIA quiz-attempt API.
- Preserved the existing password-reset callback route and did not introduce a competing provider.

## Live Supabase findings

- Project `supabase-fuchsia-river` (`fexsfbdvewlmvzfnwqul`) is healthy.
- `auth.users.email_confirmed_at` is the authoritative verification column.
- Live migrations contain the existing JositeX security/RLS migrations; no auth or verification migration was required.
- Live database inspection found no custom email-verification function or table.
- The repository cannot inspect Supabase Auth dashboard SMTP/template settings through the available database tools, and no Brevo credentials are present in the sandbox.

## External configuration to verify

In **Supabase Dashboard → Authentication → Providers → Email**:

1. Keep **Confirm email** enabled.
2. Set the email OTP/token length to **8** so the eight-box UI matches the generated token.
3. Confirm the password-recovery provider remains enabled.

In **Supabase Dashboard → Authentication → URL Configuration**:

- Site URL: the canonical production application URL (currently documented by the repository as `https://medhaven.onrender.com`).
- Redirect URLs: `https://medhaven.onrender.com/api/auth/callback` and `http://localhost:3000/api/auth/callback` for local testing, plus any approved preview URL used by deployment.

In **Supabase Dashboard → Authentication → SMTP Settings**, if Brevo is the intended provider:

- Configure the Brevo SMTP relay using a server-side Brevo SMTP credential, not a browser/API environment variable.
- Set the sender email/name to the verified Brevo sender identity used by JositeX.
- Verify the Brevo sender/domain and DNS authentication (SPF/DKIM) before relying on live delivery.

Live delivery was not fabricated: the code path and repository configuration were audited, but a real inbox delivery test was not possible without a configured test account and provider credentials.
