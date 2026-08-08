# MedHaven Production QA Audit Report

**Audited Site:** https://medhaven.onrender.com
**QA Auditor:** Jules (QA & Systems Engineer)
**Database Connection:** Supabase (Project ID: `fexsfbdvewlmvzfnwqul`)
**Test Account Used:** `audit_test_782609@medhaven-test.com` (Onboarded Profile: Student, level: 400L, department: Medicine & Surgery)
**Audit Date:** August 8, 2026

---

## Executive Summary of Technical Findings
1. **Critical Structural Schema Mismatches (Silent Failures)**:
   Every single authenticated page in the system triggers a background API call to Supabase Rest API:
   `GET /rest/v1/profiles?select=role,role_name,is_admin&id=eq.cf4a84b7-...`
   This query consistently returns a **400 Bad Request** error and prints a console error. The root cause is a database schema mismatch: **the columns `role_name` and `is_admin` do not exist** on the production `profiles` table. This query is executed universally inside `components/layout/application-shell.tsx`.
2. **Profile Page Database Error**:
   The `/profile` page triggers an additional query failure (`400 Bad Request`) for:
   `GET /rest/v1/profiles?select=full_name,email,current_level,department,faculty_id,university_id,avatar_url&id=eq.cf4a84b7-...`
   This fails because **the columns `email` and `avatar_url` do not exist** on the production `profiles` table.
3. **Settings Page Database Error**:
   The `/settings` page triggers an additional query failure (`400 Bad Request`) for:
   `GET /rest/v1/profiles?select=full_name,email&id=eq.cf4a84b7-...`
   This fails because **the column `email` does not exist** on the production `profiles` table.
4. **General UI/UX Integrity**:
   Aside from these silent database query errors, the UI handles data beautifully, displaying extremely polished dashboards, personalized student timetables, interactive course modules, and active recall study decks.
5. **Standard Next.js Prefetch Aborts**:
   Minor network log entries show `net::ERR_ABORTED` on page prefetch URLs (e.g. `_rsc` parameters). This is standard Next.js behavior where previous navigation prefetches are aborted when the user navigates elsewhere, and represents no issue.

---

## Detailed Page-by-Page Audit Findings

### 1. Dashboard (`/dashboard`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** The page loads beautifully. It displays dynamic statistics ("340 Points", "Clinical Training" academic level), custom announcement cards ("URGENT: Re-scheduled 400L Pharmacology Continuous Assessment"), and personalized course folders ("Medicine Block", "Surgery Block"). Interactive elements (e.g., search bar, collapsible announcements, Ask JUTH AI Tutor button) are fully functional.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshot:** `audit_screenshots/dashboard_main.png`

### 2. Smart Library (`/library`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** The page loads flawlessly. Displays mock medical textbooks ("Clinical Pharmacology", "Essential Pathology", "Surgical Recall") under "Featured titles" and "Browse collections". Interactive search input works—typing "Anatomy" updates state.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshot:** `audit_screenshots/smart_library_main.png`

### 3. Past Questions (`/past-questions`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** Renders lists of previous professional exams and class tests. Filter buttons ("Anatomy", "Physiology", "Pharmacology") and search inputs are clickable and update visually.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshot:** `audit_screenshots/past_questions_main.png`

### 4. Study Materials (`/materials`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** Displays folders containing lecture notes, medical slides, and summaries. Clicking tabs like "Medicine" or "Surgery" successfully shifts category views.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshot:** `audit_screenshots/study_materials_main.png`

### 5. Lecture Videos (`/lectures`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** Renders recorded lectures with duration indicators and simulated watch-progress bars (e.g., "Introduction to ECG", "Hernia Repair Techniques"). Clickable play icon overlay and card filters react as expected, but no functional video stream plays.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshot:** `audit_screenshots/lecture_videos_main.png`

### 6. Flashcards (`/flashcards`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** Displays study decks ("Cardiovascular Drugs", "Anatomy - Upper Limb") for active recall. Fully functional click events—clicking the "View" or "Study Deck" button successfully opens the active study panel overlays.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshots:**
    *   `audit_screenshots/flashcards_main.png`
    *   `audit_screenshots/flashcards_interactive.png` (Interaction overlay panel)

### 7. AI Quizzes (`/quizzes`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** Renders options for Adaptive Practice and custom quiz generations. Interactive sub-features are functional—clicking "Generate a quiz" or "New Quiz" triggers settings and quiz options overlays.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshots:**
    *   `audit_screenshots/ai_quizzes_main.png`
    *   `audit_screenshots/ai_quizzes_interactive.png` (Interactive options dialog)

### 8. Timetable (`/timetable`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** Renders weekly schedules indicating "Ward 11 - Male Medical Ward rounds" and "Morning Fellowship" slots. Interactive tab selectors allow switching between weekly schedules and rotation timetables.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshot:** `audit_screenshots/timetable_main.png`

### 9. Progress Tracker (`/progress`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** Renders simulated analytics charts and percentage meters representing study completion across modules. Elements are visual-only mocks (no direct DB tracking for progress in this view yet).
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshot:** `audit_screenshots/progress_tracker_main.png`

### 10. Marketplace (`/marketplace`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** Peer-to-peer campus shop. Displays listings of tools like "MDF Littmann Stethoscope" and "Lab Coats". Interactive flow works—clicking "View Detail" or "Buy" triggers the purchase/contact detail overlays.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshots:**
    *   `audit_screenshots/marketplace_main.png`
    *   `audit_screenshots/marketplace_interactive.png` (Listing modal)

### 11. Clinical Posting Guides (`/clinical-guides`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** Reference material page with checklists and templates for hospital rotations. Interactive checkboxes and expandable guide sections are responsive.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshot:** `audit_screenshots/clinical_posting_guides_main.png`

### 12. Tutorials (`/tutorials`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** Displays calendar timelines and list items for upcoming/past clinical tutorials and peer-group sessions. Clickable card links are active.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshot:** `audit_screenshots/tutorials_main.png`

### 13. Staff Directory (`/directory`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** Lists key university and teaching hospital lecturers. Filter selections (such as departments) are fully clickable and update UI styling.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshot:** `audit_screenshots/staff_directory_main.png`

### 14. Notifications (`/notifications`)
*   **Status:** Working with Mock Data / Minor Console Error
*   **Description:** Displays simulated pushes/updates categorized as "Today" and "Earlier". Interactive action items react visually when clicked.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
*   **Captured Screenshot:** `audit_screenshots/notifications_main.png`

### 15. Profile (`/profile`)
*   **Status:** Working with Mock Data / Critical Database Errors
*   **Description:** Displays profile details card. It successfully renders the container, but suffers from severe database loading errors.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `full_name,email,current_level,department,faculty_id,university_id,avatar_url` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=full_name%2Cemail%2Ccurrent_level%2Cdepartment%2Cfaculty_id%2Cuniversity_id%2Cavatar_url&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400; Root Cause: `email` and `avatar_url` columns do not exist in database)
*   **Captured Screenshot:** `audit_screenshots/profile_main.png`

### 16. Settings (`/settings`)
*   **Status:** Working with Mock Data / Critical Database Errors
*   **Description:** Settings form sections ("Account", "Security", "Notifications", "Appearance") load visually. However, attempting to load profile state into input fields triggers database fetch errors.
*   **Console Errors:**
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `role,role_name,is_admin` on `/rest/v1/profiles`)
    *   `Failed to load resource: the server responded with a status of 400 ()` (Querying `full_name,email` on `/rest/v1/profiles`)
*   **Network Request Failures:**
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=role%2Crole_name%2Cis_admin&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400)
    *   `https://fexsfbdvewlmvzfnwqul.supabase.co/rest/v1/profiles?select=full_name%2Cemail&id=eq.cf4a84b7-36af-47aa-bcb7-5c30dcb90fad` (Status: 400; Root Cause: `email` column does not exist in database)
*   **Captured Screenshot:** `audit_screenshots/settings_main.png`

---

## Authentication Flow, Logout, & Session Redirect Audit

*   **Logout Button Execution:** **SUCCESS / WORKING CORRECTLY**
    Clicking the "Logout" button in the header triggers `supabase.auth.signOut()` successfully. The cookies and browser authentication session are fully cleared, and the application immediately redirects the page to `/login`.
*   **State-Guard Route Redirection:** **SUCCESS / WORKING CORRECTLY**
    Directly visiting `/dashboard` after logging out successfully triggers the authentication middleware (`middleware.ts`). The request is intercepted, the session is verified as empty, and the page is immediately redirected back to `/login`.
*   **Captured Screenshot:** `audit_screenshots/logout_redirect.png` (Shows the Login screen after triggering a logout from `/dashboard`).

---

## Conclusion and Recommendations for Developers

1.  **Reconcile profiles Database Columns**:
    Modify the Supabase database migrations or `profiles` table to add the missing columns `role_name`, `is_admin`, `email`, and `avatar_url` or update the frontend files to query only the actual columns present (`id`, `full_name`, `nickname`, `role`, `current_level`, `university_id`, `points`, `created_at`, `updated_at`, `department`, `faculty_id`).
2.  **Clean up Application Shell queries**:
    Inside `components/layout/application-shell.tsx`, alter the select constraint from `.select("role, role_name, is_admin")` to query `.select("role")` or whatever represents the current DB columns. This will instantly resolve the universal `400 Bad Request` thrown on every single page navigation.
3.  **Adjust Profile and Settings Page Fields**:
    Avoid querying the missing `email` and `avatar_url` columns on `/profile` and `/settings`. Instead, retrieve the user's email directly from the client/server auth session metadata (`supabase.auth.getUser()`) which is secure and always up-to-date.
