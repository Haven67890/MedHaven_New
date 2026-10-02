# Database notes

The project uses Supabase (`supabase-js`). Local development requires:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="public-anon-key"
```

The checked-in migration source lives in `supabase/migrations/`. Production migration history is authoritative when reconciling drift. The repository intentionally does not reconstruct historical migrations whose source is unavailable; inspect the live schema and add only new, idempotent, non-destructive migrations when a change is justified.

Do not drop or recreate existing tables, migrate academic files, or fabricate department/course data as part of routine work.
