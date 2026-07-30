# Database notes

The project uses Supabase (supabase-js). To run locally you must provide the following environment variables in your .env:

  NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY="public-anon-key"

Migrations: this repository currently does not include migration SQL files. If you have a live Supabase database and want migrations generated that match it, provide either:

- A SQL schema dump (pg_dump --schema-only) or
- A Supabase service_role key so I can introspect and generate SQL that matches the live schema.

I will not modify or drop existing tables — migrations will be additive and synchronized to the live schema.
