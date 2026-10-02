# Supabase migrations

This folder contains the timestamped SQL migrations tracked for the JositeX / MedHaven Supabase project.

Production schema and migration history are authoritative for drift audits. Before adding a migration:

- inspect the current production schema and applied migration list;
- use a new timestamped file rather than editing historical migrations;
- make changes idempotent where practical;
- preserve existing data, RLS, grants, and production functionality;
- do not fabricate academic data or migrate storage in unrelated phases.

A production migration version may exist without a checked-in source file when it was applied from an unavailable historical branch. Record that drift rather than reconstructing unknown SQL.
